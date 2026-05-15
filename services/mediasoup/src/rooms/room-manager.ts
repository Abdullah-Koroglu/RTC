import { env } from '@/config/env';
import { logger } from '@/core/logger';
import { ConsumerManager } from '@/consumers/consumer-manager';
import { PeerManager } from '@/peers/peer-manager';
import { ProducerManager } from '@/producers/producer-manager';
import { RouterManager } from '@/routers/router-manager';
import { TransportManager } from '@/transports/transport-manager';
import { WorkerManager, type WorkerReplacedEvent } from '@/workers/worker-manager';
import type {
  ConsumerId,
  CreateConsumerInput,
  CreateProducerInput,
  CreateTransportInput,
  Producer,
  ProducerId,
  RoomId,
  RtpCapabilities,
  TransportConnectInput,
  TransportId,
} from '@/types/mediasoup';

interface RoomRecord {
  roomId: RoomId;
  createdAt: number;
}

export class RoomManager {
  private readonly rooms = new Map<RoomId, RoomRecord>();
  private readonly routers: RouterManager;
  private readonly peers = new PeerManager();
  private readonly transports = new TransportManager();
  private readonly producers = new ProducerManager();
  private readonly consumers = new ConsumerManager();

  constructor(private readonly workerManager: WorkerManager) {
    this.routers = new RouterManager(workerManager);

    this.workerManager.on('worker-replaced', (event: WorkerReplacedEvent) => {
      void this.recoverRoomsForWorker(event);
    });
  }

  async joinRoom(roomId: RoomId, peerId: string): Promise<{ routerRtpCapabilities: RtpCapabilities }> {
    const { router } = await this.routers.getOrCreate(roomId);

    // A reconnect with the same peerId must replace the previous peer to avoid stale producers/transports.
    if (this.peers.get(roomId, peerId)) {
      this.peers.remove(roomId, peerId);
      logger.info({ roomId, peerId }, 'peer_replaced_on_rejoin');
    }

    this.peers.getOrCreate(roomId, peerId);

    if (!this.rooms.has(roomId)) {
      this.rooms.set(roomId, {
        roomId,
        createdAt: Date.now(),
      });
      logger.info({ roomId }, 'room_created');
    }

    return {
      routerRtpCapabilities: router.rtpCapabilities,
    };
  }

  async createTransport(input: CreateTransportInput): Promise<{
    transportId: TransportId;
    iceParameters: unknown;
    iceCandidates: unknown;
    dtlsParameters: unknown;
  }> {
    const roomRouter = this.routers.get(input.roomId);
    if (!roomRouter) {
      throw new Error('Room router not found');
    }

    const peer = this.peers.getOrCreate(input.roomId, input.peerId);
    const transport = await this.transports.createWebRtcTransport(
      roomRouter.router,
      peer,
      { peerId: input.peerId, roomId: input.roomId, ...input.appData },
      () => this.disconnectPeer(input.roomId, input.peerId),
    );

    return {
      transportId: transport.id,
      iceParameters: transport.iceParameters,
      iceCandidates: transport.iceCandidates,
      dtlsParameters: transport.dtlsParameters,
    };
  }

  async connectTransport(roomId: RoomId, peerId: string, transportId: TransportId, input: TransportConnectInput): Promise<void> {
    const peer = this.peers.get(roomId, peerId);
    if (!peer) {
      throw new Error('Peer not found');
    }

    const transport = peer.transports.get(transportId);
    if (!transport) {
      throw new Error('Transport not found');
    }

    await this.transports.connectTransport(transport, input);
  }

  async createProducer(input: CreateProducerInput): Promise<{ producerId: ProducerId }> {
    const peer = this.peers.get(input.roomId, input.peerId);
    if (!peer) {
      throw new Error('Peer not found');
    }

    const producer = await this.producers.createProducer(peer, input);

    logger.info({ roomId: input.roomId, peerId: input.peerId, producerId: producer.id, kind: producer.kind }, 'producer_created');

    return { producerId: producer.id };
  }

  async createConsumer(input: CreateConsumerInput & { rtpCapabilities: RtpCapabilities }): Promise<{
    consumerId: ConsumerId;
    producerId: ProducerId;
    kind: string;
    rtpParameters: unknown;
  }> {
    const roomRouter = this.routers.get(input.roomId);
    if (!roomRouter) {
      throw new Error('Room not found');
    }

    const peer = this.peers.get(input.roomId, input.peerId);
    if (!peer) {
      throw new Error('Peer not found');
    }

    const producer = this.findProducer(input.roomId, input.producerId);
    if (!producer) {
      throw new Error('Producer not found');
    }

    const consumer = await this.consumers.createConsumer(roomRouter.router, peer, producer, input.rtpCapabilities, input);

    logger.info({ roomId: input.roomId, peerId: input.peerId, consumerId: consumer.id, producerId: producer.id, kind: consumer.kind }, 'consumer_created');

    return {
      consumerId: consumer.id,
      producerId: producer.id,
      kind: consumer.kind,
      rtpParameters: consumer.rtpParameters,
    };
  }

  listRemoteProducers(roomId: RoomId, peerId: string): Array<{ producerId: ProducerId; peerId: string; kind: 'audio' | 'video' }> {
    const producers: Array<{ producerId: ProducerId; peerId: string; kind: 'audio' | 'video' }> = [];

    for (const peer of this.peers.listRoomPeers(roomId)) {
      if (peer.id === peerId) {
        continue;
      }

      for (const producer of peer.producers.values()) {
        const kind = producer.kind === 'audio' ? 'audio' : 'video';
        producers.push({
          producerId: producer.id,
          peerId: peer.id,
          kind,
        });
      }
    }

    return producers;
  }

  listRoomProducers(roomId: RoomId): Array<{ producerId: ProducerId; peerId: string; kind: 'audio' | 'video'; appData: Record<string, unknown> }> {
    const producers: Array<{ producerId: ProducerId; peerId: string; kind: 'audio' | 'video'; appData: Record<string, unknown> }> = [];

    for (const peer of this.peers.listRoomPeers(roomId)) {
      for (const producer of peer.producers.values()) {
        const kind = producer.kind === 'audio' ? 'audio' : 'video';
        producers.push({
          producerId: producer.id,
          peerId: peer.id,
          kind,
          appData: (producer.appData as Record<string, unknown>) ?? {},
        });
      }
    }

    return producers;
  }

  disconnectPeer(roomId: RoomId, peerId: string): void {
    const removed = this.peers.remove(roomId, peerId);
    if (!removed) {
      return;
    }

    logger.info({ roomId, peerId }, 'peer_disconnected');

    if (this.peers.listRoomPeers(roomId).length === 0) {
      this.closeRoom(roomId);
    }

    // Notify signaling server so it can immediately broadcast participant-left
    if (env.SIGNALING_INTERNAL_URL) {
      void fetch(`${env.SIGNALING_INTERNAL_URL}/internal/peer-gone`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ roomId, peerId }),
      }).catch((err: unknown) => {
        logger.warn({ roomId, peerId, err }, 'signaling_peer_gone_notify_failed');
      });
    }
  }

  closeRoom(roomId: RoomId): void {
    this.peers.removeRoom(roomId);
    this.routers.closeRoom(roomId);
    this.rooms.delete(roomId);
    logger.info({ roomId }, 'room_closed');
  }

  close(): void {
    for (const roomId of this.rooms.keys()) {
      this.closeRoom(roomId);
    }

    this.routers.closeAll();
  }

  getStats(): { roomCount: number; peerCount: number; producerCount: number; consumerCount: number } {
    let producerCount = 0;
    let consumerCount = 0;

    for (const room of this.rooms.keys()) {
      for (const peer of this.peers.listRoomPeers(room)) {
        producerCount += peer.producers.size;
        consumerCount += peer.consumers.size;
      }
    }

    return {
      roomCount: this.rooms.size,
      peerCount: this.peers.getCounts().peerCount,
      producerCount,
      consumerCount,
    };
  }

  private async recoverRoomsForWorker(event: WorkerReplacedEvent): Promise<void> {
    const affectedRooms: string[] = [];

    for (const roomId of this.rooms.keys()) {
      const workerId = this.workerManager.getAssignedWorkerId(roomId);
      if (workerId === event.oldWorkerId) {
        affectedRooms.push(roomId);
      }
    }

    if (affectedRooms.length === 0) {
      return;
    }

    logger.warn({ oldWorkerId: event.oldWorkerId, roomCount: affectedRooms.length }, 'worker_recovery_started');

    for (const roomId of affectedRooms) {
      try {
        const worker = this.workerManager.assignWorkerForRoom(roomId);
        await this.routers.migrateRoomToWorker(roomId, worker, event.newWorkerId);

        for (const peer of this.peers.listRoomPeers(roomId)) {
          peer.close();
        }
      } catch (error) {
        logger.error({ err: error, roomId }, 'room_recovery_failed');
      }
    }
  }

  private findProducer(roomId: RoomId, producerId: ProducerId): Producer | undefined {
    for (const peer of this.peers.listRoomPeers(roomId)) {
      const producer = peer.producers.get(producerId);
      if (producer) {
        return producer;
      }
    }

    return undefined;
  }
}
