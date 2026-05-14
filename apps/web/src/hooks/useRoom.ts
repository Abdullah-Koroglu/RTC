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
  const remoteStreamsRef = useRef<Map<string, MediaStream>>(new Map());
  const remoteProducersRef = useRef<Map<string, string>>(new Map());
  const remoteConsumersRef = useRef<Map<string, string>>(new Map());
  const producerOwnerRef = useRef<Map<string, string>>(new Map());
  const subscribedProducerIdsRef = useRef<Set<string>>(new Set());
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
        apiBaseUrl: env.NEXT_PUBLIC_API_URL,
        roomId,
        peerId,
      });

      await mediaClient.initialize();
      await mediaClient.createTransports();
      mediaClientRef.current = mediaClient;
    } catch (err) {
      console.error('Failed to initialize mediasoup in room hook', {
        roomId,
        peerId,
        mediasoupUrl: env.NEXT_PUBLIC_MEDIASOUP_URL,
        error: err,
      });
      const error = err instanceof Error ? err : new Error('Failed to initialize mediasoup');
      setError(error);
      throw error;
    }
  }, [roomId, peerId, env.NEXT_PUBLIC_API_URL, env.NEXT_PUBLIC_MEDIASOUP_URL]);

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
      console.error('Failed to join room', {
        roomId,
        peerId,
        isSignalingConnected,
        error: err,
      });
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

      remoteStreamsRef.current.forEach((stream) => {
        stream.getTracks().forEach((track) => track.stop());
      });
      remoteStreamsRef.current.clear();
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
      producerOwnerRef.current.clear();
      subscribedProducerIdsRef.current.clear();
      setRoomState('idle');
    } catch (err) {
      console.error('Error leaving room:', err);
      setRoomState('idle');
    }
  }, [localStream, signalingClient, roomId]);

  const syncRemoteProducers = useCallback(async () => {
    if (!mediaClientRef.current || roomState !== 'joined') {
      return;
    }

    let producers;
    try {
      producers = await mediaClientRef.current.listRemoteProducers();
      console.info('[useRoom] syncRemoteProducers result', { roomId, peerId, producers });
    } catch (err) {
      console.error('Remote producer discovery failed', {
        roomId,
        peerId,
        error: err,
      });
      throw err;
    }

    for (const producer of producers) {
      if (producer.peerId === peerId || subscribedProducerIdsRef.current.has(producer.producerId)) {
        continue;
      }

      subscribedProducerIdsRef.current.add(producer.producerId);

      let stream: MediaStream;
      try {
        stream = await mediaClientRef.current.subscribeMedia(producer.producerId, producer.peerId);
        console.info('[useRoom] subscribeMedia returned', { peerId: producer.peerId, tracks: stream.getTracks().map(t => t.kind) });
      } catch (err) {
        subscribedProducerIdsRef.current.delete(producer.producerId);
        console.error('Remote producer subscription failed', {
          roomId,
          peerId,
          remotePeerId: producer.peerId,
          producerId: producer.producerId,
          error: err,
        });
        continue;
      }

      const target = remoteStreamsRef.current.get(producer.peerId) ?? new MediaStream();

      for (const track of stream.getTracks()) {
        if (!target.getTracks().some((existingTrack) => existingTrack.id === track.id)) {
          target.addTrack(track);
        }
      }

      remoteStreamsRef.current.set(producer.peerId, target);
      setRemoteStreams(new Map(remoteStreamsRef.current));
      console.info('[useRoom] setRemoteStreams updated', { peerId: producer.peerId, trackCount: target.getTracks().length, mapSize: remoteStreamsRef.current.size });

      producerOwnerRef.current.set(producer.producerId, producer.peerId);
    }
  }, [peerId, roomState]);

  const publishMedia = useCallback(
    async (constraints: MediaStreamConstraints = { audio: true, video: true }): Promise<MediaStream | null> => {
      try {
        if (!mediaClientRef.current) {
          throw new Error('Mediasoup client not initialized');
        }

        const stream = await mediaClientRef.current.publishMedia(constraints);
        setLocalStream(stream);
        await syncRemoteProducers();
        return stream;
      } catch (err) {
        console.error('Failed to publish local media', {
          roomId,
          peerId,
          constraints,
          error: err,
        });
        const error = err instanceof Error ? err : new Error('Failed to publish media');
        setError(error);
        return null;
      }
    },
    [syncRemoteProducers],
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
          void syncRemoteProducers().catch((err) => {
            const errorMessage = err instanceof Error ? err.message : String(err);
            console.error('Failed to sync remote producers after participant joined', {
              roomId,
              peerId,
              remotePeerId,
              error: errorMessage,
            });
            const error = err instanceof Error ? err : new Error('Failed to sync remote producers');
            setError(error);
          });
        }
      }),
    );

    listeners.push(
      signalingClient.on('room.participant-left', ({ participantId: remotePeerId }) => {
        if (remotePeerId !== peerId) {
          const stream = remoteStreamsRef.current.get(remotePeerId);
          if (stream) {
            stream.getTracks().forEach((track) => track.stop());
            remoteStreamsRef.current.delete(remotePeerId);
            setRemoteStreams(new Map(remoteStreamsRef.current));
          }

          remoteProducersRef.current.delete(remotePeerId);
          const consumersToRemove: string[] = [];
          remoteConsumersRef.current.forEach((pid, consumerId) => {
            if (pid === remotePeerId) {
              consumersToRemove.push(consumerId);
            }
          });
          consumersToRemove.forEach((cid) => remoteConsumersRef.current.delete(cid));

          const producerIdsToDelete: string[] = [];
          producerOwnerRef.current.forEach((ownerPeerId, producerId) => {
            if (ownerPeerId === remotePeerId) {
              producerIdsToDelete.push(producerId);
            }
          });

          producerIdsToDelete.forEach((producerId) => {
            producerOwnerRef.current.delete(producerId);
            subscribedProducerIdsRef.current.delete(producerId);
          });
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
    if (roomState !== 'joined') {
      return;
    }

    const runSync = () => {
      void syncRemoteProducers().catch((err) => {
        const errorMessage = err instanceof Error ? err.message : String(err);
        console.error('Periodic remote producer sync failed', {
          roomId,
          peerId,
          error: errorMessage,
        });
        const error = err instanceof Error ? err : new Error('Failed to sync remote producers');
        setError(error);
      });
    };

    runSync();
    const intervalId = setInterval(runSync, 1500);

    return () => {
      clearInterval(intervalId);
    };
  }, [roomState, syncRemoteProducers]);

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
