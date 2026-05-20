import { useEffect, useRef, useState, useCallback } from 'react';
import type { SignalingClient } from '@repo/rtc-sdk/signaling-client';
import { initializeSignalingClient, getSignalingClient, disconnectSignalingClient } from '@/lib/signaling';

export interface UseSignalingOptions {
  participantId: string;
  autoConnect?: boolean;
  reconnect?: {
    maxAttempts: number;
    baseDelayMs: number;
    maxDelayMs: number;
  };
}

export interface UseSignalingReturn {
  client: SignalingClient | null;
  isConnected: boolean;
  isConnecting: boolean;
  error: Error | null;
  connect: () => Promise<void>;
  disconnect: (reason?: string) => Promise<void>;
}

export function useSignaling(options: UseSignalingOptions): UseSignalingReturn {
  const [client, setClient] = useState<SignalingClient | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [isConnecting, setIsConnecting] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const initRef = useRef(false);
  const unsubsRef = useRef<(() => void)[]>([]);

  const connect = useCallback(async () => {
    try {
      setIsConnecting(true);
      setError(null);

      const existing = getSignalingClient();
      if (existing?.isConnected()) {
        setClient(existing);
        setIsConnected(true);
        return;
      }

      const newClient = await initializeSignalingClient({
        participantId: options.participantId,
        ...(options.reconnect && { reconnect: options.reconnect }),
      });

      setClient(newClient);
      setIsConnected(true);

      const unsubs: (() => void)[] = [];

      unsubs.push(
        newClient.on('signaling.disconnected', () => {
          setIsConnected(false);
        }),
      );

      unsubs.push(
        newClient.on('reconnect.succeeded', () => {
          setIsConnected(true);
        }),
      );

      unsubs.push(
        newClient.on('error', ({ error: err }: { error: Error }) => {
          setError(err);
        }),
      );

      unsubsRef.current = unsubs;
    } catch (err) {
      const e = err instanceof Error ? err : new Error('Failed to connect to signaling');
      setError(e);
      setIsConnected(false);
    } finally {
      setIsConnecting(false);
    }
  }, [options.participantId, options.reconnect]);

  const disconnect = useCallback(async (reason?: string) => {
    unsubsRef.current.forEach((u) => u());
    unsubsRef.current = [];
    await disconnectSignalingClient(reason);
    setClient(null);
    setIsConnected(false);
  }, []);

  useEffect(() => {
    if (!initRef.current && options.autoConnect !== false) {
      initRef.current = true;
      void connect();
    }
  }, [options.autoConnect, connect]);

  return { client, isConnected, isConnecting, error, connect, disconnect };
}
