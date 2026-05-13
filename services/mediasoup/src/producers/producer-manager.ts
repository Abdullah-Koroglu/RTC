import type { Peer } from '@/peers/peer';
import type { CreateProducerInput, Producer, WebRtcTransport } from '@/types/mediasoup';

export class ProducerManager {
  async createProducer(peer: Peer, input: CreateProducerInput): Promise<Producer> {
    const transport = peer.transports.get(input.transportId) as WebRtcTransport | undefined;

    if (!transport || transport.closed) {
      throw new Error('Producer transport not found');
    }

    const producer = await transport.produce({
      kind: input.kind,
      rtpParameters: input.rtpParameters,
      appData: {
        roomId: input.roomId,
        peerId: input.peerId,
        ...input.appData,
      },
    });

    peer.producers.set(producer.id, producer);

    producer.on('transportclose', () => {
      peer.producers.delete(producer.id);
    });

    producer.on('close', () => {
      peer.producers.delete(producer.id);
    });

    return producer;
  }

  closePeerProducers(peer: Peer): void {
    for (const producer of peer.producers.values()) {
      if (!producer.closed) {
        producer.close();
      }
    }
    peer.producers.clear();
  }
}
