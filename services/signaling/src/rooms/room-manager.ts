import type Redis from 'ioredis';
import { env } from '@/config/env';

export interface ParticipantState {
  participantId: string;
  connectionId: string;
  displayName: string;
  cameraEnabled: boolean;
  micEnabled: boolean;
  joinedAt: string;
}

export class RoomManager {
  private readonly redis: Redis | null;
  private readonly ttlSeconds: number;

  // connectionId → Map<roomId, participantId> — for has() and TTL refresh
  private readonly connectionRooms = new Map<string, Map<string, string>>();
  // roomId → Set<connectionId> — for synchronous broadcast routing
  private readonly roomConnections = new Map<string, Set<string>>();
  // In-memory fallback when REDIS_ENABLED=false
  private readonly localRooms = new Map<string, Map<string, ParticipantState>>();

  constructor(redis: Redis | null = null, ttlSeconds?: number) {
    this.redis = redis;
    this.ttlSeconds = ttlSeconds ?? Math.ceil((env.HEARTBEAT_INTERVAL_MS + env.HEARTBEAT_TIMEOUT_MS) * 3 / 1000);
  }

  private participantKey(roomId: string, participantId: string): string {
    return `room:${roomId}:p:${participantId}`;
  }

  private idsKey(roomId: string): string {
    return `room:${roomId}:participant-ids`;
  }

  async join(roomId: string, params: { participantId: string; connectionId: string; displayName?: string; micEnabled?: boolean; cameraEnabled?: boolean }): Promise<void> {
    const { participantId, connectionId, displayName, micEnabled, cameraEnabled } = params;

    if (!this.connectionRooms.has(connectionId)) {
      this.connectionRooms.set(connectionId, new Map());
    }
    this.connectionRooms.get(connectionId)!.set(roomId, participantId);

    if (!this.roomConnections.has(roomId)) {
      this.roomConnections.set(roomId, new Set());
    }
    this.roomConnections.get(roomId)!.add(connectionId);

    if (this.redis) {
      const key = this.participantKey(roomId, participantId);
      const raw = await this.redis.get(key);

      if (raw) {
        // Reconnecting: preserve existing state, update connectionId and optionally displayName
        const existing = JSON.parse(raw) as ParticipantState;
        const updated: ParticipantState = { ...existing, connectionId, ...(displayName ? { displayName } : {}) };
        await this.redis.set(key, JSON.stringify(updated), 'EX', this.ttlSeconds);
      } else {
        const state: ParticipantState = {
          participantId,
          connectionId,
          displayName: displayName ?? '',
          cameraEnabled: cameraEnabled ?? false,
          micEnabled: micEnabled ?? false,
          joinedAt: new Date().toISOString(),
        };
        await this.redis.set(key, JSON.stringify(state), 'EX', this.ttlSeconds);
        await this.redis.sadd(this.idsKey(roomId), participantId);
      }
    } else {
      if (!this.localRooms.has(roomId)) {
        this.localRooms.set(roomId, new Map());
      }
      const room = this.localRooms.get(roomId)!;
      const existing = room.get(participantId);
      if (existing) {
        existing.connectionId = connectionId;
        if (displayName) existing.displayName = displayName;
      } else {
        room.set(participantId, {
          participantId,
          connectionId,
          displayName: displayName ?? '',
          cameraEnabled: cameraEnabled ?? false,
          micEnabled: micEnabled ?? false,
          joinedAt: new Date().toISOString(),
        });
      }
    }
  }

  async leave(roomId: string, connectionId: string): Promise<ParticipantState | undefined> {
    const participantId = this.connectionRooms.get(connectionId)?.get(roomId);
    if (!participantId) return undefined;

    const connRooms = this.connectionRooms.get(connectionId)!;
    connRooms.delete(roomId);
    if (connRooms.size === 0) this.connectionRooms.delete(connectionId);

    this.roomConnections.get(roomId)?.delete(connectionId);
    if (this.roomConnections.get(roomId)?.size === 0) this.roomConnections.delete(roomId);

    if (this.redis) {
      const key = this.participantKey(roomId, participantId);
      const raw = await this.redis.get(key);
      await this.redis.del(key);
      await this.redis.srem(this.idsKey(roomId), participantId);
      return raw
        ? (JSON.parse(raw) as ParticipantState)
        : { participantId, connectionId, displayName: '', cameraEnabled: false, micEnabled: false, joinedAt: '' };
    } else {
      const room = this.localRooms.get(roomId);
      if (!room) return undefined;
      const removed = room.get(participantId);
      room.delete(participantId);
      if (room.size === 0) this.localRooms.delete(roomId);
      return removed;
    }
  }

  async leaveAll(connectionId: string): Promise<Array<{ roomId: string; participant: ParticipantState }>> {
    const left: Array<{ roomId: string; participant: ParticipantState }> = [];
    const rooms = this.connectionRooms.get(connectionId);
    if (!rooms) return left;

    for (const [roomId, participantId] of rooms.entries()) {
      this.roomConnections.get(roomId)?.delete(connectionId);
      if (this.roomConnections.get(roomId)?.size === 0) this.roomConnections.delete(roomId);

      if (this.redis) {
        const key = this.participantKey(roomId, participantId);
        const raw = await this.redis.get(key);
        await this.redis.del(key);
        await this.redis.srem(this.idsKey(roomId), participantId);
        left.push({
          roomId,
          participant: raw
            ? (JSON.parse(raw) as ParticipantState)
            : { participantId, connectionId, displayName: '', cameraEnabled: false, micEnabled: false, joinedAt: '' },
        });
      } else {
        const room = this.localRooms.get(roomId);
        if (room) {
          const participant = room.get(participantId);
          if (participant) {
            left.push({ roomId, participant });
            room.delete(participantId);
            if (room.size === 0) this.localRooms.delete(roomId);
          }
        }
      }
    }

    this.connectionRooms.delete(connectionId);
    return left;
  }

  async getParticipants(roomId: string): Promise<ParticipantState[]> {
    if (this.redis) {
      const ids = await this.redis.smembers(this.idsKey(roomId));
      if (ids.length === 0) return [];

      const keys = ids.map((id) => this.participantKey(roomId, id));
      const values = await this.redis.mget(...keys);

      const participants: ParticipantState[] = [];
      const expired: string[] = [];

      for (let i = 0; i < ids.length; i++) {
        const raw = values[i];
        if (raw) {
          participants.push(JSON.parse(raw) as ParticipantState);
        } else {
          expired.push(ids[i]!);
        }
      }

      if (expired.length > 0) {
        await this.redis.srem(this.idsKey(roomId), ...expired);
      }

      return participants;
    }

    return Array.from(this.localRooms.get(roomId)?.values() ?? []);
  }

  async updateState(
    roomId: string,
    participantId: string,
    patch: Partial<Pick<ParticipantState, 'displayName' | 'cameraEnabled' | 'micEnabled'>>,
  ): Promise<ParticipantState | undefined> {
    if (this.redis) {
      const key = this.participantKey(roomId, participantId);
      const raw = await this.redis.get(key);
      if (!raw) return undefined;
      const updated: ParticipantState = { ...(JSON.parse(raw) as ParticipantState), ...patch };
      await this.redis.set(key, JSON.stringify(updated), 'EX', this.ttlSeconds);
      return updated;
    }

    const participant = this.localRooms.get(roomId)?.get(participantId);
    if (!participant) return undefined;
    Object.assign(participant, patch);
    return participant;
  }

  async refreshTtl(roomId: string, participantId: string): Promise<void> {
    if (this.redis) {
      await this.redis.expire(this.participantKey(roomId, participantId), this.ttlSeconds);
    }
  }

  async getPeerNames(roomId: string): Promise<Record<string, string>> {
    const participants = await this.getParticipants(roomId);
    const result: Record<string, string> = {};
    for (const p of participants) {
      if (p.displayName) result[p.participantId] = p.displayName;
    }
    return result;
  }

  /** Returns connectionIds of active connections in a room (sync, for broadcasting). */
  getConnectionIds(roomId: string): string[] {
    return Array.from(this.roomConnections.get(roomId) ?? []);
  }

  /** Returns room+participantId pairs for a connection (sync, for TTL refresh). */
  getConnectionRooms(connectionId: string): { roomId: string; participantId: string }[] {
    const rooms = this.connectionRooms.get(connectionId);
    if (!rooms) return [];
    return Array.from(rooms.entries()).map(([roomId, participantId]) => ({ roomId, participantId }));
  }

  has(roomId: string, connectionId: string): boolean {
    return this.connectionRooms.get(connectionId)?.has(roomId) ?? false;
  }
}
