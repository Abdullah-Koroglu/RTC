'use client';

import { useEffect, useRef, useState, useCallback } from 'react';
import { MediasoupClient } from '@repo/rtc-sdk';
import { useSignaling } from './useSignaling';
import { getClientEnv } from '@/lib/env';

export type RoomState = 'idle' | 'joining' | 'joined' | 'error';

export interface UseRoomOptions {
  roomId: string;
  peerId: string;
  autoJoin?: boolean;
}

export interface UseRoomReturn {
  roomState: RoomState;
  error: Error | null;
  localStream: MediaStream | null;
  remoteStreams: Map<string, MediaStream>;
  joinRoom: () => Promise<void>;
  leaveRoom: () => Promise<void>;
  publishMedia: (constraints?: MediaStreamConstraints) => Promise<MediaStream | null>;
  unpublishMedia: (kind: 'audio' | 'video') => void;
  setAudioEnabled: (enabled: boolean) => void;
  setVideoEnabled: (enabled: boolean) => void;
}

/**
 * Hook to manage a WebRTC room with mediasoup transport and signaling
 * 
 * Coordinates:
 * - SignalingClient for peer discovery and ICE candidates
 * - MediasoupClient for producing/consuming media streams
 * - Local and remote media stream management
 */
export function useRoom(options: UseRoomOptions): UseRoomReturn {
  const env = getClientEnv();
  const { roomId, peerId, autoJoin = true } = options;

  const [roomState, setRoomState] = useState<RoomState>('idle');
  const [error, setError] = useState<Error | null>(null);
  const [localStream, setLocalStream] = useState<MediaStream | null>(null);
  const [remoteStreams, setRemoteStreams] = useState<Map<string, MediaStream>>(new Map());

  const mediaClientRef = useRef<MediasoupClient | null>(null);
  const remoteProducersRef = useRef<Map<string, string>>(new Map());
  const remoteConsumersRef = useRef<Map<string, string>>(new Map());
  const initRef = useRef(false);

  const signalingOptions = {
    participantId: peerId,
    autoConnect: true,
    reconnect: {
      maxAttempts: 5,
      baseDelayMs: 1000,
      maxDelayMs: 10000,
    },
  };

  const { client: signalingClient, isConnected: isSignalingConnected } = useSignaling(signalingOptions);

  const initializeMediasoup = useCallback(async () => {
    if (mediaClientRef.current) {
      return;
    }

    try {
      const mediaClient = new MediasoupClient({
        baseUrl: env.NEXT_PUBLIC_MEDIASOUP_URL,
        roomId,
        peerId,
      });

      await mediaClient.initialize();
      await mediaClient.createTransports();
      mediaClientRef.current = mediaClient;
    } catch (err) {
      const error = err instanceof Error ? err : new Error('Failed to initialize mediasoup');
      setError(error);
      throw error;
    }
  }, [roomId, peerId, env.NEXT_PUBLIC_MEDIASOUP_URL]);

  const joinRoom = useCallback(async () => {
    try {
      setRoomState('joining');
      setError(null);

      if (!signalingClient || !isSignalingConnected) {
        throw new Error('Signaling client not connected');
      }

      await initializeMediasoup();
      await signalingClient.joinRoom(roomId);
      setRoomState('joined');
    } catch (err) {
      const error = err instanceof Error ? err : new Error('Failed to join room');
      setError(error);
      setRoomState('error');
      throw error;
    }
  }, [isSignalingConnected, initializeMediasoup, signalingClient, roomId]);

  const leaveRoom = useCallback(async () => {
    try {
      if (signalingClient) {
        await signalingClient.leaveRoom(roomId);
      }

      remoteStreams.forEach((stream) => {
        stream.getTracks().forEach((track) => track.stop());
      });
      setRemoteStreams(new Map());

      if (mediaClientRef.current) {
        await mediaClientRef.current.close();
        mediaClientRef.current = null;
      }

      if (localStream) {
        localStream.getTracks().forEach((track) => track.stop());
        setLocalStream(null);
      }

      remoteProducersRef.current.clear();
      remoteConsumersRef.current.clear();
      setRoomState('idle');
    } catch (err) {
      console.error('Error leaving room:', err);
      setRoomState('idle');
    }
  }, [remoteStreams, localStream, signalingClient, roomId]);

  const publishMedia = useCallback(
    async (constraints: MediaStreamConstraints = { audio: true, video: true }): Promise<MediaStream | null> => {
      try {
        if (!mediaClientRef.current) {
          throw new Error('Mediasoup client not initialized');
        }

        const stream = await mediaClientRef.current.publishMedia(constraints);
        setLocalStream(stream);
        return stream;
      } catch (err) {
        const error = err instanceof Error ? err : new Error('Failed to publish media');
        setError(error);
        return null;
      }
    },
    [],
  );

  const unpublishMedia = useCallback((kind: 'audio' | 'video') => {
    try {
      if (mediaClientRef.current) {
        mediaClientRef.current.unpublishMedia(kind);
      }
    } catch (err) {
      const error = err instanceof Error ? err : new Error(`Failed to unpublish ${kind}`);
      setError(error);
    }
  }, []);

  const setAudioEnabled = useCallback((enabled: boolean) => {
    try {
      if (mediaClientRef.current) {
        mediaClientRef.current.setAudioEnabled(enabled);
      }
    } catch (err) {
      const error = err instanceof Error ? err : new Error('Failed to toggle audio');
      setError(error);
    }
  }, []);

  const setVideoEnabled = useCallback((enabled: boolean) => {
    try {
      if (mediaClientRef.current) {
        mediaClientRef.current.setVideoEnabled(enabled);
      }
    } catch (err) {
      const error = err instanceof Error ? err : new Error('Failed to toggle video');
      setError(error);
    }
  }, []);

  useEffect(() => {
    if (!signalingClient || roomState !== 'joined') {
      return;
    }

    const listeners: (() => void)[] = [];

    listeners.push(
      signalingClient.on('room.participant-joined', ({ participantId: remotePeerId }) => {
        if (remotePeerId !== peerId) {
          remoteProducersRef.current.set(remotePeerId, '');
        }
      }),
    );

    listeners.push(
      signalingClient.on('room.participant-left', ({ participantId: remotePeerId }) => {
        if (remotePeerId !== peerId) {
          setRemoteStreams((prev) => {
            const updated = new Map(prev);
            const stream = updated.get(remotePeerId);
            if (stream) {
              stream.getTracks().forEach((track) => track.stop());
              updated.delete(remotePeerId);
            }
            return updated;
          });

          remoteProducersRef.current.delete(remotePeerId);
          const consumersToRemove: string[] = [];
          remoteConsumersRef.current.forEach((pid, consumerId) => {
            if (pid === remotePeerId) {
              consumersToRemove.push(consumerId);
            }
          });
          consumersToRemove.forEach((cid) => remoteConsumersRef.current.delete(cid));
        }
      }),
    );

    listeners.push(
      signalingClient.on('signal.received', ({ participantId: remotePeerId, kind, data }) => {
        if (remotePeerId !== peerId) {
          console.info(`Received ${kind} from ${remotePeerId}:`, data);
        }
      }),
    );

    return () => {
      listeners.forEach((unsub) => unsub());
    };
  }, [signalingClient, roomState, peerId]);

  useEffect(() => {
    if (autoJoin && isSignalingConnected && !initRef.current && roomState === 'idle') {
      initRef.current = true;
      void joinRoom();
    }
  }, [autoJoin, isSignalingConnected, roomState, joinRoom]);

  return {
    roomState,
    error,
    localStream,
    remoteStreams,
    joinRoom,
    leaveRoom,
    publishMedia,
    unpublishMedia,
    setAudioEnabled,
    setVideoEnabled,
  };
}
