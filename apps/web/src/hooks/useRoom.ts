'use client';

import { useEffect, useRef, useState, useCallback } from 'react';
import { MediasoupClient } from '@repo/rtc-sdk';
import { useSignaling } from './useSignaling';
import { getClientEnv } from '@/lib/env';

export type RoomState = 'idle' | 'joining' | 'joined' | 'error';

export interface ChatMessage {
  id: string;
  peerId: string;
  text: string;
  ts: number;
  isSelf: boolean;
}

export interface UseRoomOptions {
  roomId: string;
  peerId: string;
  displayName?: string;
  autoJoin?: boolean;
}

export interface UseRoomReturn {
  roomState: RoomState;
  error: Error | null;
  localStream: MediaStream | null;
  remoteStreams: Map<string, MediaStream>;
  chatMessages: ChatMessage[];
  screenStream: MediaStream | null;
  isScreenSharing: boolean;
  peerNames: Map<string, string>;
  joinRoom: () => Promise<void>;
  leaveRoom: () => Promise<void>;
  publishMedia: (constraints?: MediaStreamConstraints) => Promise<MediaStream | null>;
  unpublishMedia: (kind: 'audio' | 'video') => void;
  setAudioEnabled: (enabled: boolean) => void;
  setVideoEnabled: (enabled: boolean) => void;
  startScreenShare: () => Promise<MediaStream | null>;
  stopScreenShare: () => void;
  sendChatMessage: (text: string) => void;
}

/**
 * Hook to manage a WebRTC room with mediasoup transport and signaling.
 *
 * Remote stream keys:
 *   "{peerId}"        → camera/mic stream
 *   "{peerId}:screen" → screen share stream
 */
export function useRoom(options: UseRoomOptions): UseRoomReturn {
  const env = getClientEnv();
  const { roomId, peerId, displayName, autoJoin = true } = options;

  const [roomState, setRoomState] = useState<RoomState>('idle');
  const [error, setError] = useState<Error | null>(null);
  const [localStream, setLocalStream] = useState<MediaStream | null>(null);
  const [remoteStreams, setRemoteStreams] = useState<Map<string, MediaStream>>(new Map());
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [screenStream, setScreenStream] = useState<MediaStream | null>(null);
  const [isScreenSharing, setIsScreenSharing] = useState(false);
  const [peerNames, setPeerNames] = useState<Map<string, string>>(new Map());

  const mediaClientRef = useRef<MediasoupClient | null>(null);
  // producerId → peerId
  const producerOwnerRef = useRef<Map<string, string>>(new Map());
  // producerIds that have been subscribed — intentionally NOT cleared on participant-left
  // (prevents re-subscription to still-alive producers of a departed peer)
  const subscribedProducerIdsRef = useRef<Set<string>>(new Set());
  // producerId → streamKey for screen producers (cleared when gone so re-share works)
  const screenProducerKeysRef = useRef<Map<string, string>>(new Map());
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
    if (mediaClientRef.current) return;

    const mediaClient = new MediasoupClient({
      baseUrl: env.NEXT_PUBLIC_MEDIASOUP_URL,
      apiBaseUrl: env.NEXT_PUBLIC_API_URL,
      roomId,
      peerId,
    });

    await mediaClient.initialize();
    await mediaClient.createTransports();
    mediaClientRef.current = mediaClient;
  }, [roomId, peerId, env.NEXT_PUBLIC_MEDIASOUP_URL]);

  const joinRoom = useCallback(async () => {
    try {
      setRoomState('joining');
      setError(null);

      if (!signalingClient || !isSignalingConnected) {
        throw new Error('Signaling client not connected');
      }

      await initializeMediasoup();
      // joinRoom returns the current peer names map from the signaling server
      const initialPeerNames = await signalingClient.joinRoom(roomId, displayName ?? peerId);
      setPeerNames(new Map(Object.entries(initialPeerNames)));
      setRoomState('joined');
    } catch (err) {
      const joinError = err instanceof Error ? err : new Error('Failed to join room');
      setError(joinError);
      setRoomState('error');
      throw joinError;
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

      if (screenStream) {
        screenStream.getTracks().forEach((track) => track.stop());
        setScreenStream(null);
      }

      producerOwnerRef.current.clear();
      subscribedProducerIdsRef.current.clear();
      screenProducerKeysRef.current.clear();
      setChatMessages([]);
      setIsScreenSharing(false);
      setRoomState('idle');
    } catch (err) {
      console.error('Error leaving room:', err);
      setRoomState('idle');
    }
  }, [remoteStreams, localStream, screenStream, signalingClient, roomId]);

  const syncRemoteProducers = useCallback(async () => {
    if (!mediaClientRef.current || roomState !== 'joined') return;

    let producers;
    try {
      producers = await mediaClientRef.current.listRemoteProducers();
    } catch (err) {
      console.error('Remote producer discovery failed', { roomId, peerId, error: err });
      throw err;
    }

    // --- Screen share cleanup ---
    // For screen producers, unlike camera/mic, we DO want to clean up when the
    // producer disappears (peer stopped sharing). Camera/mic producers stay in
    // subscribedProducerIdsRef to prevent ghost re-subscription after disconnect;
    // screen producers are removed so the peer can share again later.
    const liveProducerIds = new Set(producers.map((p) => p.producerId));
    for (const [screenProducerId, streamKey] of screenProducerKeysRef.current) {
      if (!liveProducerIds.has(screenProducerId)) {
        setRemoteStreams((prev) => {
          const updated = new Map(prev);
          const gone = updated.get(streamKey);
          if (gone) {
            gone.getTracks().forEach((t) => t.stop());
            updated.delete(streamKey);
          }
          return updated;
        });
        subscribedProducerIdsRef.current.delete(screenProducerId);
        producerOwnerRef.current.delete(screenProducerId);
        screenProducerKeysRef.current.delete(screenProducerId);
      }
    }

    for (const producer of producers) {
      if (producer.peerId === peerId || subscribedProducerIdsRef.current.has(producer.producerId)) {
        continue;
      }

      let stream: MediaStream;
      try {
        stream = await mediaClientRef.current.subscribeMedia(producer.producerId, producer.peerId);
      } catch (err) {
        console.error('Remote producer subscription failed', {
          roomId,
          peerId,
          remotePeerId: producer.peerId,
          producerId: producer.producerId,
          error: err,
        });
        continue;
      }

      const isScreen = producer.appData?.mediaTag === 'screen';
      const streamKey = isScreen ? `${producer.peerId}:screen` : producer.peerId;

      setRemoteStreams((prev) => {
        const updated = new Map(prev);
        const target = updated.get(streamKey) ?? new MediaStream();
        for (const track of stream.getTracks()) {
          if (!target.getTracks().some((existingTrack) => existingTrack.id === track.id)) {
            target.addTrack(track);
          }
        }
        updated.set(streamKey, target);
        return updated;
      });

      producerOwnerRef.current.set(producer.producerId, producer.peerId);
      subscribedProducerIdsRef.current.add(producer.producerId);

      // Track screen producers separately so we can clean them up when they stop
      if (isScreen) {
        screenProducerKeysRef.current.set(producer.producerId, streamKey);
      }
    }
  }, [peerId, roomState]);

  const publishMedia = useCallback(
    async (constraints: MediaStreamConstraints = { audio: true, video: true }): Promise<MediaStream | null> => {
      try {
        if (!mediaClientRef.current) throw new Error('Mediasoup client not initialized');
        const stream = await mediaClientRef.current.publishMedia(constraints);
        setLocalStream(stream);
        await syncRemoteProducers();
        return stream;
      } catch (err) {
        console.error('Failed to publish local media', { roomId, peerId, error: err });
        setError(err instanceof Error ? err : new Error('Failed to publish media'));
        return null;
      }
    },
    [syncRemoteProducers],
  );

  const unpublishMedia = useCallback((kind: 'audio' | 'video') => {
    try {
      mediaClientRef.current?.unpublishMedia(kind);
    } catch (err) {
      setError(err instanceof Error ? err : new Error(`Failed to unpublish ${kind}`));
    }
  }, []);

  const setAudioEnabled = useCallback((enabled: boolean) => {
    try {
      mediaClientRef.current?.setAudioEnabled(enabled);
    } catch (err) {
      setError(err instanceof Error ? err : new Error('Failed to toggle audio'));
    }
  }, []);

  const setVideoEnabled = useCallback((enabled: boolean) => {
    try {
      mediaClientRef.current?.setVideoEnabled(enabled);
    } catch (err) {
      setError(err instanceof Error ? err : new Error('Failed to toggle video'));
    }
  }, []);

  const startScreenShare = useCallback(async (): Promise<MediaStream | null> => {
    try {
      if (!mediaClientRef.current) throw new Error('Mediasoup client not initialized');
      const stream = await mediaClientRef.current.startScreenShare();
      setScreenStream(stream);
      setIsScreenSharing(true);
      return stream;
    } catch (err) {
      if ((err as Error).name === 'NotAllowedError') return null; // user cancelled
      console.error('Screen share failed', { roomId, peerId, error: err });
      setError(err instanceof Error ? err : new Error('Failed to start screen share'));
      return null;
    }
  }, [roomId, peerId]);

  const stopScreenShare = useCallback(() => {
    try {
      mediaClientRef.current?.stopScreenShare();
    } catch {
      // ignore
    }
    if (screenStream) {
      screenStream.getTracks().forEach((t) => t.stop());
      setScreenStream(null);
    }
    setIsScreenSharing(false);
  }, [screenStream]);

  const sendChatMessage = useCallback(
    (text: string) => {
      if (!signalingClient || !text.trim()) return;

      setChatMessages((prev) => [
        ...prev,
        { id: `self-${Date.now()}`, peerId, text: text.trim(), ts: Date.now(), isSelf: true },
      ]);

      void signalingClient.sendChatMessage(roomId, text.trim(), displayName ?? peerId).catch((err) => {
        console.error('Failed to send chat message', err);
      });
    },
    [signalingClient, roomId, peerId],
  );

  // Signaling event listeners
  useEffect(() => {
    if (!signalingClient || roomState !== 'joined') return;

    const listeners: (() => void)[] = [];

    listeners.push(
      signalingClient.on('room.participant-joined', ({ participantId: remotePeerId, displayName: remoteDisplayName }) => {
        if (remotePeerId !== peerId) {
          // Store the display name if provided by the signaling server
          if (remoteDisplayName) {
            setPeerNames((prev) => {
              const next = new Map(prev);
              next.set(remotePeerId, remoteDisplayName);
              return next;
            });
          }
          void syncRemoteProducers().catch((err) => {
            console.error('Sync failed after participant joined', { roomId, peerId, remotePeerId, error: err });
          });
        }
      }),
    );

    listeners.push(
      signalingClient.on('name.announce', ({ participantId, displayName: remoteName }) => {
        if (participantId !== peerId) {
          setPeerNames((prev) => {
            const next = new Map(prev);
            next.set(participantId, remoteName);
            return next;
          });
        }
      }),
    );

    listeners.push(
      signalingClient.on('room.participant-left', ({ participantId: remotePeerId }) => {
        if (remotePeerId === peerId) return;

        // Remove all streams keyed to this peer (camera + screen)
        setRemoteStreams((prev) => {
          const updated = new Map(prev);
          for (const [key, stream] of updated) {
            if (key === remotePeerId || key.startsWith(`${remotePeerId}:`)) {
              stream.getTracks().forEach((track) => track.stop());
              updated.delete(key);
            }
          }
          return updated;
        });

        // Clean up producerOwner but leave subscribedProducerIdsRef intact.
        // Keeping stale IDs prevents the periodic sync from re-subscribing
        // to producers that are still alive on mediasoup right after the peer
        // disconnects. New sessions always generate fresh producer UUIDs.
        const producerIdsToDelete: string[] = [];
        producerOwnerRef.current.forEach((ownerPeerId, producerId) => {
          if (ownerPeerId === remotePeerId) producerIdsToDelete.push(producerId);
        });
        producerIdsToDelete.forEach((id) => producerOwnerRef.current.delete(id));
      }),
    );

    listeners.push(
      signalingClient.on('chat.received', ({ participantId, text, ts, senderName }) => {
        // Skip echo — own message is already added optimistically in sendChatMessage
        if (participantId === peerId) return;
        setChatMessages((prev) => [
          ...prev,
          { id: `${participantId}-${ts}`, peerId: senderName || participantId, text, ts, isSelf: false },
        ]);
      }),
    );

    return () => {
      listeners.forEach((unsub) => unsub());
    };
  }, [signalingClient, roomState, peerId, syncRemoteProducers]);

  // Periodic producer discovery
  useEffect(() => {
    if (roomState !== 'joined') return;

    const runSync = () => {
      void syncRemoteProducers().catch((err) => {
        console.error('Periodic sync failed', { roomId, peerId, error: err instanceof Error ? err.message : err });
      });
    };

    runSync();
    const intervalId = setInterval(runSync, 1500);
    return () => clearInterval(intervalId);
  }, [roomState, syncRemoteProducers]);

  // Best-effort cleanup when the tab is closed/refreshed
  useEffect(() => {
    const handleBeforeUnload = () => {
      const url = `${env.NEXT_PUBLIC_MEDIASOUP_URL}/rooms/${roomId}/peers/${peerId}`;
      navigator.sendBeacon(url);
    };
    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [env.NEXT_PUBLIC_MEDIASOUP_URL, roomId, peerId]);

  // Auto-join
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
    chatMessages,
    screenStream,
    isScreenSharing,
    peerNames,
    joinRoom,
    leaveRoom,
    publishMedia,
    unpublishMedia,
    setAudioEnabled,
    setVideoEnabled,
    startScreenShare,
    stopScreenShare,
    sendChatMessage,
  };
}
