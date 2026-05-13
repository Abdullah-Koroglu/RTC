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
    const participants = this.rooms.getParticipants(roomId);

    for (const participant of participants) {
      const conn = this.connections.getById(participant.connectionId);
      if (!conn || conn.socket.readyState !== conn.socket.OPEN) {
        continue;
      }
      conn.socket.send(JSON.stringify(event));
    }
  }

  async publishRoomEvent(
    roomId: string,
    event: Extract<OutboundEvent, { type: 'room.participant-joined' | 'room.participant-left' | 'signal.relay' }>,
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

    this.broadcastToRoom(envelope.roomId, envelope.event);
  }
}
