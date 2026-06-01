import { AppState, Platform, type AppStateStatus } from 'react-native';
import { getEnv } from './env';
import type { MediaStream as RNMediaStream } from 'react-native-webrtc';
import type { RoomParticipantState } from '@repo/rtc-sdk/signaling-client';

let mediaDevices: any;
let registerGlobals: () => void = () => undefined;

// Only import native modules on actual devices — web uses browser WebRTC natively
if (Platform.OS !== 'web') {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const rnWebrtc = require('react-native-webrtc') as typeof import('react-native-webrtc');
  mediaDevices = rnWebrtc.mediaDevices;
  registerGlobals = rnWebrtc.registerGlobals;
} else {
  mediaDevices = navigator.mediaDevices;
}

// Must run before mediasoup-client's Device is instantiated
registerGlobals();

// Use require so it runs after registerGlobals (avoids ES module hoisting)
// eslint-disable-next-line @typescript-eslint/no-require-imports
const mediasoupClient = require('mediasoup-client') as typeof import('mediasoup-client');

export interface MediasoupRNClientOptions {
  baseUrl: string;
  apiBaseUrl: string;
  roomId: string;
  peerId: string;
}

interface TurnCredentials {
  urls: string[];
  username: string;
  credential: string;
  ttlSeconds: number;
}

export interface RemoteProducer {
  producerId: string;
  peerId: string;
  kind: 'audio' | 'video';
  appData?: Record<string, unknown>;
}

export type ParticipantState = RoomParticipantState;

export class MediasoupRNClient {
  private device: any = null;
  private sendTransport: any = null;
  private recvTransport: any = null;
  private producers = new Map<string, any>();
  private consumers = new Map<string, any>();
  private localStream: RNMediaStream | null = null;
  private screenProducer: any = null;
  private turnCredentials: TurnCredentials | null = null;
  private appStateSubscription: ReturnType<typeof AppState.addEventListener> | null = null;

  constructor(private readonly options: MediasoupRNClientOptions) {}

  async initialize(): Promise<void> {
    this.device = new mediasoupClient.Device();

    const joinResponse = await this.apiCall(
      'POST',
      `/rooms/${this.options.roomId}/peers/${this.options.peerId}/join`,
      {},
    );

    await this.device.load({ routerRtpCapabilities: joinResponse.routerRtpCapabilities });

    // Cleanup on app background/close
    this.appStateSubscription = AppState.addEventListener('change', (state: AppStateStatus) => {
      if (state === 'background' || state === 'inactive') {
        void this.notifyLeave();
      }
    });
  }

  async createTransports(): Promise<void> {
    if (!this.device) throw new Error('Device not initialized');

    const turnCreds = await this.fetchTurnCredentials();
    const iceServers = turnCreds.urls.map((url) => ({
      urls: url,
      username: turnCreds.username,
      credential: turnCreds.credential,
    }));

    // Send transport
    const sendResp = await this.apiCall(
      'POST',
      `/rooms/${this.options.roomId}/peers/${this.options.peerId}/transports`,
      { appData: { type: 'send' } },
    );

    this.sendTransport = this.device.createSendTransport({
      id: sendResp.transportId,
      iceParameters: sendResp.iceParameters,
      iceCandidates: sendResp.iceCandidates,
      dtlsParameters: sendResp.dtlsParameters,
      sctpParameters: sendResp.sctpParameters,
      iceServers,
      iceTransportPolicy: 'all',
    });

    this.sendTransport.on('connect', async ({ dtlsParameters }: any, callback: any, errback: any) => {
      try {
        await this.apiCall(
          'POST',
          `/rooms/${this.options.roomId}/peers/${this.options.peerId}/transports/${sendResp.transportId}/connect`,
          { dtlsParameters },
        );
        callback();
      } catch (e) {
        errback(e instanceof Error ? e : new Error('Connect failed'));
      }
    });

    this.sendTransport.on('produce', async ({ kind, rtpParameters, appData }: any, callback: any, errback: any) => {
      try {
        const { producerId } = await this.apiCall(
          'POST',
          `/rooms/${this.options.roomId}/peers/${this.options.peerId}/producers`,
          { transportId: sendResp.transportId, kind, rtpParameters, appData },
        );
        callback({ id: producerId });
      } catch (e) {
        errback(e instanceof Error ? e : new Error('Produce failed'));
      }
    });

    // Recv transport
    const recvResp = await this.apiCall(
      'POST',
      `/rooms/${this.options.roomId}/peers/${this.options.peerId}/transports`,
      { appData: { type: 'recv' } },
    );

    this.recvTransport = this.device.createRecvTransport({
      id: recvResp.transportId,
      iceParameters: recvResp.iceParameters,
      iceCandidates: recvResp.iceCandidates,
      dtlsParameters: recvResp.dtlsParameters,
      sctpParameters: recvResp.sctpParameters,
      iceServers,
      iceTransportPolicy: 'all',
    });

    this.recvTransport.on('connect', async ({ dtlsParameters }: any, callback: any, errback: any) => {
      try {
        await this.apiCall(
          'POST',
          `/rooms/${this.options.roomId}/peers/${this.options.peerId}/transports/${recvResp.transportId}/connect`,
          { dtlsParameters },
        );
        callback();
      } catch (e) {
        errback(e instanceof Error ? e : new Error('Connect failed'));
      }
    });
  }

  async publishMedia(constraints: Record<string, unknown> = { audio: true, video: true }): Promise<RNMediaStream> {
    if (!this.sendTransport) throw new Error('Transports not initialized');

    const stream = (await mediaDevices.getUserMedia(constraints as any)) as unknown as RNMediaStream;
    this.localStream = stream;

    for (const track of stream.getAudioTracks()) {
      try {
        const producer = await this.sendTransport.produce({ track, appData: { mediaTag: 'audio' } });
        this.producers.set(producer.id, producer);
      } catch (e) {
        console.error('[MediasoupRN] audio produce failed', e);
        throw e;
      }
    }

    for (const track of stream.getVideoTracks()) {
      try {
        const producer = await this.sendTransport.produce({ track, appData: { mediaTag: 'video' } });
        this.producers.set(producer.id, producer);
      } catch (e) {
        console.error('[MediasoupRN] video produce failed', e);
        throw e;
      }
    }

    return stream;
  }

  async listRemoteProducers(): Promise<RemoteProducer[]> {
    const res = await this.apiCall('GET', `/rooms/${this.options.roomId}/producers`, {}) as { producers: RemoteProducer[] };
    return res.producers;
  }

  unpublishMedia(kind: 'audio' | 'video'): void {
    for (const [id, producer] of this.producers.entries()) {
      if (producer.kind === kind) {
        producer.close();
        this.producers.delete(id);
        break;
      }
    }
  }

  get isScreenSharing(): boolean {
    return this.screenProducer !== null && !this.screenProducer.closed;
  }

  // Screen share is not supported on iOS natively without a Broadcast Extension.
  // Returns null to let the caller handle the unsupported case gracefully.
  async startScreenShare(): Promise<RNMediaStream | null> {
    return null;
  }

  stopScreenShare(): void {
    if (this.screenProducer) {
      this.screenProducer.close();
      this.screenProducer = null;
    }
  }

  async subscribeMedia(producerId: string, peerId: string): Promise<RNMediaStream> {
    if (!this.device || !this.recvTransport) throw new Error('Transports not initialized');

    const rtpCapabilities = this.device.rtpCapabilities;
    const consumerResp = await this.apiCall(
      'POST',
      `/rooms/${this.options.roomId}/peers/${this.options.peerId}/consumers`,
      { producerId, rtpCapabilities, appData: { producerId, peerId } },
    );

    const consumer = await this.recvTransport.consume({
      id: consumerResp.consumerId,
      producerId: consumerResp.producerId,
      kind: consumerResp.kind,
      rtpParameters: consumerResp.rtpParameters,
    });

    await consumer.resume();
    this.consumers.set(consumer.id, consumer);

    const stream = new (global as any).MediaStream();
    stream.addTrack(consumer.track);
    return stream as RNMediaStream;
  }

  unsubscribeMedia(consumerId: string): void {
    const consumer = this.consumers.get(consumerId);
    if (consumer) {
      consumer.close();
      this.consumers.delete(consumerId);
    }
  }

  setAudioEnabled(enabled: boolean): void {
    if (this.localStream) {
      for (const track of this.localStream.getAudioTracks()) {
        track.enabled = enabled;
      }
    }
  }

  setVideoEnabled(enabled: boolean): void {
    if (this.localStream) {
      for (const track of this.localStream.getVideoTracks()) {
        track.enabled = enabled;
      }
    }
  }

  async close(): Promise<void> {
    this.appStateSubscription?.remove();
    this.appStateSubscription = null;

    if (this.screenProducer) {
      this.screenProducer.close();
      this.screenProducer = null;
    }

    for (const producer of this.producers.values()) producer.close();
    this.producers.clear();

    for (const consumer of this.consumers.values()) consumer.close();
    this.consumers.clear();

    this.sendTransport?.close();
    this.sendTransport = null;
    this.recvTransport?.close();
    this.recvTransport = null;

    if (this.localStream) {
      this.localStream.getTracks().forEach((t) => t.stop());
      this.localStream = null;
    }

    await this.notifyLeave();
  }

  private async notifyLeave(): Promise<void> {
    try {
      await this.apiCall('DELETE', `/rooms/${this.options.roomId}/peers/${this.options.peerId}`, {});
    } catch {
      // best-effort
    }
  }

  private async fetchTurnCredentials(): Promise<TurnCredentials> {
    if (this.turnCredentials) return this.turnCredentials;
    const { apiBaseUrl, peerId } = this.options;
    const url = `${apiBaseUrl}/v1/turn/credentials?peerId=${peerId}`;
    const res = await fetch(url);
    if (!res.ok) throw new Error(`TURN credentials failed: ${res.status}`);
    this.turnCredentials = (await res.json()) as TurnCredentials;
    return this.turnCredentials;
  }

  private async apiCall(method: string, endpoint: string, body: unknown): Promise<any> {
    const url = `${this.options.baseUrl}${endpoint}`;
    const opts: RequestInit = {
      method,
      headers: { 'Content-Type': 'application/json' },
    };
    if (method !== 'GET' && method !== 'DELETE') {
      opts.body = JSON.stringify(body);
    }

    const res = await fetch(url, opts);
    if (!res.ok) {
      const text = await res.text();
      throw new Error(`Mediasoup API error: ${res.status} - ${text}`);
    }
    if (res.status === 204) return {};
    return res.json();
  }
}

// Re-export for convenience
export type { RNMediaStream as MediaStream };

export function getMobileEnvConfig() {
  const env = getEnv();
  return {
    baseUrl: env.MEDIASOUP_URL,
    apiBaseUrl: env.API_URL,
  };
}
