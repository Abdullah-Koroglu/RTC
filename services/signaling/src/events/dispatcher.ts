import { randomUUID } from 'node:crypto';
import type { ConnectionManager } from '@/websocket/connection-manager';
import type { RoomManager } from '@/rooms/room-manager';
import type { RedisPubSub } from '@/redis/pubsub';
import type { OutboundEvent } from '@/types/events';
import type { DistributedRoomEvent } from '@/redis/events/contracts';

export class EventDispatcher {
  constructor(
    private readonly nodeId: string,
    private readonly connections: ConnectionManager,
    private readonly rooms: RoomManager,
    private readonly pubsub: RedisPubSub,
  ) {}

  broadcastToRoom(roomId: string, event: OutboundEvent): void {
    for (const connectionId of this.rooms.getConnectionIds(roomId)) {
      const conn = this.connections.getById(connectionId);
      if (!conn || conn.socket.readyState !== conn.socket.OPEN) {
        continue;
      }
      conn.socket.send(JSON.stringify(event));
    }
  }

  async publishRoomEvent(
    roomId: string,
    event: Extract<OutboundEvent, { type: 'room.participant-joined' | 'room.participant-left' | 'room.participant-state-updated' | 'signal.relay' | 'producer.new' | 'producer.closed' | 'room.locked' | 'room.host-transferred' | 'room.ended' }>,
  ): Promise<void> {
    const envelope: DistributedRoomEvent = {
      eventId: randomUUID(),
      emittedAt: new Date().toISOString(),
      roomId,
      sourceNodeId: this.nodeId,
      event,
    };

    await this.pubsub.publish(envelope);
    this.broadcastToRoom(roomId, event);
  }

  handleDistributedEvent(envelope: DistributedRoomEvent): void {
    if (envelope.sourceNodeId === this.nodeId) {
      return;
    }

    const connectionIds = this.rooms.getConnectionIds(envelope.roomId);
    this.broadcastToRoom(envelope.roomId, envelope.event);

    if (envelope.event.type === 'room.ended') {
      for (const connectionId of connectionIds) {
        const conn = this.connections.getById(connectionId);
        conn?.rooms.delete(envelope.roomId);
      }
      void this.rooms.closeRoom(envelope.roomId);
    }
  }
}
