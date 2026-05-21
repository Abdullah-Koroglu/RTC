import { createHash, randomUUID } from 'node:crypto';
import type { IncomingMessage } from 'node:http';
import { URL } from 'node:url';
import { WebSocketServer, type WebSocket } from 'ws';
import type { FastifyInstance } from 'fastify';
import { env } from '@/config/env';
import { inboundEventSchema, type InboundEvent, type OutboundEvent } from '@/types/events';
import { authenticateToken } from '@/websocket/auth';
import { ConnectionManager } from '@/websocket/connection-manager';
import { RoomManager } from '@/rooms/room-manager';
import { RedisPubSub } from '@/redis/pubsub';
import { EventDispatcher } from '@/events/dispatcher';

interface RecoverySnapshot {
  participantId: string;
  roomIds: string[];
  expiresAt: number;
}

export class WebSocketGateway {
  private readonly nodeId = process.env.HOSTNAME ?? `node-${randomUUID()}`;
  private readonly connections = new ConnectionManager();
  private readonly pubsub = new RedisPubSub();
  private readonly dispatcher: EventDispatcher;
  private readonly server = new WebSocketServer({ noServer: true, maxPayload: env.MAX_PAYLOAD_BYTES });
  private readonly recovery = new Map<string, RecoverySnapshot>();
  // roomId → Map<peerId, { connectionId, displayName }>
  private readonly waitingRoom = new Map<string, Map<string, { connectionId: string; displayName: string }>>();
  private heartbeatTimer?: NodeJS.Timeout;

  constructor(
    private readonly app: FastifyInstance,
    private readonly rooms: RoomManager,
  ) {
    this.dispatcher = new EventDispatcher(this.nodeId, this.connections, this.rooms, this.pubsub);
  }

  async start(): Promise<void> {
    await this.pubsub.connect(async (envelope) => {
      this.dispatcher.handleDistributedEvent(envelope);
    });

    this.app.get('/debug/rooms/:roomId/participants', async (request) => {
      const { roomId } = request.params as { roomId: string };
      return this.rooms.getParticipants(roomId);
    });

    this.app.server.on('upgrade', (request, socket, head) => {
      if (!request.url?.startsWith('/ws')) {
        socket.destroy();
        return;
      }

      void this.handleUpgrade(request, socket, head);
    });

    this.server.on('connection', (socket, request, auth) => {
      this.onConnection(socket, request, auth.participantId);
    });

    this.startHeartbeat();
  }

  async handlePeerGoneNotification(roomId: string, peerId: string): Promise<void> {
    await this.dispatcher.publishRoomEvent(roomId, {
      type: 'room.participant-left',
      roomId,
      participantId: peerId,
      connectionId: 'mediasoup-eviction',
      reason: 'disconnect',
    });
  }

  async handleJoinRequestNotification(roomId: string, peerId: string, displayName: string): Promise<void> {
    // Add to in-memory waiting list
    const waiters = this.waitingRoom.get(roomId) ?? new Map();
    waiters.set(peerId, { connectionId: '', displayName });
    this.waitingRoom.set(roomId, waiters);

    // Forward to host via WebSocket
    const hostPeerId = this.rooms.getHost(roomId);
    if (hostPeerId) {
      const hostConn = this.connections.getByParticipantId(hostPeerId);
      if (hostConn) {
        this.send(hostConn.socket, {
          type: 'room.join-requested',
          roomId,
          peerId,
          displayName,
        });
      }
    }
  }

  async handleProducerNew(roomId: string, peerId: string, producerId: string, kind: 'audio' | 'video'): Promise<void> {
    await this.dispatcher.publishRoomEvent(roomId, {
      type: 'producer.new',
      roomId,
      peerId,
      producerId,
      kind,
    });
  }

  async handleProducerClosed(roomId: string, peerId: string, producerId: string): Promise<void> {
    await this.dispatcher.publishRoomEvent(roomId, {
      type: 'producer.closed',
      roomId,
      peerId,
      producerId,
    });
  }

  async close(): Promise<void> {
    if (this.heartbeatTimer) {
      clearInterval(this.heartbeatTimer);
    }

    this.server.clients.forEach((socket) => {
      socket.terminate();
    });

    this.server.close();
    await this.pubsub.close();
  }

  private async handleUpgrade(request: IncomingMessage, socket: import('node:net').Socket, head: Buffer): Promise<void> {
    try {
      const token = this.extractToken(request);
      const auth = await authenticateToken(token);

      this.server.handleUpgrade(request, socket, head, (ws) => {
        this.server.emit('connection', ws, request, auth);
      });
    } catch {
      socket.write('HTTP/1.1 401 Unauthorized\r\n\r\n');
      socket.destroy();
    }
  }

  private onConnection(socket: WebSocket, request: IncomingMessage, participantId: string): void {
    const recoveryToken = this.createRecoveryToken(participantId, randomUUID());
    const conn = this.connections.register(socket, participantId, this.nodeId, recoveryToken);
    this.recovery.set(recoveryToken, {
      participantId,
      roomIds: [],
      expiresAt: Date.now() + 2 * 60_000,
    });

    this.send(socket, {
      type: 'session.ready',
      connectionId: conn.connectionId,
      participantId,
      recoveryToken,
    });

    socket.on('pong', () => {
      this.connections.markAlive(conn.connectionId);
      // Refresh Redis TTL for all rooms this connection is in
      for (const { roomId, participantId: pid } of this.rooms.getConnectionRooms(conn.connectionId)) {
        void this.rooms.refreshTtl(roomId, pid);
      }
    });

    socket.on('message', (raw) => {
      let json: unknown;
      try {
        json = JSON.parse(raw.toString());
      } catch {
        this.send(socket, {
          type: 'error',
          code: 'INVALID_JSON',
          message: 'Malformed JSON payload',
        });
        return;
      }

      const parsed = inboundEventSchema.safeParse(json);
      if (!parsed.success) {
        this.send(socket, {
          type: 'error',
          code: 'INVALID_EVENT',
          message: 'Invalid websocket event payload',
        });
        return;
      }

      void this.handleEvent(conn.connectionId, parsed.data);
    });

    socket.on('close', () => {
      void this.handleDisconnect(conn.connectionId, 'disconnect');
    });

    socket.on('error', () => {
      void this.handleDisconnect(conn.connectionId, 'disconnect');
    });

    this.app.log.info(
      {
        connectionId: conn.connectionId,
        participantId,
        ip: request.socket.remoteAddress,
      },
      'ws_connected',
    );
  }

  private async handleEvent(connectionId: string, event: InboundEvent): Promise<void> {
    const conn = this.connections.getById(connectionId);
    if (!conn) {
      return;
    }

    if (event.type === 'ping') {
      this.send(conn.socket, { type: 'pong', ts: Date.now() });
      return;
    }

    if (event.type === 'session.reconnect') {
      const snapshot = this.recovery.get(event.recoveryToken);
      if (!snapshot || snapshot.expiresAt < Date.now() || snapshot.participantId !== conn.participantId) {
        this.send(conn.socket, {
          type: 'error',
          requestId: event.requestId,
          code: 'RECOVERY_NOT_FOUND',
          message: 'Recovery session not found or expired',
        });
        return;
      }

      for (const roomId of snapshot.roomIds) {
        await this.rooms.join(roomId, {
          participantId: conn.participantId,
          connectionId: conn.connectionId,
        });
        conn.rooms.add(roomId);
      }

      this.send(conn.socket, {
        type: 'ack',
        requestId: event.requestId,
        ok: true,
        data: { recoveredRooms: snapshot.roomIds },
      });
      return;
    }

    if (event.type === 'room.join') {
      // Locked room: reject new joiners (already-joined members are unaffected)
      if (!this.rooms.has(event.roomId, conn.connectionId) && this.rooms.isLocked(event.roomId)) {
        this.send(conn.socket, { type: 'error', code: 'ROOM_LOCKED', message: 'This room is locked' } as Parameters<typeof this.send>[1]);
        return;
      }
      // Banned peer: must go through waiting room
      if (!this.rooms.has(event.roomId, conn.connectionId) && this.rooms.isBanned(event.roomId, conn.participantId)) {
        this.send(conn.socket, { type: 'error', code: 'BANNED', message: 'You were removed from this room. Request to join again.' } as Parameters<typeof this.send>[1]);
        return;
      }
      if (!this.rooms.has(event.roomId, conn.connectionId)) {
        await this.rooms.join(event.roomId, {
          participantId: conn.participantId,
          connectionId: conn.connectionId,
          ...(event.displayName !== undefined ? { displayName: event.displayName } : {}),
          ...(event.micEnabled !== undefined ? { micEnabled: event.micEnabled } : {}),
          ...(event.cameraEnabled !== undefined ? { cameraEnabled: event.cameraEnabled } : {}),
        });
        conn.rooms.add(event.roomId);

        // First joiner becomes host automatically
        if (!this.rooms.getHost(event.roomId)) {
          this.rooms.setHost(event.roomId, conn.participantId);
        }

        await this.dispatcher.publishRoomEvent(event.roomId, {
          type: 'room.participant-joined',
          roomId: event.roomId,
          participantId: conn.participantId,
          connectionId: conn.connectionId,
          ...(event.displayName !== undefined ? { displayName: event.displayName } : {}),
        });
      }

      const participants = await this.rooms.getParticipants(event.roomId);
      const hostPeerId = this.rooms.getHost(event.roomId);
      this.send(conn.socket, {
        type: 'ack',
        requestId: event.requestId,
        ok: true,
        data: { participants, ...(hostPeerId !== undefined ? { hostPeerId } : {}) },
      } as Parameters<typeof this.send>[1]);
      return;
    }

    if (event.type === 'room.request-join') {
      // Add to waiting list and notify host
      const waiters = this.waitingRoom.get(event.roomId) ?? new Map();
      waiters.set(conn.participantId, { connectionId: conn.connectionId, displayName: event.displayName ?? conn.participantId });
      this.waitingRoom.set(event.roomId, waiters);

      // Find host connection and notify
      const hostPeerId = this.rooms.getHost(event.roomId);
      if (hostPeerId) {
        const hostConn = this.connections.getByParticipantId(hostPeerId);
        if (hostConn) {
          this.send(hostConn.socket, {
            type: 'room.join-requested',
            roomId: event.roomId,
            peerId: conn.participantId,
            displayName: event.displayName ?? conn.participantId,
          });
        }
      }

      this.send(conn.socket, { type: 'ack', requestId: event.requestId, ok: true });
      return;
    }

    if (event.type === 'room.approve-join') {
      const waiter = this.waitingRoom.get(event.roomId)?.get(event.peerId);
      this.waitingRoom.get(event.roomId)?.delete(event.peerId);
      if (waiter) {
        const waiterConn = this.connections.getById(waiter.connectionId);
        if (waiterConn) {
          this.send(waiterConn.socket, { type: 'room.join-approved', roomId: event.roomId });
        }
      }
      // Persist decision to DB so polling waiting users can see it
      void this.notifyApiJoinDecision(event.roomId, event.peerId, 'approve');
      this.send(conn.socket, { type: 'ack', requestId: event.requestId, ok: true });
      return;
    }

    if (event.type === 'room.deny-join') {
      const waiter = this.waitingRoom.get(event.roomId)?.get(event.peerId);
      this.waitingRoom.get(event.roomId)?.delete(event.peerId);
      if (waiter) {
        const waiterConn = this.connections.getById(waiter.connectionId);
        if (waiterConn) {
          this.send(waiterConn.socket, { type: 'room.join-denied', roomId: event.roomId });
        }
      }
      // Persist decision to DB
      void this.notifyApiJoinDecision(event.roomId, event.peerId, 'deny');
      this.send(conn.socket, { type: 'ack', requestId: event.requestId, ok: true });
      return;
    }

    if (event.type === 'room.kick') {
      if (!this.rooms.isHost(event.roomId, conn.participantId)) {
        this.send(conn.socket, { type: 'error', code: 'FORBIDDEN', message: 'Only host can kick participants' });
        return;
      }
      this.rooms.banPeer(event.roomId, event.peerId);
      const kicked = this.connections.getByParticipantId(event.peerId);
      if (kicked) {
        this.send(kicked.socket, { type: 'room.participant-kicked', roomId: event.roomId, participantId: event.peerId });
        setTimeout(() => kicked.socket.close(1000, 'kicked'), 200);
      }
      this.send(conn.socket, { type: 'ack', requestId: event.requestId, ok: true });
      return;
    }

    if (event.type === 'room.lock') {
      if (!this.rooms.isHost(event.roomId, conn.participantId)) {
        this.send(conn.socket, { type: 'error', code: 'FORBIDDEN', message: 'Only host can lock the room' });
        return;
      }
      this.rooms.setLocked(event.roomId, event.locked);
      await this.dispatcher.publishRoomEvent(event.roomId, {
        type: 'room.locked',
        roomId: event.roomId,
        locked: event.locked,
      });
      this.send(conn.socket, { type: 'ack', requestId: event.requestId, ok: true });
      return;
    }

    if (event.type === 'room.transfer-host') {
      if (!this.rooms.isHost(event.roomId, conn.participantId)) {
        this.send(conn.socket, { type: 'error', code: 'FORBIDDEN', message: 'Only host can transfer host role' });
        return;
      }
      const participants = await this.rooms.getParticipants(event.roomId);
      const newHostState = participants.find((p) => p.participantId === event.peerId);
      if (!newHostState) {
        this.send(conn.socket, { type: 'error', code: 'NOT_FOUND', message: 'Participant not found' });
        return;
      }
      this.rooms.setHost(event.roomId, event.peerId);
      await this.dispatcher.publishRoomEvent(event.roomId, {
        type: 'room.host-transferred',
        roomId: event.roomId,
        newHostPeerId: event.peerId,
        newHostDisplayName: newHostState.displayName,
      });
      this.send(conn.socket, { type: 'ack', requestId: event.requestId, ok: true });
      return;
    }

    if (event.type === 'room.leave') {
      const wasHost = this.rooms.isHost(event.roomId, conn.participantId);
      const left = await this.rooms.leave(event.roomId, conn.connectionId);
      conn.rooms.delete(event.roomId);

      if (left) {
        await this.dispatcher.publishRoomEvent(event.roomId, {
          type: 'room.participant-left',
          roomId: event.roomId,
          participantId: conn.participantId,
          connectionId: conn.connectionId,
          reason: 'leave',
        });

        if (wasHost) {
          const newHostId = this.rooms.transferHostRandom(event.roomId, conn.participantId);
          if (newHostId) {
            const participants = await this.rooms.getParticipants(event.roomId);
            const newHostState = participants.find((p) => p.participantId === newHostId);
            void this.dispatcher.publishRoomEvent(event.roomId, {
              type: 'room.host-transferred',
              roomId: event.roomId,
              newHostPeerId: newHostId,
              newHostDisplayName: newHostState?.displayName ?? newHostId,
            });
          }
        }
      }

      this.send(conn.socket, { type: 'ack', requestId: event.requestId, ok: true });
      return;
    }

    if (event.type === 'participant.state-update') {
      const patch: Partial<{ displayName: string; cameraEnabled: boolean; micEnabled: boolean }> = {};
      if (event.cameraEnabled !== undefined) patch.cameraEnabled = event.cameraEnabled;
      if (event.micEnabled !== undefined) patch.micEnabled = event.micEnabled;
      if (event.displayName !== undefined) patch.displayName = event.displayName;

      const updated = await this.rooms.updateState(event.roomId, conn.participantId, patch);

      if (updated) {
        await this.dispatcher.publishRoomEvent(event.roomId, {
          type: 'room.participant-state-updated',
          roomId: event.roomId,
          participantId: conn.participantId,
          displayName: updated.displayName,
          cameraEnabled: updated.cameraEnabled,
          micEnabled: updated.micEnabled,
        });
      }

      this.send(conn.socket, { type: 'ack', requestId: event.requestId, ok: true });
      return;
    }

    if (event.type === 'room.force-mute') {
      if (!this.rooms.isHost(event.roomId, conn.participantId)) {
        this.send(conn.socket, { type: 'error', code: 'FORBIDDEN', message: 'Only host can mute participants' } as Parameters<typeof this.send>[1]);
        return;
      }
      const target = this.connections.getByParticipantId(event.peerId);
      if (target) {
        this.send(target.socket, { type: 'room.participant-muted', roomId: event.roomId, participantId: event.peerId, kind: event.kind });
      }
      // Also update Redis state
      const patch = event.kind === 'audio' ? { micEnabled: false }
        : event.kind === 'video' ? { cameraEnabled: false }
        : { micEnabled: false, cameraEnabled: false };
      await this.rooms.updateState(event.roomId, event.peerId, patch);
      this.send(conn.socket, { type: 'ack', requestId: event.requestId, ok: true } as Parameters<typeof this.send>[1]);
      return;
    }

    if (event.type === 'room.request-unmute') {
      if (!this.rooms.isHost(event.roomId, conn.participantId)) {
        this.send(conn.socket, { type: 'error', code: 'FORBIDDEN', message: 'Only host can request unmute' } as Parameters<typeof this.send>[1]);
        return;
      }
      const target = this.connections.getByParticipantId(event.peerId);
      if (target) {
        this.send(target.socket, { type: 'room.unmute-requested', roomId: event.roomId, kind: event.kind });
      }
      this.send(conn.socket, { type: 'ack', requestId: event.requestId, ok: true } as Parameters<typeof this.send>[1]);
      return;
    }

    if (event.type === 'room.raise-hand') {
      this.rooms.raiseHand(event.roomId, conn.participantId);
      const participants = await this.rooms.getParticipants(event.roomId);
      const state = participants.find((p) => p.participantId === conn.participantId);
      this.dispatcher.broadcastToRoom(event.roomId, {
        type: 'room.hand-raised',
        roomId: event.roomId,
        participantId: conn.participantId,
        displayName: state?.displayName ?? conn.participantId,
      });
      this.send(conn.socket, { type: 'ack', requestId: event.requestId, ok: true } as Parameters<typeof this.send>[1]);
      return;
    }

    if (event.type === 'room.lower-hand') {
      const targetPeer = event.peerId ?? conn.participantId;
      this.rooms.lowerHand(event.roomId, targetPeer);
      this.dispatcher.broadcastToRoom(event.roomId, {
        type: 'room.hand-lowered',
        roomId: event.roomId,
        participantId: targetPeer,
      });
      this.send(conn.socket, { type: 'ack', requestId: event.requestId, ok: true } as Parameters<typeof this.send>[1]);
      return;
    }

    await this.dispatcher.publishRoomEvent(event.roomId, {
      type: 'signal.relay',
      roomId: event.roomId,
      participantId: conn.participantId,
      payload: event.payload,
    });

    this.send(conn.socket, { type: 'ack', requestId: event.requestId, ok: true });
  }

  private async handleDisconnect(connectionId: string, reason: 'disconnect' | 'timeout'): Promise<void> {
    const conn = this.connections.remove(connectionId);
    if (!conn) {
      return;
    }

    const left = await this.rooms.leaveAll(connectionId);
    this.storeRecovery(conn.recoveryToken, conn.participantId, Array.from(conn.rooms));

    for (const item of left) {
      void this.dispatcher.publishRoomEvent(item.roomId, {
        type: 'room.participant-left',
        roomId: item.roomId,
        participantId: item.participant.participantId,
        connectionId,
        reason,
      });

      // Auto host transfer if the leaving participant was the host
      if (this.rooms.isHost(item.roomId, item.participant.participantId)) {
        const newHostId = this.rooms.transferHostRandom(item.roomId, item.participant.participantId);
        if (newHostId) {
          void this.rooms.getParticipants(item.roomId).then((participants) => {
            const newHostState = participants.find((p) => p.participantId === newHostId);
            void this.dispatcher.publishRoomEvent(item.roomId, {
              type: 'room.host-transferred',
              roomId: item.roomId,
              newHostPeerId: newHostId,
              newHostDisplayName: newHostState?.displayName ?? newHostId,
            });
          });
        }
      }

      void this.evictMediasoupPeer(item.roomId, item.participant.participantId);
    }
  }

  private notifyApiJoinDecision(roomId: string, peerId: string, action: 'approve' | 'deny'): Promise<void> {
    return fetch(`${env.API_INTERNAL_URL}/v1/rooms/${roomId}/join-requests/peer/${peerId}`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${env.INTERNAL_API_SECRET}`,
        'x-user-id': 'signaling',
      },
      body: JSON.stringify({ action }),
    })
      .then(() => undefined)
      .catch((err) => {
        this.app.log.warn({ roomId, peerId, action, err }, 'api_join_decision_notify_failed');
      });
  }

  private evictMediasoupPeer(roomId: string, peerId: string): Promise<void> {
    return fetch(`${env.MEDIASOUP_INTERNAL_URL}/rooms/${roomId}/peers/${peerId}`, { method: 'DELETE' })
      .then((res) => {
        if (!res.ok) {
          this.app.log.warn({ roomId, peerId, status: res.status }, 'mediasoup_peer_eviction_failed');
        }
      })
      .catch((err) => {
        this.app.log.warn({ roomId, peerId, err }, 'mediasoup_peer_eviction_error');
      });
  }

  private startHeartbeat(): void {
    this.heartbeatTimer = setInterval(() => {
      this.connections.forEach((conn) => {
        if (!conn.isAlive && Date.now() - conn.lastHeartbeatAt > env.HEARTBEAT_TIMEOUT_MS) {
          conn.socket.terminate();
          void this.handleDisconnect(conn.connectionId, 'timeout');
          return;
        }

        this.connections.markForHeartbeat(conn.connectionId);
        conn.socket.ping();
      });
    }, env.HEARTBEAT_INTERVAL_MS);

    this.heartbeatTimer.unref();
  }

  private send(socket: WebSocket, event: OutboundEvent): void {
    if (socket.readyState !== socket.OPEN) {
      return;
    }
    socket.send(JSON.stringify(event));
  }

  private extractToken(request: IncomingMessage): string {
    const authHeader = request.headers.authorization;
    if (authHeader?.startsWith('Bearer ')) {
      return authHeader.slice(7).trim();
    }

    const base = `http://${request.headers.host ?? 'localhost'}`;
    const url = new URL(request.url ?? '/', base);
    const token = url.searchParams.get('token');
    if (token) {
      return token;
    }

    throw new Error('Missing auth token');
  }

  private createRecoveryToken(participantId: string, connectionId: string): string {
    return createHash('sha256').update(`${participantId}:${connectionId}:${Date.now()}`).digest('hex');
  }

  private storeRecovery(token: string, participantId: string, roomIds: string[]): void {
    this.recovery.set(token, {
      participantId,
      roomIds,
      expiresAt: Date.now() + 2 * 60_000,
    });

    setTimeout(() => {
      this.recovery.delete(token);
    }, 2 * 60_000).unref();
  }
}
