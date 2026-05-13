'use client';

import { useEffect, useRef, useState, useCallback } from 'react';
import type { SignalingClient } from '@repo/rtc-sdk';
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
  joinRoom: (roomId: string) => Promise<void>;
  leaveRoom: (roomId: string) => Promise<void>;
  relaySignal: (
    roomId: string,
    kind: 'offer' | 'answer' | 'ice-candidate',
    data: unknown,
    targetParticipantId?: string,
  ) => Promise<void>;
  ping: () => Promise<number>;
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

      const existingClient = getSignalingClient();
      if (existingClient?.isConnected()) {
        setClient(existingClient);
        setIsConnected(true);
        return;
      }

      const newClient = await initializeSignalingClient({
        participantId: options.participantId,
        ...(options.reconnect && { reconnect: options.reconnect }),
      });

      setClient(newClient);
      setIsConnected(true);

      // Set up event listeners
      const unsubs: (() => void)[] = [];

      unsubs.push(
        newClient.on('signaling.disconnected', ({ reason }) => {
          setIsConnected(false);
          console.info('Signaling disconnected:', reason);
        }),
      );

      unsubs.push(
        newClient.on('error', ({ error: err }) => {
          setError(err);
          console.error('Signaling error:', err);
        }),
      );

      unsubs.push(
        newClient.on('reconnect.scheduled', ({ delayMs, attempt }) => {
          console.info(`Reconnection attempt ${attempt} scheduled in ${delayMs}ms`);
        }),
      );

      unsubs.push(
        newClient.on('reconnect.succeeded', ({ attempt }) => {
          setIsConnected(true);
          console.info(`Reconnection succeeded after ${attempt} attempts`);
        }),
      );

      // Store unsubs for cleanup
      unsubsRef.current = unsubs;
    } catch (err) {
      const error = err instanceof Error ? err : new Error('Failed to connect to signaling');
      setError(error);
      setIsConnected(false);
      console.error('Signaling connection error:', error);
    } finally {
      setIsConnecting(false);
    }
  }, [options.participantId, options.reconnect]);

  const disconnect = useCallback(async (reason?: string) => {
    unsubsRef.current.forEach((unsub) => unsub());
    unsubsRef.current = [];
    await disconnectSignalingClient(reason);
    setClient(null);
    setIsConnected(false);
  }, []);

  const joinRoom = useCallback(
    async (roomId: string) => {
      if (!client) {
        throw new Error('Signaling client not connected');
      }
      await client.joinRoom(roomId);
    },
    [client],
  );

  const leaveRoom = useCallback(
    async (roomId: string) => {
      if (!client) {
        throw new Error('Signaling client not connected');
      }
      await client.leaveRoom(roomId);
    },
    [client],
  );

  const relaySignal = useCallback(
    async (
      roomId: string,
      kind: 'offer' | 'answer' | 'ice-candidate',
      data: unknown,
      targetParticipantId?: string,
    ) => {
      if (!client) {
        throw new Error('Signaling client not connected');
      }
      await client.relaySignal(roomId, kind, data, targetParticipantId);
    },
    [client],
  );

  const ping = useCallback(async (): Promise<number> => {
    if (!client) {
      throw new Error('Signaling client not connected');
    }
    return client.ping();
  }, [client]);

  // Auto-connect on mount if enabled
  useEffect(() => {
    if (!initRef.current && options.autoConnect !== false) {
      initRef.current = true;
      void connect();
    }

    return () => {
      // Cleanup on unmount if needed
      // Note: We don't auto-disconnect to allow cross-component usage
    };
  }, [options.autoConnect, connect]);

  return {
    client,
    isConnected,
    isConnecting,
    error,
    connect,
    disconnect,
    joinRoom,
    leaveRoom,
    relaySignal,
    ping,
  };
}
