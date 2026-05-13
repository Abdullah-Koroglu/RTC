import type { SignalingMessage } from '@/events/types';

export interface SignalingTransport {
  connect(): Promise<void>;
  disconnect(reason?: string): Promise<void>;
  send(message: SignalingMessage): Promise<void>;
  onMessage(handler: (message: SignalingMessage) => void): () => void;
  onOpen(handler: () => void): () => void;
  onClose(handler: (reason?: string) => void): () => void;
  isConnected(): boolean;
}
