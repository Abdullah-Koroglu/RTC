import type { WebSocket } from 'ws';

export interface ConnectionState {
  connectionId: string;
  participantId: string;
  recoveryToken: string;
  socket: WebSocket;
  rooms: Set<string>;
  lastHeartbeatAt: number;
  isAlive: boolean;
  nodeId: string;
}

export interface AuthContext {
  participantId: string;
  sessionId?: string;
  role?: string;
}
