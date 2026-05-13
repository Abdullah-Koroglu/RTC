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
}

interface RemoteProducerListResponse {
  producers: RemoteProducer[];
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

  constructor(private readonly options: MediasoupClientOptions) {}

  /**
   * Initialize the device and load RTP capabilities from the server
   */
  async initialize(): Promise<void> {
    this.mediasooupClient = await getMediasoupClient();
    const Device = this.mediasooupClient.Device;
    
    this.device = new Device();

    const joinResponse = await this.apiCall('POST', `/rooms/${this.options.roomId}/peers/${this.options.peerId}/join`, {});
    
    await this.device.load({
      routerRtpCapabilities: joinResponse.routerRtpCapabilities,
    });
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
   * Publish local media (camera and/or microphone)
   */
  async publishMedia(constraints: MediaStreamConstraints = { audio: true, video: true }): Promise<MediaStream> {
    if (!this.sendTransport || !this.device) {
      throw new Error('Transports not initialized');
    }

    const stream = await this.createLocalMediaStream(constraints);
    this.localStream = { stream };

    // Produce audio
    if (stream.getAudioTracks().length > 0) {
      const audioTrack = stream.getAudioTracks()[0];
      if (this.localStream && audioTrack) this.localStream.audio = audioTrack;

      const audioProducer = await this.sendTransport.produce({
        track: audioTrack,
        appData: { mediaTag: 'audio' },
      });

      this.producers.set(audioProducer.id, audioProducer);
    }

    // Produce video
    if (stream.getVideoTracks().length > 0) {
      const videoTrack = stream.getVideoTracks()[0];
      if (this.localStream && videoTrack) this.localStream.video = videoTrack;

      const videoProducer = await this.sendTransport.produce({
        track: videoTrack,
        appData: { mediaTag: 'video' },
      });

      this.producers.set(videoProducer.id, videoProducer);
    }

    return stream;
  }

  async listRemoteProducers(): Promise<RemoteProducer[]> {
    const response = (await this.apiCall(
      'GET',
      `/rooms/${this.options.roomId}/peers/${this.options.peerId}/producers`,
      {},
    )) as RemoteProducerListResponse;

    return response.producers;
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

  /**
   * Subscribe to remote media from a producer
   */
  async subscribeMedia(producerId: string, peerId: string): Promise<MediaStream> {
    if (!this.device || !this.recvTransport) {
      throw new Error('Device or recv transport not initialized');
    }

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

    this.consumers.set(consumer.id, consumer);

    const stream = new MediaStream();
    stream.addTrack(consumer.track);

    return stream;
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
      throw new Error(`Mediasoup API error: ${response.status} - ${text}`);
    }

    if (response.status === 204) {
      return {};
    }

    return response.json();
  }
}

