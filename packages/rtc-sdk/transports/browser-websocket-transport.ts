import type { SignalingMessage } from '@/events/types';
import { TypedEventEmitter } from '@/events/event-emitter';
import type { SignalingTransport } from '@/transports/types';

type TransportEvents = {
  message: SignalingMessage;
  open: Record<string, never>;
  close: { reason?: string };
};

export interface BrowserWebSocketTransportOptions {
  url: string;
  protocols?: string | string[];
}

export class BrowserWebSocketTransport implements SignalingTransport {
  private socket: WebSocket | null = null;
  private readonly emitter = new TypedEventEmitter<TransportEvents>();

  constructor(private readonly options: BrowserWebSocketTransportOptions) {}

  async connect(): Promise<void> {
    if (this.socket && (this.socket.readyState === WebSocket.OPEN || this.socket.readyState === WebSocket.CONNECTING)) {
      return;
    }

    await new Promise<void>((resolve, reject) => {
      const socket = new WebSocket(this.options.url, this.options.protocols);
      this.socket = socket;

      socket.onopen = () => {
        this.emitter.emit('open', {});
        resolve();
      };

      socket.onmessage = (event) => {
        try {
          const parsed = JSON.parse(event.data) as SignalingMessage;
          this.emitter.emit('message', parsed);
        } catch {
          // no-op for malformed payloads
        }
      };

      socket.onclose = (event) => {
        this.emitter.emit('close', { reason: event.reason || undefined });
      };

      socket.onerror = () => {
        reject(new Error('WebSocket connection error'));
      };
    });
  }

  async disconnect(reason?: string): Promise<void> {
    if (!this.socket) {
      return;
    }

    if (this.socket.readyState === WebSocket.OPEN || this.socket.readyState === WebSocket.CONNECTING) {
      this.socket.close(1000, reason);
    }

    this.socket = null;
  }

  async send(message: SignalingMessage): Promise<void> {
    if (!this.socket || this.socket.readyState !== WebSocket.OPEN) {
      throw new Error('WebSocket transport is not connected');
    }

    this.socket.send(JSON.stringify(message));
  }

  onMessage(handler: (message: SignalingMessage) => void): () => void {
    return this.emitter.on('message', handler);
  }

  onOpen(handler: () => void): () => void {
    return this.emitter.on('open', handler);
  }

  onClose(handler: (reason?: string) => void): () => void {
    return this.emitter.on('close', ({ reason }) => handler(reason));
  }

  isConnected(): boolean {
    return this.socket?.readyState === WebSocket.OPEN;
  }
}
