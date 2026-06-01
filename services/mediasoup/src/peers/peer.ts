import type { Consumer, Producer, TransportId, WebRtcTransport } from '@/types/mediasoup';

export class Peer {
  readonly transports = new Map<TransportId, WebRtcTransport>();
  readonly producers = new Map<string, Producer>();
  readonly consumers = new Map<string, Consumer>();

  constructor(
    public readonly id: string,
    public readonly sessionId?: string,
  ) {}

  close(): void {
    for (const consumer of this.consumers.values()) {
      if (!consumer.closed) {
        consumer.close();
      }
    }

    for (const producer of this.producers.values()) {
      if (!producer.closed) {
        producer.close();
      }
    }

    for (const transport of this.transports.values()) {
      if (!transport.closed) {
        transport.close();
      }
    }

    this.consumers.clear();
    this.producers.clear();
    this.transports.clear();
  }
}
