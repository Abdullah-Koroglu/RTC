export interface RoomParticipant {
  participantId: string;
  connectionId: string;
  displayName?: string;
}

export class RoomManager {
  private readonly rooms = new Map<string, Map<string, RoomParticipant>>();

  join(roomId: string, participant: RoomParticipant): void {
    if (!this.rooms.has(roomId)) {
      this.rooms.set(roomId, new Map());
    }
    this.rooms.get(roomId)?.set(participant.connectionId, participant);
  }

  leave(roomId: string, connectionId: string): RoomParticipant | undefined {
    const room = this.rooms.get(roomId);
    if (!room) return undefined;

    const removed = room.get(connectionId);
    room.delete(connectionId);

    if (room.size === 0) this.rooms.delete(roomId);
    return removed;
  }

  leaveAll(connectionId: string): Array<{ roomId: string; participant: RoomParticipant }> {
    const left: Array<{ roomId: string; participant: RoomParticipant }> = [];

    for (const [roomId, room] of this.rooms.entries()) {
      const participant = room.get(connectionId);
      if (!participant) continue;

      room.delete(connectionId);
      left.push({ roomId, participant });

      if (room.size === 0) this.rooms.delete(roomId);
    }

    return left;
  }

  getParticipants(roomId: string): RoomParticipant[] {
    return Array.from(this.rooms.get(roomId)?.values() ?? []);
  }

  /** Returns { participantId: displayName } map for all peers currently in the room. */
  getPeerNames(roomId: string): Record<string, string> {
    const result: Record<string, string> = {};
    for (const p of this.getParticipants(roomId)) {
      if (p.displayName) result[p.participantId] = p.displayName;
    }
    return result;
  }

  has(roomId: string, connectionId: string): boolean {
    return this.rooms.get(roomId)?.has(connectionId) ?? false;
  }
}
