import { randomUUID } from 'node:crypto';
import type { WebSocket } from 'ws';
import type { AuthContext, ConnectionState } from '@/types/connection';

export class ConnectionManager {
  private readonly byId = new Map<string, ConnectionState>();
  private readonly bySocket = new WeakMap<WebSocket, string>();

  getById(connectionId: string): ConnectionState | undefined {
    return this.byId.get(connectionId);
  }

  getByParticipantId(participantId: string): ConnectionState | undefined {
    for (const conn of this.byId.values()) {
      if (conn.participantId === participantId) return conn;
    }
    return undefined;
  }

  register(
    socket: WebSocket,
    participantId: string,
    nodeId: string,
    recoveryToken: string,
    auth?: AuthContext,
  ): ConnectionState {
    const connection: ConnectionState = {
      connectionId: randomUUID(),
      participantId,
      recoveryToken,
      socket,
      rooms: new Set<string>(),
      lastHeartbeatAt: Date.now(),
      isAlive: true,
      nodeId,
      ...(auth ? { auth } : {}),
    };

    this.byId.set(connection.connectionId, connection);
    this.bySocket.set(socket, connection.connectionId);
    return connection;
  }

  getBySocket(socket: WebSocket): ConnectionState | undefined {
    const id = this.bySocket.get(socket);
    return id ? this.byId.get(id) : undefined;
  }

  markAlive(connectionId: string): void {
    const conn = this.byId.get(connectionId);
    if (!conn) {
      return;
    }

    conn.isAlive = true;
    conn.lastHeartbeatAt = Date.now();
  }

  forEach(handler: (connection: ConnectionState) => void): void {
    for (const conn of this.byId.values()) {
      handler(conn);
    }
  }

  markForHeartbeat(connectionId: string): void {
    const conn = this.byId.get(connectionId);
    if (!conn) {
      return;
    }
    conn.isAlive = false;
  }

  remove(connectionId: string): ConnectionState | undefined {
    const conn = this.byId.get(connectionId);
    if (!conn) {
      return undefined;
    }

    this.byId.delete(connectionId);
    return conn;
  }

  size(): number {
    return this.byId.size;
  }
}
