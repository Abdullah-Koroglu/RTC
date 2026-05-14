import type { Peer } from '@/peers/peer';
import type { Consumer, CreateConsumerInput, Producer, Router, RtpCapabilities, WebRtcTransport } from '@/types/mediasoup';

export class ConsumerManager {
  async createConsumer(
    router: Router,
    consumingPeer: Peer,
    producer: Producer,
    rtpCapabilities: RtpCapabilities,
    input: CreateConsumerInput,
  ): Promise<Consumer> {
    if (!router.canConsume({ producerId: producer.id, rtpCapabilities })) {
      throw new Error('Peer cannot consume this producer');
    }

    const transport = this.findConsumerTransport(consumingPeer);
    if (!transport) {
      throw new Error('Consumer transport not found');
    }

    const consumer = await transport.consume({
      producerId: producer.id,
      rtpCapabilities,
      paused: true,
      appData: {
        roomId: input.roomId,
        peerId: input.peerId,
        producerPeerId: producer.appData.peerId,
        ...input.appData,
      },
    });

    consumingPeer.consumers.set(consumer.id, consumer);

    consumer.on('transportclose', () => {
      consumingPeer.consumers.delete(consumer.id);
    });

    consumer.on('producerclose', () => {
      if (!consumer.closed) {
        consumer.close();
      }
      consumingPeer.consumers.delete(consumer.id);
    });

    await consumer.resume();

    if (consumer.kind === 'video' && typeof consumer.requestKeyFrame === 'function') {
      await consumer.requestKeyFrame();
    }

    return consumer;
  }

  async resume(consumer: Consumer): Promise<void> {
    await consumer.resume();
  }

  closePeerConsumers(peer: Peer): void {
    for (const consumer of peer.consumers.values()) {
      if (!consumer.closed) {
        consumer.close();
      }
    }
    peer.consumers.clear();
  }

  private findConsumerTransport(peer: Peer): WebRtcTransport | undefined {
    for (const transport of peer.transports.values()) {
      if ((transport.appData as Record<string, unknown>).type === 'recv') {
        return transport;
      }
    }
    return undefined;
  }
}
