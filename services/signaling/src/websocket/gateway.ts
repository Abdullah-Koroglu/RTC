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
  private readonly rooms = new RoomManager();
  private readonly pubsub = new RedisPubSub();
  private readonly dispatcher = new EventDispatcher(this.nodeId, this.connections, this.rooms, this.pubsub);
  private readonly server = new WebSocketServer({ noServer: true, maxPayload: env.MAX_PAYLOAD_BYTES });
  private readonly recovery = new Map<string, RecoverySnapshot>();
  private heartbeatTimer?: NodeJS.Timeout;

  constructor(private readonly app: FastifyInstance) {}

  async start(): Promise<void> {
    await this.pubsub.connect(async (envelope) => {
      this.dispatcher.handleDistributedEvent(envelope);
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
      this.handleDisconnect(conn.connectionId, 'disconnect');
    });

    socket.on('error', () => {
      this.handleDisconnect(conn.connectionId, 'disconnect');
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
        this.rooms.join(roomId, {
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
      if (!this.rooms.has(event.roomId, conn.connectionId)) {
        this.rooms.join(event.roomId, {
          participantId: conn.participantId,
          connectionId: conn.connectionId,
        });
        conn.rooms.add(event.roomId);

        await this.dispatcher.publishRoomEvent(event.roomId, {
          type: 'room.participant-joined',
          roomId: event.roomId,
          participantId: conn.participantId,
          connectionId: conn.connectionId,
        });
      }

      this.send(conn.socket, { type: 'ack', requestId: event.requestId, ok: true });
      return;
    }

    if (event.type === 'room.leave') {
      const left = this.rooms.leave(event.roomId, conn.connectionId);
      conn.rooms.delete(event.roomId);

      if (left) {
        await this.dispatcher.publishRoomEvent(event.roomId, {
          type: 'room.participant-left',
          roomId: event.roomId,
          participantId: conn.participantId,
          connectionId: conn.connectionId,
          reason: 'leave',
        });
      }

      this.send(conn.socket, { type: 'ack', requestId: event.requestId, ok: true });
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

  private handleDisconnect(connectionId: string, reason: 'disconnect' | 'timeout'): void {
    const conn = this.connections.remove(connectionId);
    if (!conn) {
      return;
    }

    const left = this.rooms.leaveAll(connectionId);
    this.storeRecovery(conn.recoveryToken, conn.participantId, Array.from(conn.rooms));

    for (const item of left) {
      void this.dispatcher.publishRoomEvent(item.roomId, {
        type: 'room.participant-left',
        roomId: item.roomId,
        participantId: item.participant.participantId,
        connectionId,
        reason,
      });
    }
  }

  private startHeartbeat(): void {
    this.heartbeatTimer = setInterval(() => {
      this.connections.forEach((conn) => {
        if (!conn.isAlive && Date.now() - conn.lastHeartbeatAt > env.HEARTBEAT_TIMEOUT_MS) {
          conn.socket.terminate();
          this.handleDisconnect(conn.connectionId, 'timeout');
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
