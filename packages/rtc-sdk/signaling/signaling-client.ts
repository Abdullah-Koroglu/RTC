import { TypedEventEmitter } from '../events/event-emitter';

export type SignalKind = 'offer' | 'answer' | 'ice-candidate' | 'chat' | 'name-announce';

// Inbound event types from signaling server
export type InboundSignalingEvent =
  | { type: 'ack'; requestId?: string; ok: true; data?: unknown }
  | { type: 'error'; requestId?: string; code: string; message: string }
  | {
      type: 'room.participant-joined';
      roomId: string;
      participantId: string;
      connectionId: string;
    }
  | {
      type: 'room.participant-left';
      roomId: string;
      participantId: string;
      connectionId: string;
      reason: 'leave' | 'disconnect' | 'timeout';
    }
  | {
      type: 'signal.relay';
      roomId: string;
      participantId: string;
      payload: {
        kind: SignalKind;
        data: unknown;
        targetParticipantId?: string;
      };
    }
  | { type: 'pong'; ts: number }
  | {
      type: 'session.ready';
      connectionId: string;
      participantId: string;
      recoveryToken: string;
    };

// Outbound event types to signaling server
export type OutboundSignalingEvent =
  | { type: 'room.join'; roomId: string; requestId?: string }
  | { type: 'room.leave'; roomId: string; requestId?: string }
  | {
      type: 'signal.relay';
      roomId: string;
      payload: {
        kind: SignalKind;
        data: unknown;
        targetParticipantId?: string;
      };
      requestId?: string;
    }
  | { type: 'session.reconnect'; recoveryToken: string; requestId?: string }
  | { type: 'ping'; ts?: number };

export interface ChatMessagePayload {
  text: string;
  senderName: string;
  ts: number;
}

export interface SignalingClientEventMap {
    [key: string]: unknown;
  'signaling.connected': { connectionId: string; participantId: string };
  'signaling.disconnected': { reason?: string };
  'room.joined': { roomId: string };
  'room.left': { roomId: string };
  'room.participant-joined': { roomId: string; participantId: string; connectionId: string };
  'room.participant-left': { roomId: string; participantId: string; reason: string };
  'signal.received': {
    roomId: string;
    participantId: string;
    kind: 'offer' | 'answer' | 'ice-candidate';
    data: unknown;
  };
  'chat.received': { roomId: string; participantId: string } & ChatMessagePayload;
  'name.announce': { roomId: string; participantId: string; displayName: string };
  'reconnect.scheduled': { delayMs: number; attempt: number };
  'reconnect.succeeded': { attempt: number };
  'reconnect.failed': { attempt: number; error: Error };
  'error': { error: Error };
}

export interface SignalingClientOptions {
  url: string;
  token: string;
  participantId: string;
  reconnect?: {
    maxAttempts: number;
    baseDelayMs: number;
    maxDelayMs: number;
  };
  WebSocketConstructor?: typeof WebSocket;
}

const DEFAULT_RECONNECT_CONFIG = {
  maxAttempts: 5,
  baseDelayMs: 1000,
  maxDelayMs: 30000,
};

export class SignalingClient {
  private socket: WebSocket | null = null;
  private readonly emitter = new TypedEventEmitter<SignalingClientEventMap>();
  private connectionId: string | null = null;
  private participantId: string;
  private reconnectAttempt = 0;
  private reconnectTimer: NodeJS.Timeout | null = null;
  private pendingRequests = new Map<string, { resolve: (data: unknown) => void; reject: (error: Error) => void; timeout: NodeJS.Timeout }>();
  private requestIdCounter = 0;

  constructor(private readonly options: SignalingClientOptions) {
    this.participantId = options.participantId;
  }

  on = this.emitter.on.bind(this.emitter);

  async connect(): Promise<void> {
    if (this.socket && (this.socket.readyState === WebSocket.OPEN || this.socket.readyState === WebSocket.CONNECTING)) {
      return;
    }

    return new Promise<void>((resolve, reject) => {
      try {
        const urlObj = new URL(this.options.url);
        urlObj.searchParams.set('token', this.options.token);
        const connectionUrl = urlObj.toString();
        
        const WebSocketCtor = this.options.WebSocketConstructor || (typeof WebSocket !== 'undefined' ? WebSocket : undefined);
        if (!WebSocketCtor) {
          throw new Error('WebSocket is not available in this environment');
        }

        const socket = new WebSocketCtor(connectionUrl);
        this.socket = socket;

        const handleOpen = () => {
          socket.removeEventListener('open', handleOpen);
          socket.removeEventListener('error', handleError);
          this.reconnectAttempt = 0;
          resolve();
        };

        const handleError = (error?: Event) => {
          socket.removeEventListener('open', handleOpen);
          socket.removeEventListener('error', handleError);
          const errorMsg = error instanceof Error ? error.message : 'WebSocket connection error';
          reject(new Error(errorMsg));
        };

        socket.addEventListener('open', handleOpen);
        socket.addEventListener('error', handleError as any);

        socket.addEventListener('message', (event) => {
          this.handleMessage(event.data as string);
        });

        socket.addEventListener('close', () => {
          this.connectionId = null;
          this.emitter.emit('signaling.disconnected', {});
          this.scheduleReconnect();
        });
      } catch (error) {
        reject(error instanceof Error ? error : new Error('Failed to connect'));
      }
    });
  }

  async disconnect(reason?: string): Promise<void> {
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }

    for (const [, { timeout }] of this.pendingRequests) {
      clearTimeout(timeout);
    }
    this.pendingRequests.clear();

    if (!this.socket) {
      return;
    }

    if (this.socket.readyState === WebSocket.OPEN || this.socket.readyState === WebSocket.CONNECTING) {
      this.socket.close(1000, reason);
    }

    this.socket = null;
  }

  async joinRoom(roomId: string): Promise<void> {
    const requestId = this.generateRequestId();
    const message: OutboundSignalingEvent = {
      type: 'room.join',
      roomId,
      requestId,
    };
    await this.sendMessage(message);
    
    return new Promise((resolve, reject) => {
      const timeout = setTimeout(() => {
        this.pendingRequests.delete(requestId);
        reject(new Error(`Room join request timed out for room ${roomId}`));
      }, 5000);

      this.pendingRequests.set(requestId, {
        resolve: () => {
          this.emitter.emit('room.joined', { roomId });
          resolve();
        },
        reject,
        timeout,
      });
    });
  }

  async leaveRoom(roomId: string): Promise<void> {
    const requestId = this.generateRequestId();
    const message: OutboundSignalingEvent = {
      type: 'room.leave',
      roomId,
      requestId,
    };
    await this.sendMessage(message);

    return new Promise((resolve, reject) => {
      const timeout = setTimeout(() => {
        this.pendingRequests.delete(requestId);
        reject(new Error(`Room leave request timed out for room ${roomId}`));
      }, 5000);

      this.pendingRequests.set(requestId, {
        resolve: () => {
          this.emitter.emit('room.left', { roomId });
          resolve();
        },
        reject,
        timeout,
      });
    });
  }

  async relaySignal(
    roomId: string,
    kind: 'offer' | 'answer' | 'ice-candidate',
    data: unknown,
    targetParticipantId?: string,
  ): Promise<void> {
    const requestId = this.generateRequestId();
    const payload: Record<string, unknown> = {
      kind,
      data,
    };
    if (targetParticipantId !== undefined) {
      payload.targetParticipantId = targetParticipantId;
    }

    const message: OutboundSignalingEvent = {
      type: 'signal.relay',
      roomId,
      payload: payload as any,
      requestId,
    };
    await this.sendMessage(message);

    return new Promise((resolve, reject) => {
      const timeout = setTimeout(() => {
        this.pendingRequests.delete(requestId);
        reject(new Error(`Signal relay request timed out`));
      }, 5000);

      this.pendingRequests.set(requestId, {
        resolve: () => resolve(),
        reject,
        timeout,
      });
    });
  }

  async sendNameAnnounce(roomId: string, displayName: string): Promise<void> {
    const requestId = this.generateRequestId();
    const message: OutboundSignalingEvent = {
      type: 'signal.relay',
      roomId,
      payload: { kind: 'name-announce', data: { displayName } },
      requestId,
    };
    await this.sendMessage(message);
    return new Promise((resolve, reject) => {
      const timeout = setTimeout(() => {
        this.pendingRequests.delete(requestId);
        resolve(); // non-critical, don't reject
      }, 3000);
      this.pendingRequests.set(requestId, { resolve: () => { clearTimeout(timeout); resolve(); }, reject, timeout });
    });
  }

  async sendChatMessage(roomId: string, text: string, senderName: string): Promise<void> {
    const requestId = this.generateRequestId();
    const payload: ChatMessagePayload = { text, senderName, ts: Date.now() };
    const message: OutboundSignalingEvent = {
      type: 'signal.relay',
      roomId,
      payload: { kind: 'chat', data: payload },
      requestId,
    };
    await this.sendMessage(message);
    return new Promise((resolve, reject) => {
      const timeout = setTimeout(() => {
        this.pendingRequests.delete(requestId);
        reject(new Error('Chat message relay timed out'));
      }, 5000);
      this.pendingRequests.set(requestId, { resolve: () => resolve(), reject, timeout });
    });
  }

  async ping(): Promise<number> {
    const ts = Date.now();
    const message: OutboundSignalingEvent = {
      type: 'ping',
      ts,
    };
    await this.sendMessage(message);
    return new Promise((resolve, reject) => {
      const timeout = setTimeout(() => {
        reject(new Error('Ping timeout'));
      }, 5000);

      // Store a special handler for ping/pong
      (this as any).__pingTimeout = timeout;
      (this as any).__pingResolve = resolve;
    });
  }

  isConnected(): boolean {
    return this.socket?.readyState === WebSocket.OPEN && this.connectionId !== null;
  }

  private async sendMessage(message: OutboundSignalingEvent): Promise<void> {
    if (this.socket?.readyState !== WebSocket.OPEN) {
      throw new Error('Signaling client is not connected');
    }

    this.socket.send(JSON.stringify(message));
  }

  private handleMessage(data: string): void {
    try {
      const message = JSON.parse(data) as InboundSignalingEvent;

      if (message.type === 'session.ready') {
        this.connectionId = message.connectionId;
        this.participantId = message.participantId;
        this.emitter.emit('signaling.connected', {
          connectionId: message.connectionId,
          participantId: message.participantId,
        });
      } else if (message.type === 'ack') {
        const handler = this.pendingRequests.get(message.requestId || '');
        if (handler) {
          clearTimeout(handler.timeout);
          this.pendingRequests.delete(message.requestId || '');
          handler.resolve(message.data);
        }
      } else if (message.type === 'error') {
        const handler = this.pendingRequests.get(message.requestId || '');
        if (handler) {
          clearTimeout(handler.timeout);
          this.pendingRequests.delete(message.requestId || '');
          handler.reject(new Error(`Signaling error: ${message.code} - ${message.message}`));
        }
        const error = new Error(`Signaling error: ${message.code} - ${message.message}`);
        this.emitter.emit('error', { error });
      } else if (message.type === 'pong') {
        const resolve = (this as any).__pingResolve;
        if (resolve) {
          clearTimeout((this as any).__pingTimeout);
          delete (this as any).__pingResolve;
          delete (this as any).__pingTimeout;
          const latency = Date.now() - message.ts;
          resolve(latency);
        }
      } else if (message.type === 'room.participant-joined') {
        this.emitter.emit('room.participant-joined', {
          roomId: message.roomId,
          participantId: message.participantId,
          connectionId: message.connectionId,
        });
      } else if (message.type === 'room.participant-left') {
        this.emitter.emit('room.participant-left', {
          roomId: message.roomId,
          participantId: message.participantId,
          reason: message.reason,
        });
      } else if (message.type === 'signal.relay') {
        if (message.payload.kind === 'chat') {
          const payload = message.payload.data as ChatMessagePayload;
          this.emitter.emit('chat.received', {
            roomId: message.roomId,
            participantId: message.participantId,
            text: payload.text,
            senderName: payload.senderName,
            ts: payload.ts,
          });
        } else if (message.payload.kind === 'name-announce') {
          const payload = message.payload.data as { displayName: string };
          this.emitter.emit('name.announce', {
            roomId: message.roomId,
            participantId: message.participantId,
            displayName: payload.displayName,
          });
        } else {
          this.emitter.emit('signal.received', {
            roomId: message.roomId,
            participantId: message.participantId,
            kind: message.payload.kind as 'offer' | 'answer' | 'ice-candidate',
            data: message.payload.data,
          });
        }
      }
    } catch (error) {
      const err = error instanceof Error ? error : new Error('Failed to parse signaling message');
      this.emitter.emit('error', { error: err });
    }
  }

  private scheduleReconnect(): void {
    const config = { ...DEFAULT_RECONNECT_CONFIG, ...this.options.reconnect };

    if (this.reconnectAttempt >= config.maxAttempts) {
      const error = new Error(`Max reconnection attempts reached (${config.maxAttempts})`);
      this.emitter.emit('reconnect.failed', { attempt: this.reconnectAttempt, error });
      return;
    }

    const delayMs = Math.min(
      config.baseDelayMs * Math.pow(2, this.reconnectAttempt),
      config.maxDelayMs,
    );

    this.reconnectAttempt += 1;
    this.emitter.emit('reconnect.scheduled', { delayMs, attempt: this.reconnectAttempt });

    this.reconnectTimer = setTimeout(async () => {
      try {
        await this.connect();
        this.emitter.emit('reconnect.succeeded', { attempt: this.reconnectAttempt });
      } catch (error) {
        const err = error instanceof Error ? error : new Error('Reconnection failed');
        this.scheduleReconnect();
      }
    }, delayMs);
  }

  private generateRequestId(): string {
    return `req-${++this.requestIdCounter}`;
  }

  dispose(): void {
    void this.disconnect('Client disposed');
    this.emitter.clear();
  }
}
