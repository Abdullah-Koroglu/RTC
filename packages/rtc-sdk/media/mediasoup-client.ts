// mediasoup-client types
// Note: mediasoup-client has limited TypeScript support, using 'any' for compatibility
type Device = any;
type Producer = any;
type Consumer = any;
type Transport = any;
type RtpCapabilities = any;

declare const window: any;

// Dynamic import to support both browser and Node.js
async function getMediasoupClient(): Promise<any> {
  if (typeof window !== 'undefined' && window.mediasoupClient) {
    return window.mediasoupClient;
  }
  return import('mediasoup-client');
}

export interface MediasoupClientOptions {
  baseUrl: string;
  apiBaseUrl: string;
  roomId: string;
  peerId: string;
}

export interface LocalStream {
  audio?: MediaStreamTrack;
  video?: MediaStreamTrack;
  stream: MediaStream;
}

export interface RemoteProducer {
  producerId: string;
  peerId: string;
  kind: 'audio' | 'video';
  appData?: Record<string, unknown>;
}

interface RemoteProducerListResponse {
  producers: RemoteProducer[];
}

interface TurnCredentialsResponse {
  urls: string[];
  username: string;
  credential: string;
  ttlSeconds: number;
}

export interface RemoteConsumer {
  consumerId: string;
  producerId: string;
  peerId: string;
  kind: 'audio' | 'video';
  rtpParameters: unknown;
}

export class MediasoupClient {
  private device: Device | null = null;
  private sendTransport: Transport | null = null;
  private recvTransport: Transport | null = null;
  private producers = new Map<string, Producer>();
  private consumers = new Map<string, Consumer>();
  private localStream: LocalStream | null = null;
  private mediasooupClient: any = null;
  private screenProducer: Producer | null = null;
  private unloadHandlerRegistered = false;
  private turnCredentials: TurnCredentialsResponse | null = null;

  private readonly unloadHandler = (): void => {
    const url = `${this.options.baseUrl}/rooms/${this.options.roomId}/peers/${this.options.peerId}`;
    void fetch(url, {
      method: 'DELETE',
      headers: {
        'Content-Type': 'application/json',
      },
      keepalive: true,
    }).catch(() => {
      // Best-effort cleanup on browser unload.
    });
  };

  constructor(private readonly options: MediasoupClientOptions) {}

  /**
   * Initialize the device and load RTP capabilities from the server
   */
  async initialize(): Promise<void> {
    try {
      this.mediasooupClient = await getMediasoupClient();
      const Device = this.mediasooupClient.Device;

      this.device = new Device();

      const joinResponse = await this.apiCall('POST', `/rooms/${this.options.roomId}/peers/${this.options.peerId}/join`, {});

      await this.device.load({
        routerRtpCapabilities: joinResponse.routerRtpCapabilities,
      });

      if (typeof window !== 'undefined' && !this.unloadHandlerRegistered) {
        window.addEventListener('beforeunload', this.unloadHandler);
        window.addEventListener('pagehide', this.unloadHandler);
        this.unloadHandlerRegistered = true;
      }
    } catch (error) {
      console.error('Mediasoup initialize failed', {
        roomId: this.options.roomId,
        peerId: this.options.peerId,
        error,
      });
      throw error;
    }
  }

  /**
   * Get RTC capabilities from the device
   */
  getRtpCapabilities(): RtpCapabilities | null {
    return this.device?.rtpCapabilities || null;
  }

  /**
   * Create send and recv transports
   */
  async createTransports(): Promise<void> {
    if (!this.device) {
      throw new Error('Device not initialized');
    }

    const turnCredentials = await this.fetchTurnCredentials();
    const iceServers = turnCredentials.urls.map((url) => ({
      urls: url,
      username: turnCredentials.username,
      credential: turnCredentials.credential,
    }));

    // Create send transport
    const sendTransportResponse = await this.apiCall(
      'POST',
      `/rooms/${this.options.roomId}/peers/${this.options.peerId}/transports`,
      { appData: { type: 'send' } }
    );

    this.sendTransport = this.device.createSendTransport({
      id: sendTransportResponse.transportId,
      iceParameters: sendTransportResponse.iceParameters,
      iceCandidates: sendTransportResponse.iceCandidates,
      dtlsParameters: sendTransportResponse.dtlsParameters,
      sctpParameters: sendTransportResponse.sctpParameters,
      iceServers,
      iceTransportPolicy: 'all',
    });

    this.sendTransport.on('connect', async ({ dtlsParameters }: any, callback: any, errback: any) => {
      try {
        await this.apiCall(
          'POST',
          `/rooms/${this.options.roomId}/peers/${this.options.peerId}/transports/${sendTransportResponse.transportId}/connect`,
          { dtlsParameters }
        );
        callback();
      } catch (error) {
        errback(error instanceof Error ? error : new Error('Connect failed'));
      }
    });

    this.sendTransport.on('produce', async ({ kind, rtpParameters, appData }: any, callback: any, errback: any) => {
      try {
        const { producerId } = await this.apiCall(
          'POST',
          `/rooms/${this.options.roomId}/peers/${this.options.peerId}/producers`,
          { transportId: sendTransportResponse.transportId, kind, rtpParameters, appData }
        );
        callback({ id: producerId });
      } catch (error) {
        errback(error instanceof Error ? error : new Error('Produce failed'));
      }
    });

    // Create recv transport
    const recvTransportResponse = await this.apiCall(
      'POST',
      `/rooms/${this.options.roomId}/peers/${this.options.peerId}/transports`,
      { appData: { type: 'recv' } }
    );

    this.recvTransport = this.device.createRecvTransport({
      id: recvTransportResponse.transportId,
      iceParameters: recvTransportResponse.iceParameters,
      iceCandidates: recvTransportResponse.iceCandidates,
      dtlsParameters: recvTransportResponse.dtlsParameters,
      sctpParameters: recvTransportResponse.sctpParameters,
      iceServers,
      iceTransportPolicy: 'all',
    });

    this.recvTransport.on('connect', async ({ dtlsParameters }: any, callback: any, errback: any) => {
      try {
        await this.apiCall(
          'POST',
          `/rooms/${this.options.roomId}/peers/${this.options.peerId}/transports/${recvTransportResponse.transportId}/connect`,
          { dtlsParameters }
        );
        callback();
      } catch (error) {
        errback(error instanceof Error ? error : new Error('Connect failed'));
      }
    });
  }

  /**
   * Publish local media (camera and/or microphone).
   * Accepts either MediaStreamConstraints or an already-acquired MediaStream
   * (the latter avoids a second getUserMedia call on mobile, preventing repeated permission prompts).
   */
  async publishMedia(source: MediaStreamConstraints | MediaStream = { audio: true, video: true }): Promise<MediaStream> {
    if (!this.sendTransport || !this.device) {
      throw new Error('Transports not initialized');
    }

    let stream: MediaStream;
    if (source instanceof MediaStream) {
      stream = source;
    } else {
      try {
        stream = await this.createLocalMediaStream(source);
      } catch (error) {
        console.error('Failed to create local media stream', {
          roomId: this.options.roomId,
          peerId: this.options.peerId,
          constraints: source,
          error,
        });
        throw error;
      }
    }

    this.localStream = { stream };

    // Produce audio
    if (stream.getAudioTracks().length > 0) {
      const audioTrack = stream.getAudioTracks()[0];
      if (this.localStream && audioTrack) this.localStream.audio = audioTrack;

      let audioProducer: Producer;
      try {
        audioProducer = await this.sendTransport.produce({
          track: audioTrack,
          codecOptions: {
            opusStereo: false,       // Mono: daha az bant, ses gecikmesini azaltır
            opusDtx: true,           // Sessizlikte bant tasarrufu
            opusFec: true,           // Paket kaybında ses kalitesini korur
            opusMaxPlaybackRate: 48000,
            opusPtime: 20,           // 20ms paket süresi
          },
          appData: { mediaTag: 'audio' },
        });
      } catch (error) {
        console.error('Failed to produce audio track', {
          roomId: this.options.roomId,
          peerId: this.options.peerId,
          error,
        });
        throw error;
      }

      this.producers.set(audioProducer.id, audioProducer);
    }

    // Produce video
    if (stream.getVideoTracks().length > 0) {
      const videoTrack = stream.getVideoTracks()[0];
      if (this.localStream && videoTrack) this.localStream.video = videoTrack;

      let videoProducer: Producer;
      try {
        videoProducer = await this.sendTransport.produce({
          track: videoTrack,
          encodings: [
            {
              maxBitrate: 3_000_000,
              // 50kbps'in altında çözünürlük de düşmeye başlar (480→360→240p)
              // Bu değer üzerinde ise 720p korunur, sadece FPS düşer
              priority: 'high',
              networkPriority: 'high',
              // FPS önce feda edilir; 5fps sınırına gelince çözünürlük de düşmeye başlar
              degradationPreference: 'maintain-resolution',
            },
          ],
          codecOptions: {
            videoGoogleStartBitrate: 2000,
            videoGoogleMaxBitrate: 5000,
            videoGoogleMinBitrate: 200,
          },
          appData: { mediaTag: 'video' },
        });
      } catch (error) {
        console.error('Failed to produce video track', {
          roomId: this.options.roomId,
          peerId: this.options.peerId,
          error,
        });
        throw error;
      }

      this.producers.set(videoProducer.id, videoProducer);
    }

    return stream;
  }

  async listRemoteProducers(): Promise<RemoteProducer[]> {
    try {
      const response = (await this.apiCall(
        'GET',
        `/rooms/${this.options.roomId}/producers`,
        {},
      )) as RemoteProducerListResponse;

      return response.producers;
    } catch (error) {
      console.error('Failed to list remote producers', {
        roomId: this.options.roomId,
        peerId: this.options.peerId,
        error,
      });
      throw error;
    }
  }

  /**
   * Stop publishing a producer
   */
  unpublishMedia(kind: 'audio' | 'video'): void {
    for (const [producerId, producer] of this.producers.entries()) {
      if (producer.kind === kind) {
        producer.close();
        this.producers.delete(producerId);
        break;
      }
    }
  }

  get isScreenSharing(): boolean {
    return this.screenProducer !== null && !this.screenProducer.closed;
  }

  async startScreenShare(): Promise<MediaStream> {
    if (!this.sendTransport) {
      throw new Error('Send transport not initialized');
    }

    const stream = await (navigator.mediaDevices as any).getDisplayMedia({ video: true, audio: false }) as MediaStream;
    const videoTrack = stream.getVideoTracks()[0];
    if (!videoTrack) {
      throw new Error('No video track in screen capture stream');
    }

    try {
      const producer = await this.sendTransport.produce({
        track: videoTrack,
        appData: { mediaTag: 'screen' },
      });
      this.screenProducer = producer;

      videoTrack.addEventListener('ended', () => {
        this.stopScreenShare();
      });

      return stream;
    } catch (error) {
      stream.getTracks().forEach((t) => t.stop());
      throw error;
    }
  }

  stopScreenShare(): void {
    if (this.screenProducer) {
      this.screenProducer.close();
      this.screenProducer = null;
    }
  }

  /**
   * Subscribe to remote media from a producer
   */
  async subscribeMedia(producerId: string, peerId: string): Promise<MediaStream> {
    if (!this.device || !this.recvTransport) {
      throw new Error('Device or recv transport not initialized');
    }

    console.info('[MediasoupClient] subscribeMedia called', { producerId, remotePeerId: peerId, roomId: this.options.roomId, localPeerId: this.options.peerId });

    try {
      const rtpCapabilities = this.device.rtpCapabilities;

      const consumerResponse = await this.apiCall(
        'POST',
        `/rooms/${this.options.roomId}/peers/${this.options.peerId}/consumers`,
        { producerId, rtpCapabilities, appData: { producerId, peerId } }
      );

      const consumer = await this.recvTransport.consume({
        id: consumerResponse.consumerId,
        producerId: consumerResponse.producerId,
        kind: consumerResponse.kind,
        rtpParameters: consumerResponse.rtpParameters,
      });

      await consumer.resume();

      this.consumers.set(consumer.id, consumer);

      const stream = new MediaStream();
      stream.addTrack(consumer.track);

      console.info('[subscribe] stream tracks:', stream.getTracks().map(t => t.kind + ':' + t.readyState));

      return stream;
    } catch (error) {
      console.error('Failed to subscribe remote producer', {
        roomId: this.options.roomId,
        localPeerId: this.options.peerId,
        remotePeerId: peerId,
        producerId,
        error,
      });
      throw error;
    }
  }

  /**
   * Stop consuming a remote media stream
   */
  unsubscribeMedia(consumerId: string): void {
    const consumer = this.consumers.get(consumerId);
    if (consumer) {
      consumer.close();
      this.consumers.delete(consumerId);
    }
  }

  /**
   * Mute/unmute audio
   */
  setAudioEnabled(enabled: boolean): void {
    if (this.localStream?.audio) {
      this.localStream.audio.enabled = enabled;
    }
  }

  /**
   * Enable/disable video
   */
  setVideoEnabled(enabled: boolean): void {
    if (this.localStream?.video) {
      this.localStream.video.enabled = enabled;
    }
  }

  /**
   * Get all active producers
   */
  getProducers(): Map<string, Producer> {
    return this.producers;
  }

  /**
   * Get all active consumers
   */
  getConsumers(): Map<string, Consumer> {
    return this.consumers;
  }

  /**
   * Close all transports and cleanup
   */
  async close(): Promise<void> {
    // Close screen share producer
    if (this.screenProducer) {
      this.screenProducer.close();
      this.screenProducer = null;
    }

    // Close all producers
    for (const producer of this.producers.values()) {
      producer.close();
    }
    this.producers.clear();

    // Close all consumers
    for (const consumer of this.consumers.values()) {
      consumer.close();
    }
    this.consumers.clear();

    // Close transports
    if (this.sendTransport) {
      this.sendTransport.close();
      this.sendTransport = null;
    }

    if (this.recvTransport) {
      this.recvTransport.close();
      this.recvTransport = null;
    }

    // Stop local media tracks
    if (this.localStream) {
      this.localStream.stream.getTracks().forEach((track) => track.stop());
      this.localStream = null;
    }

    // Notify server of disconnection
    try {
      await this.apiCall('DELETE', `/rooms/${this.options.roomId}/peers/${this.options.peerId}`, {});
    } catch {
      // Ignore errors on disconnect
    }

    if (typeof window !== 'undefined' && this.unloadHandlerRegistered) {
      window.removeEventListener('beforeunload', this.unloadHandler);
      window.removeEventListener('pagehide', this.unloadHandler);
      this.unloadHandlerRegistered = false;
    }
  }

  private async createLocalMediaStream(constraints: MediaStreamConstraints): Promise<MediaStream> {
    const mediaDevices = globalThis.navigator?.mediaDevices;
    if (mediaDevices?.getUserMedia) {
      return mediaDevices.getUserMedia(constraints);
    }

    if (!constraints.video) {
      throw new Error('getUserMedia is unavailable in this context');
    }

    if (typeof document === 'undefined') {
      throw new Error('Cannot create fallback video stream outside browser context');
    }

    const canvas = document.createElement('canvas');
    canvas.width = 640;
    canvas.height = 360;

    const context = canvas.getContext('2d');
    if (!context) {
      throw new Error('Canvas context is unavailable for fallback stream');
    }

    let frame = 0;
    const drawFrame = () => {
      const hue = (frame * 3) % 360;
      context.fillStyle = `hsl(${hue}, 70%, 45%)`;
      context.fillRect(0, 0, canvas.width, canvas.height);
      context.fillStyle = '#ffffff';
      context.font = 'bold 24px sans-serif';
      context.fillText(`RTC Fallback - ${this.options.peerId}`, 24, 48);
      context.font = '18px sans-serif';
      context.fillText(new Date().toISOString(), 24, 84);
      frame += 1;
    };

    drawFrame();
    const timerId = setInterval(drawFrame, 100);
    const stream = canvas.captureStream(10);

    for (const track of stream.getVideoTracks()) {
      track.addEventListener('ended', () => {
        clearInterval(timerId);
      });
    }

    return stream;
  }

  private async fetchTurnCredentials(): Promise<TurnCredentialsResponse> {
    if (this.turnCredentials) {
      return this.turnCredentials;
    }

    const url = new URL('/v1/turn/credentials', this.options.apiBaseUrl);
    url.searchParams.set('peerId', this.options.peerId);

    const response = await fetch(url.toString());
    if (!response.ok) {
      throw new Error(`TURN credentials request failed: ${response.status}`);
    }

    const credentials = (await response.json()) as TurnCredentialsResponse;
    this.turnCredentials = credentials;
    return credentials;
  }

  /**
   * Helper method for API calls
   */
  private async apiCall(method: string, endpoint: string, body: unknown): Promise<any> {
    const url = `${this.options.baseUrl}${endpoint}`;
    const options: RequestInit = {
      method,
      headers: {
        'Content-Type': 'application/json',
      },
    };

    if (method !== 'GET' && method !== 'DELETE') {
      options.body = JSON.stringify(body);
    }

    const response = await fetch(url, options);

    if (!response.ok) {
      const text = await response.text();
      console.error('Mediasoup API call failed', {
        method,
        endpoint,
        status: response.status,
        body,
        response: text,
      });
      throw new Error(`Mediasoup API error: ${response.status} - ${text}`);
    }

    if (response.status === 204) {
      return {};
    }

    return response.json();
  }
}

