import type Redis from 'ioredis';
import { env } from '@/config/env';

export interface RoomRosterParticipant {
  participantId: string;
  connectionId: string;
  displayName: string;
  cameraEnabled: boolean;
  micEnabled: boolean;
  joinedAt: string;
}

export interface RoomSnapshot {
  participants: RoomRosterParticipant[];
  hostPeerId?: string;
  locked: boolean;
  raisedHands: string[];
}

export class RoomManager {
  private readonly redis: Redis | null;
  private readonly ttlSeconds: number;

  // connectionId → Map<roomId, participantId> — for has() and TTL refresh
  private readonly connectionRooms = new Map<string, Map<string, string>>();
  // roomId → Set<connectionId> — for synchronous broadcast routing
  private readonly roomConnections = new Map<string, Set<string>>();
  // In-memory fallback when REDIS_ENABLED=false
  private readonly localRooms = new Map<string, Map<string, RoomRosterParticipant>>();
  // roomId → participantId of current host
  private readonly roomHosts = new Map<string, string>();
  // roomId → locked state
  private readonly roomLocked = new Map<string, boolean>();
  // roomId → Set of banned peerIds (kicked users)
  private readonly bannedPeers = new Map<string, Set<string>>();
  // roomId → Set of peerIds with hand raised
  private readonly raisedHands = new Map<string, Set<string>>();
  private readonly endedRooms = new Set<string>();

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
        const existing = JSON.parse(raw) as RoomRosterParticipant;
        const updated: RoomRosterParticipant = { ...existing, connectionId, ...(displayName ? { displayName } : {}) };
        await this.redis.set(key, JSON.stringify(updated), 'EX', this.ttlSeconds);
      } else {
        const state: RoomRosterParticipant = {
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

  markEnded(roomId: string): void {
    this.endedRooms.add(roomId);
  }

  clearEnded(roomId: string): void {
    this.endedRooms.delete(roomId);
  }

  isEnded(roomId: string): boolean {
    return this.endedRooms.has(roomId);
  }

  async leave(roomId: string, connectionId: string): Promise<RoomRosterParticipant | undefined> {
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
        ? (JSON.parse(raw) as RoomRosterParticipant)
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

  async leaveAll(connectionId: string): Promise<Array<{ roomId: string; participant: RoomRosterParticipant }>> {
    const left: Array<{ roomId: string; participant: RoomRosterParticipant }> = [];
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
            ? (JSON.parse(raw) as RoomRosterParticipant)
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

  async getParticipants(roomId: string): Promise<RoomRosterParticipant[]> {
    if (this.redis) {
      const ids = await this.redis.smembers(this.idsKey(roomId));
      if (ids.length === 0) return [];

      const keys = ids.map((id) => this.participantKey(roomId, id));
      const values = await this.redis.mget(...keys);

      const participants: RoomRosterParticipant[] = [];
      const expired: string[] = [];

      for (let i = 0; i < ids.length; i++) {
        const raw = values[i];
        if (raw) {
          participants.push(JSON.parse(raw) as RoomRosterParticipant);
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
    patch: Partial<Pick<RoomRosterParticipant, 'displayName' | 'cameraEnabled' | 'micEnabled'>>,
  ): Promise<RoomRosterParticipant | undefined> {
    if (this.redis) {
      const key = this.participantKey(roomId, participantId);
      const raw = await this.redis.get(key);
      if (!raw) return undefined;
      const updated: RoomRosterParticipant = { ...(JSON.parse(raw) as RoomRosterParticipant), ...patch };
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

  // ── Host management ──────────────────────────────────────────────────────

  setHost(roomId: string, participantId: string): void {
    this.roomHosts.set(roomId, participantId);
  }

  getHost(roomId: string): string | undefined {
    return this.roomHosts.get(roomId);
  }

  isHost(roomId: string, participantId: string): boolean {
    return this.roomHosts.get(roomId) === participantId;
  }

  /**
   * Called when the current host leaves. Picks a random remaining participant
   * as the new host. Returns the new host's participantId or null if room is empty.
   */
  transferHostRandom(roomId: string, leavingParticipantId: string): string | null {
    const connectionIds = Array.from(this.roomConnections.get(roomId) ?? []);
    const candidates: string[] = [];
    for (const connId of connectionIds) {
      const pid = this.connectionRooms.get(connId)?.get(roomId);
      if (pid && pid !== leavingParticipantId) candidates.push(pid);
    }
    if (candidates.length === 0) {
      this.roomHosts.delete(roomId);
      return null;
    }
    const newHost = candidates[Math.floor(Math.random() * candidates.length)]!;
    this.roomHosts.set(roomId, newHost);
    return newHost;
  }

  // ── Lock management ──────────────────────────────────────────────────────

  setLocked(roomId: string, locked: boolean): void {
    this.roomLocked.set(roomId, locked);
  }

  isLocked(roomId: string): boolean {
    return this.roomLocked.get(roomId) ?? false;
  }

  /** Returns the participantId for a given connectionId+roomId pair. */
  getParticipantId(roomId: string, connectionId: string): string | undefined {
    return this.connectionRooms.get(connectionId)?.get(roomId);
  }

  // ── Host-approved peers (bypass lock/ban for specifically approved users) ─

  private readonly approvedPeers = new Map<string, Set<string>>();

  approvePeer(roomId: string, peerId: string): void {
    if (!this.approvedPeers.has(roomId)) this.approvedPeers.set(roomId, new Set());
    this.approvedPeers.get(roomId)!.add(peerId);
  }

  isApproved(roomId: string, peerId: string): boolean {
    return this.approvedPeers.get(roomId)?.has(peerId) ?? false;
  }

  consumeApproval(roomId: string, peerId: string): void {
    this.approvedPeers.get(roomId)?.delete(peerId);
  }

  // ── Ban management ───────────────────────────────────────────────────────

  banPeer(roomId: string, peerId: string): void {
    if (!this.bannedPeers.has(roomId)) this.bannedPeers.set(roomId, new Set());
    this.bannedPeers.get(roomId)!.add(peerId);
  }

  isBanned(roomId: string, peerId: string): boolean {
    return this.bannedPeers.get(roomId)?.has(peerId) ?? false;
  }

  // ── Hand raise management ────────────────────────────────────────────────

  raiseHand(roomId: string, peerId: string): void {
    if (!this.raisedHands.has(roomId)) this.raisedHands.set(roomId, new Set());
    this.raisedHands.get(roomId)!.add(peerId);
  }

  lowerHand(roomId: string, peerId: string): void {
    this.raisedHands.get(roomId)?.delete(peerId);
  }

  hasHandRaised(roomId: string, peerId: string): boolean {
    return this.raisedHands.get(roomId)?.has(peerId) ?? false;
  }

  getRaisedHands(roomId: string): string[] {
    return Array.from(this.raisedHands.get(roomId) ?? []);
  }

  async getSnapshot(roomId: string): Promise<RoomSnapshot> {
    const hostPeerId = this.getHost(roomId);
    return {
      participants: await this.getParticipants(roomId),
      ...(hostPeerId !== undefined ? { hostPeerId } : {}),
      locked: this.isLocked(roomId),
      raisedHands: this.getRaisedHands(roomId),
    };
  }

  async closeRoom(roomId: string): Promise<RoomRosterParticipant[]> {
    const participants = await this.getParticipants(roomId);

    for (const participant of participants) {
      const rooms = this.connectionRooms.get(participant.connectionId);
      rooms?.delete(roomId);
      if (rooms && rooms.size === 0) {
        this.connectionRooms.delete(participant.connectionId);
      }
    }

    this.roomConnections.delete(roomId);
    this.localRooms.delete(roomId);
    this.roomHosts.delete(roomId);
    this.roomLocked.delete(roomId);
    this.approvedPeers.delete(roomId);
    this.bannedPeers.delete(roomId);
    this.raisedHands.delete(roomId);
    this.markEnded(roomId);

    if (this.redis) {
      const keys = participants.map((participant) => this.participantKey(roomId, participant.participantId));
      if (keys.length > 0) {
        await this.redis.del(...keys);
      }
      await this.redis.del(this.idsKey(roomId));
    }

    return participants;
  }
}
