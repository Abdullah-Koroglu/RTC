import { TypedEventEmitter } from '../events/event-emitter';
import type { SignalingMessage, WebRtcSdkEventMap } from '../events/types';
import type { SignalingTransport } from '../transports/types';

export class SignalingBridge {
  private readonly emitter = new TypedEventEmitter<WebRtcSdkEventMap>();
  private readonly unsubs: (() => void)[] = [];

  constructor(private readonly transport: SignalingTransport) {}

  on = this.emitter.on.bind(this.emitter);

  async connect(): Promise<void> {
    this.unsubs.push(this.transport.onMessage((message: SignalingMessage) => {
      this.emitter.emit('signaling.message', { message });
    }));

    this.unsubs.push(this.transport.onOpen(() => {
      this.emitter.emit('signaling.connected', {});
    }));

    this.unsubs.push(this.transport.onClose((reason?: string) => {
      const disconnectPayload: { reason?: string } = {};
      if (reason && typeof reason === 'string') {
        disconnectPayload.reason = reason;
      }
      this.emitter.emit('signaling.disconnected', disconnectPayload);
    }));

    await this.transport.connect();
  }

  async send(message: SignalingMessage): Promise<void> {
    await this.transport.send(message);
  }

  async disconnect(reason?: string): Promise<void> {
    await this.transport.disconnect(reason);
  }

  dispose(): void {
    for (const unsub of this.unsubs) {
      unsub();
    }
    this.unsubs.length = 0;
    this.emitter.clear();
  }
}

