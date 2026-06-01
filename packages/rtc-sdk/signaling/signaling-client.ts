import { TypedEventEmitter } from '../events/event-emitter';

export type SignalKind = 'offer' | 'answer' | 'ice-candidate' | 'chat' | 'name-announce' | 'photo-announce';

export interface RoomParticipantState {
  participantId: string;
  displayName: string;
  cameraEnabled: boolean;
  micEnabled: boolean;
  joinedAt: string;
  photo?: string | null;
}

export type ParticipantState = RoomParticipantState;

export interface RoomSnapshot {
  participants: RoomParticipantState[];
  hostPeerId?: string;
  locked: boolean;
  raisedHands: string[];
}

type ModerationKind = 'audio' | 'video' | 'both';
type WithoutRequestId<T> = T extends unknown ? Omit<T, 'requestId'> : never;

// Inbound event types from signaling server
export type InboundSignalingEvent =
  | { type: 'ack'; requestId?: string; ok: true; data?: unknown }
  | { type: 'error'; requestId?: string; code: string; message: string }
  | {
      type: 'room.participant-joined';
      roomId: string;
      participantId: string;
      connectionId: string;
      displayName?: string;
    }
  | {
      type: 'room.participant-left';
      roomId: string;
      participantId: string;
      connectionId: string;
      reason: 'leave' | 'disconnect' | 'timeout';
    }
  | {
      type: 'room.participant-state-updated';
      roomId: string;
      participantId: string;
      displayName: string;
      cameraEnabled: boolean;
      micEnabled: boolean;
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
  | { type: 'room.join-requested'; roomId: string; peerId: string; displayName: string }
  | { type: 'room.join-approved'; roomId: string }
  | { type: 'room.join-denied'; roomId: string }
  | { type: 'room.participant-kicked'; roomId: string; participantId: string }
  | { type: 'room.locked'; roomId: string; locked: boolean }
  | { type: 'room.host-transferred'; roomId: string; newHostPeerId: string; newHostDisplayName: string }
  | { type: 'room.participant-muted'; roomId: string; participantId: string; kind: 'audio' | 'video' | 'both' }
  | { type: 'room.unmute-requested'; roomId: string; kind: 'audio' | 'video' | 'both' }
  | { type: 'room.hand-raised'; roomId: string; participantId: string; displayName: string }
  | { type: 'room.hand-lowered'; roomId: string; participantId: string }
  | { type: 'producer.new'; roomId: string; peerId: string; producerId: string; kind: 'audio' | 'video' }
  | { type: 'producer.closed'; roomId: string; peerId: string; producerId: string }
  | { type: 'pong'; ts: number }
  | {
      type: 'session.ready';
      connectionId: string;
      participantId: string;
      recoveryToken: string;
    };

// Outbound event types to signaling server
export type OutboundSignalingEvent =
  | { type: 'room.join'; roomId: string; displayName?: string | undefined; micEnabled?: boolean | undefined; cameraEnabled?: boolean | undefined; password?: string | undefined; requestId?: string | undefined }
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
  | { type: 'ping'; ts?: number }
  | {
      type: 'participant.state-update';
      roomId: string;
      cameraEnabled?: boolean;
      micEnabled?: boolean;
      displayName?: string;
      requestId?: string;
    }
  | { type: 'room.request-join'; roomId: string; displayName?: string; requestId?: string }
  | { type: 'room.approve-join'; roomId: string; peerId: string; requestId?: string }
  | { type: 'room.deny-join'; roomId: string; peerId: string; requestId?: string }
  | { type: 'room.kick'; roomId: string; peerId: string; requestId?: string }
  | { type: 'room.lock'; roomId: string; locked: boolean; requestId?: string }
  | { type: 'room.transfer-host'; roomId: string; peerId: string; requestId?: string }
  | { type: 'room.force-mute'; roomId: string; peerId: string; kind: ModerationKind; requestId?: string }
  | { type: 'room.request-unmute'; roomId: string; peerId: string; kind: ModerationKind; requestId?: string }
  | { type: 'room.raise-hand'; roomId: string; requestId?: string }
  | { type: 'room.lower-hand'; roomId: string; peerId?: string; requestId?: string };

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
  'room.participant-joined': { roomId: string; participantId: string; connectionId: string; displayName?: string | undefined };
  'room.participant-left': { roomId: string; participantId: string; reason: string };
  'room.participant-state-updated': { roomId: string; participantId: string; displayName: string; cameraEnabled: boolean; micEnabled: boolean };
  'signal.received': {
    roomId: string;
    participantId: string;
    kind: 'offer' | 'answer' | 'ice-candidate';
    data: unknown;
  };
  'chat.received': { roomId: string; participantId: string } & ChatMessagePayload;
  'name.announce': { roomId: string; participantId: string; displayName: string };
  'photo.announce': { roomId: string; participantId: string; photo: string | null };
  'room.join-requested': { roomId: string; peerId: string; displayName: string };
  'room.join-approved': { roomId: string };
  'room.join-denied': { roomId: string };
  'room.participant-kicked': { roomId: string; participantId: string };
  'room.locked': { roomId: string; locked: boolean };
  'room.host-transferred': { roomId: string; newHostPeerId: string; newHostDisplayName: string };
  'room.participant-muted': { roomId: string; participantId: string; kind: 'audio' | 'video' | 'both' };
  'room.unmute-requested': { roomId: string; kind: 'audio' | 'video' | 'both' };
  'room.hand-raised': { roomId: string; participantId: string; displayName: string };
  'room.hand-lowered': { roomId: string; participantId: string };
  'producer.new': { roomId: string; peerId: string; producerId: string; kind: 'audio' | 'video' };
  'producer.closed': { roomId: string; peerId: string; producerId: string };
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
  private reconnectTimer: ReturnType<typeof setTimeout> | null = null;
  private pendingRequests = new Map<string, { resolve: (data: unknown) => void; reject: (error: Error) => void; timeout: ReturnType<typeof setTimeout> }>();
  private requestIdCounter = 0;

  private clearReconnectTimer(): void {
    if (this.reconnectTimer !== null) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }
  }

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
          this.clearReconnectTimer();
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
    this.clearReconnectTimer();

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

  async joinRoom(
    roomId: string,
    displayName?: string,
    initialState?: { micEnabled?: boolean; cameraEnabled?: boolean },
    password?: string,
  ): Promise<RoomSnapshot> {
    const requestId = this.generateRequestId();
    const message: OutboundSignalingEvent = {
      type: 'room.join',
      roomId,
      displayName,
      ...(initialState?.micEnabled !== undefined ? { micEnabled: initialState.micEnabled } : {}),
      ...(initialState?.cameraEnabled !== undefined ? { cameraEnabled: initialState.cameraEnabled } : {}),
      ...(password !== undefined ? { password } : {}),
      requestId,
    };
    await this.sendMessage(message);

    return new Promise((resolve, reject) => {
      const timeout = setTimeout(() => {
        this.pendingRequests.delete(requestId);
        reject(new Error(`Room join request timed out for room ${roomId}`));
      }, 5000);

      this.pendingRequests.set(requestId, {
        resolve: (data: unknown) => {
          this.emitter.emit('room.joined', { roomId });
          const ackData = data as Partial<RoomSnapshot> | undefined;
          resolve({
            participants: ackData?.participants ?? [],
            ...(ackData?.hostPeerId !== undefined ? { hostPeerId: ackData.hostPeerId } : {}),
            locked: ackData?.locked ?? false,
            raisedHands: ackData?.raisedHands ?? [],
          });
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

  async sendParticipantStateUpdate(
    roomId: string,
    patch: { cameraEnabled?: boolean; micEnabled?: boolean; displayName?: string },
  ): Promise<void> {
    const requestId = this.generateRequestId();
    const message: OutboundSignalingEvent = {
      type: 'participant.state-update',
      roomId,
      ...patch,
      requestId,
    };
    await this.sendMessage(message);

    return new Promise((resolve, reject) => {
      const timeout = setTimeout(() => {
        this.pendingRequests.delete(requestId);
        resolve(); // non-critical, don't reject
      }, 3000);

      this.pendingRequests.set(requestId, {
        resolve: () => { clearTimeout(timeout); resolve(); },
        reject,
        timeout,
      });
    });
  }

  async requestJoin(roomId: string, displayName?: string): Promise<void> {
    await this.sendAcked({ type: 'room.request-join', roomId, ...(displayName !== undefined ? { displayName } : {}) });
  }

  async approveJoin(roomId: string, peerId: string): Promise<void> {
    await this.sendAcked({ type: 'room.approve-join', roomId, peerId });
  }

  async denyJoin(roomId: string, peerId: string): Promise<void> {
    await this.sendAcked({ type: 'room.deny-join', roomId, peerId });
  }

  async kickParticipant(roomId: string, peerId: string): Promise<void> {
    await this.sendAcked({ type: 'room.kick', roomId, peerId });
  }

  async lockRoom(roomId: string, locked: boolean): Promise<void> {
    await this.sendAcked({ type: 'room.lock', roomId, locked });
  }

  async transferHost(roomId: string, peerId: string): Promise<void> {
    await this.sendAcked({ type: 'room.transfer-host', roomId, peerId });
  }

  async forceMute(roomId: string, peerId: string, kind: ModerationKind): Promise<void> {
    await this.sendAcked({ type: 'room.force-mute', roomId, peerId, kind });
  }

  async requestUnmute(roomId: string, peerId: string, kind: ModerationKind): Promise<void> {
    await this.sendAcked({ type: 'room.request-unmute', roomId, peerId, kind });
  }

  async raiseHand(roomId: string): Promise<void> {
    await this.sendAcked({ type: 'room.raise-hand', roomId });
  }

  async lowerHand(roomId: string, peerId?: string): Promise<void> {
    await this.sendAcked({ type: 'room.lower-hand', roomId, ...(peerId !== undefined ? { peerId } : {}) });
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

  async sendPhotoAnnounce(roomId: string, photo: string | null): Promise<void> {
    const requestId = this.generateRequestId();
    const message: OutboundSignalingEvent = {
      type: 'signal.relay',
      roomId,
      payload: { kind: 'photo-announce', data: { photo } },
      requestId,
    };
    await this.sendMessage(message);
    return new Promise((resolve, reject) => {
      const timeout = setTimeout(() => {
        this.pendingRequests.delete(requestId);
        resolve(); // non-critical
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

  private async sendAcked(message: WithoutRequestId<OutboundSignalingEvent>, timeoutMs = 5000): Promise<void> {
    const requestId = this.generateRequestId();
    await this.sendMessage({ ...message, requestId } as OutboundSignalingEvent);

    return new Promise((resolve, reject) => {
      const timeout = setTimeout(() => {
        this.pendingRequests.delete(requestId);
        reject(new Error(`Signaling request timed out: ${message.type}`));
      }, timeoutMs);

      this.pendingRequests.set(requestId, {
        resolve: () => {
          clearTimeout(timeout);
          resolve();
        },
        reject,
        timeout,
      });
    });
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
          displayName: message.displayName,
        });
      } else if (message.type === 'room.participant-left') {
        this.emitter.emit('room.participant-left', {
          roomId: message.roomId,
          participantId: message.participantId,
          reason: message.reason,
        });
      } else if (message.type === 'room.participant-state-updated') {
        this.emitter.emit('room.participant-state-updated', {
          roomId: message.roomId,
          participantId: message.participantId,
          displayName: message.displayName,
          cameraEnabled: message.cameraEnabled,
          micEnabled: message.micEnabled,
        });
      } else if (message.type === 'room.join-requested') {
        this.emitter.emit('room.join-requested', { roomId: message.roomId, peerId: message.peerId, displayName: message.displayName });
      } else if (message.type === 'room.join-approved') {
        this.emitter.emit('room.join-approved', { roomId: message.roomId });
      } else if (message.type === 'room.join-denied') {
        this.emitter.emit('room.join-denied', { roomId: message.roomId });
      } else if (message.type === 'room.participant-kicked') {
        this.emitter.emit('room.participant-kicked', { roomId: message.roomId, participantId: message.participantId });
      } else if (message.type === 'room.locked') {
        this.emitter.emit('room.locked', { roomId: message.roomId, locked: message.locked });
      } else if (message.type === 'room.host-transferred') {
        this.emitter.emit('room.host-transferred', { roomId: message.roomId, newHostPeerId: message.newHostPeerId, newHostDisplayName: message.newHostDisplayName });
      } else if (message.type === 'room.participant-muted') {
        this.emitter.emit('room.participant-muted', { roomId: message.roomId, participantId: message.participantId, kind: message.kind });
      } else if (message.type === 'room.unmute-requested') {
        this.emitter.emit('room.unmute-requested', { roomId: message.roomId, kind: message.kind });
      } else if (message.type === 'room.hand-raised') {
        this.emitter.emit('room.hand-raised', { roomId: message.roomId, participantId: message.participantId, displayName: message.displayName });
      } else if (message.type === 'room.hand-lowered') {
        this.emitter.emit('room.hand-lowered', { roomId: message.roomId, participantId: message.participantId });
      } else if (message.type === 'producer.new') {
        this.emitter.emit('producer.new', {
          roomId: message.roomId,
          peerId: message.peerId,
          producerId: message.producerId,
          kind: message.kind,
        });
      } else if (message.type === 'producer.closed') {
        this.emitter.emit('producer.closed', {
          roomId: message.roomId,
          peerId: message.peerId,
          producerId: message.producerId,
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
        } else if (message.payload.kind === 'photo-announce') {
          const payload = message.payload.data as { photo: string | null };
          this.emitter.emit('photo.announce', {
            roomId: message.roomId,
            participantId: message.participantId,
            photo: payload.photo,
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

    // Avoid stacking multiple reconnect timers from the same disconnect event.
    if (this.reconnectTimer !== null) {
      return;
    }

    // Connected sockets never need a reconnect timer.
    if (this.isConnected()) {
      return;
    }

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
      this.reconnectTimer = null;

      // Stale timer: connection may already be back, do not re-emit recovery events.
      if (this.isConnected()) {
        this.reconnectAttempt = 0;
        return;
      }

      try {
        await this.connect();
        if (this.isConnected()) {
          this.emitter.emit('reconnect.succeeded', { attempt: this.reconnectAttempt });
        }
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
