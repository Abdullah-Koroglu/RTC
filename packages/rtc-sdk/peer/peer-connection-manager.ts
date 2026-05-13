import { TypedEventEmitter } from '@/events/event-emitter';
import type {
  RtcSdkOptions,
  SdpAnswerMessage,
  SdpOfferMessage,
  IceCandidateMessage,
  WebRtcSdkEventMap,
} from '@/events/types';
import type { SignalingBridge } from '@/signaling/signaling-bridge';

export class PeerConnectionManager {
  private peerConnection: RTCPeerConnection | null = null;
  private reconnectAttempts = 0;
  private reconnectTimer: number | null = null;
  private readonly localTracks = new Map<string, RTCRtpSender>();
  private readonly emitter = new TypedEventEmitter<WebRtcSdkEventMap>();

  constructor(
    private readonly options: RtcSdkOptions,
    private readonly signaling: SignalingBridge,
  ) {
    this.bindSignaling();
    this.createPeerConnection();
  }

  on = this.emitter.on.bind(this.emitter);

  get connection(): RTCPeerConnection {
    if (!this.peerConnection) {
      throw new Error('PeerConnection has been disposed');
    }
    return this.peerConnection;
  }

  async setLocalStream(stream: MediaStream): Promise<void> {
    for (const track of stream.getTracks()) {
      if (this.localTracks.has(track.id)) {
        continue;
      }

      const sender = this.connection.addTrack(track, stream);
      this.localTracks.set(track.id, sender);
    }
  }

  async createOffer(): Promise<RTCSessionDescriptionInit> {
    const offer = await this.connection.createOffer({
      offerToReceiveAudio: true,
      offerToReceiveVideo: false,
    });

    await this.connection.setLocalDescription(offer);
    this.emitter.emit('peer.local-description', { description: offer });

    const message: SdpOfferMessage = {
      type: 'sdp_offer',
      peerId: this.options.peerId,
      roomId: this.options.roomId,
      ts: Date.now(),
      sdp: offer,
    };

    await this.signaling.send(message);
    return offer;
  }

  async handleRemoteDescription(description: RTCSessionDescriptionInit): Promise<void> {
    await this.connection.setRemoteDescription(description);
    this.emitter.emit('peer.remote-description', { description });

    if (description.type === 'offer') {
      const answer = await this.connection.createAnswer();
      await this.connection.setLocalDescription(answer);
      this.emitter.emit('peer.local-description', { description: answer });

      const message: SdpAnswerMessage = {
        type: 'sdp_answer',
        peerId: this.options.peerId,
        roomId: this.options.roomId,
        ts: Date.now(),
        sdp: answer,
      };

      await this.signaling.send(message);
    }
  }

  async addIceCandidate(candidate: RTCIceCandidateInit): Promise<void> {
    await this.connection.addIceCandidate(candidate);
  }

  async reconnect(): Promise<void> {
    this.cleanupConnectionOnly();
    this.createPeerConnection();

    for (const [trackId, sender] of this.localTracks.entries()) {
      const track = sender.track;
      if (!track) {
        this.localTracks.delete(trackId);
        continue;
      }

      this.connection.addTrack(track);
    }

    await this.createOffer();
  }

  dispose(): void {
    this.clearReconnectTimer();
    this.cleanupConnectionOnly();
    this.localTracks.clear();
    this.emitter.clear();
  }

  private bindSignaling(): void {
    this.signaling.on('signaling.message', async ({ message }) => {
      if (message.peerId === this.options.peerId || message.roomId !== this.options.roomId) {
        return;
      }

      if (message.type === 'sdp_offer' || message.type === 'sdp_answer') {
        await this.handleRemoteDescription(message.sdp);
        return;
      }

      if (message.type === 'ice_candidate') {
        await this.addIceCandidate(message.candidate);
      }
    });

    this.signaling.on('signaling.disconnected', () => {
      this.scheduleReconnect();
    });

    this.signaling.on('signaling.connected', () => {
      this.reconnectAttempts = 0;
      this.emitter.emit('reconnect.succeeded', { attempt: 0 });
    });
  }

  private createPeerConnection(): void {
    this.peerConnection = new RTCPeerConnection(this.options.rtcConfig);

    this.peerConnection.onconnectionstatechange = () => {
      this.emitter.emit('peer.connection-state', { state: this.connection.connectionState });

      if (this.connection.connectionState === 'failed' || this.connection.connectionState === 'disconnected') {
        this.scheduleReconnect();
      }
    };

    this.peerConnection.oniceconnectionstatechange = () => {
      this.emitter.emit('peer.ice-connection-state', { state: this.connection.iceConnectionState });
    };

    this.peerConnection.onicegatheringstatechange = () => {
      this.emitter.emit('peer.ice-gathering-state', { state: this.connection.iceGatheringState });
    };

    this.peerConnection.onsignalingstatechange = () => {
      this.emitter.emit('peer.signaling-state', { state: this.connection.signalingState });
    };

    this.peerConnection.onicecandidate = async (event) => {
      if (!event.candidate) {
        return;
      }

      const candidate = event.candidate.toJSON();
      this.emitter.emit('peer.ice-candidate', { candidate });

      const message: IceCandidateMessage = {
        type: 'ice_candidate',
        peerId: this.options.peerId,
        roomId: this.options.roomId,
        ts: Date.now(),
        candidate,
      };

      await this.signaling.send(message);
    };

    this.peerConnection.ontrack = (event) => {
      const [stream] = event.streams;
      if (!stream) {
        return;
      }

      this.emitter.emit('peer.remote-track', {
        stream,
        track: event.track,
      });
    };

    this.peerConnection.onnegotiationneeded = () => {
      this.emitter.emit('peer.negotiation-needed', {});
    };
  }

  private scheduleReconnect(): void {
    this.clearReconnectTimer();

    const maxAttempts = this.options.reconnect?.maxAttempts ?? 6;
    if (this.reconnectAttempts >= maxAttempts) {
      this.emitter.emit('reconnect.failed', {
        attempt: this.reconnectAttempts,
        error: new Error('Max reconnect attempts reached'),
      });
      return;
    }

    const baseDelay = this.options.reconnect?.baseDelayMs ?? 500;
    const maxDelay = this.options.reconnect?.maxDelayMs ?? 10_000;
    const nextAttempt = this.reconnectAttempts + 1;
    const delayMs = Math.min(maxDelay, baseDelay * 2 ** (nextAttempt - 1));

    this.emitter.emit('reconnect.scheduled', { delayMs, attempt: nextAttempt });

    this.reconnectTimer = window.setTimeout(async () => {
      this.reconnectAttempts = nextAttempt;
      try {
        await this.reconnect();
        this.emitter.emit('reconnect.succeeded', { attempt: nextAttempt });
      } catch (cause) {
        const error = cause instanceof Error ? cause : new Error('Reconnect failed');
        this.emitter.emit('reconnect.failed', { attempt: nextAttempt, error });
        this.scheduleReconnect();
      }
    }, delayMs);
  }

  private clearReconnectTimer(): void {
    if (this.reconnectTimer === null) {
      return;
    }

    window.clearTimeout(this.reconnectTimer);
    this.reconnectTimer = null;
  }

  private cleanupConnectionOnly(): void {
    if (!this.peerConnection) {
      return;
    }

    this.peerConnection.onconnectionstatechange = null;
    this.peerConnection.oniceconnectionstatechange = null;
    this.peerConnection.onicegatheringstatechange = null;
    this.peerConnection.onsignalingstatechange = null;
    this.peerConnection.onicecandidate = null;
    this.peerConnection.ontrack = null;
    this.peerConnection.onnegotiationneeded = null;

    for (const sender of this.peerConnection.getSenders()) {
      try {
        this.peerConnection.removeTrack(sender);
      } catch {
        // no-op
      }
    }

    this.peerConnection.close();
    this.peerConnection = null;
  }
}
