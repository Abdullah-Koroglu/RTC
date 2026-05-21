import { useEffect, useRef, useState, useCallback } from 'react';
import type { MediaStream } from 'react-native-webrtc';
import { MediasoupRNClient, type ParticipantState, type RemoteProducer } from '@/lib/mediasoup-rn';
import { useSignaling } from './useSignaling';
import { getEnv } from '@/lib/env';

export type RoomState = 'idle' | 'joining' | 'joined' | 'error';
export type { ParticipantState };

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
  initialMicEnabled?: boolean;
  initialCameraEnabled?: boolean;
  photo?: string | null;
}

export interface UseRoomReturn {
  roomState: RoomState;
  error: Error | null;
  localStream: MediaStream | null;
  remoteStreams: Map<string, MediaStream>;
  chatMessages: ChatMessage[];
  participants: Map<string, ParticipantState>;
  isScreenSharing: boolean;
  leaveRoom: () => Promise<void>;
  publishMedia: (constraints?: Record<string, unknown>) => Promise<MediaStream | null>;
  unpublishMedia: (kind: 'audio' | 'video') => void;
  setAudioEnabled: (enabled: boolean) => void;
  setVideoEnabled: (enabled: boolean) => void;
  sendChatMessage: (text: string) => void;
}

export function useRoom(options: UseRoomOptions): UseRoomReturn {
  const env = getEnv();
  const { roomId, peerId, displayName, autoJoin = true, initialMicEnabled, initialCameraEnabled, photo } = options;
  const photoRef = useRef(photo);
  useEffect(() => { photoRef.current = photo; }, [photo]);

  const [roomState, setRoomState] = useState<RoomState>('idle');
  const [error, setError] = useState<Error | null>(null);
  const [localStream, setLocalStream] = useState<MediaStream | null>(null);
  const [remoteStreams, setRemoteStreams] = useState<Map<string, MediaStream>>(new Map());
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [participants, setParticipants] = useState<Map<string, ParticipantState>>(new Map());

  const mediaClientRef = useRef<MediasoupRNClient | null>(null);
  const producerOwnerRef = useRef<Map<string, string>>(new Map());
  const subscribedProducerIdsRef = useRef<Set<string>>(new Set());
  const screenProducerKeysRef = useRef<Map<string, string>>(new Map());
  const initRef = useRef(false);
  const remoteStreamsRef = useRef<Map<string, MediaStream>>(new Map());
  useEffect(() => { remoteStreamsRef.current = remoteStreams; }, [remoteStreams]);

  const { client: signalingClient, isConnected: isSignalingConnected } = useSignaling({
    participantId: peerId,
    autoConnect: true,
    reconnect: { maxAttempts: Number.MAX_SAFE_INTEGER, baseDelayMs: 1000, maxDelayMs: 10000 },
  });

  const initializeMediasoup = useCallback(async () => {
    if (mediaClientRef.current) return;

    const client = new MediasoupRNClient({
      baseUrl: env.MEDIASOUP_URL,
      apiBaseUrl: env.API_URL,
      roomId,
      peerId,
    });

    await client.initialize();
    await client.createTransports();
    mediaClientRef.current = client;
  }, [roomId, peerId, env.MEDIASOUP_URL, env.API_URL]);

  const joinRoom = useCallback(async () => {
    try {
      setRoomState('joining');
      setError(null);

      if (!signalingClient || !isSignalingConnected) {
        throw new Error('Signaling client not connected');
      }

      await initializeMediasoup();
      const initialParticipants: ParticipantState[] = await signalingClient.joinRoom(roomId, displayName ?? peerId, {
        ...(initialMicEnabled !== undefined ? { micEnabled: initialMicEnabled } : {}),
        ...(initialCameraEnabled !== undefined ? { cameraEnabled: initialCameraEnabled } : {}),
      });
      setParticipants(new Map(initialParticipants.map((p) => [p.participantId, p])));
      setRoomState('joined');
    } catch (err) {
      const e = err instanceof Error ? err : new Error('Failed to join room');
      setError(e);
      setRoomState('error');
      throw e;
    }
  }, [isSignalingConnected, initializeMediasoup, signalingClient, roomId, displayName, peerId, initialMicEnabled, initialCameraEnabled]);

  const leaveRoom = useCallback(async () => {
    try {
      if (signalingClient) await signalingClient.leaveRoom(roomId);

      remoteStreams.forEach((stream) => stream.getTracks().forEach((t) => t.stop()));
      setRemoteStreams(new Map());

      if (mediaClientRef.current) {
        await mediaClientRef.current.close();
        mediaClientRef.current = null;
      }

      if (localStream) {
        localStream.getTracks().forEach((t) => t.stop());
        setLocalStream(null);
      }

      producerOwnerRef.current.clear();
      subscribedProducerIdsRef.current.clear();
      screenProducerKeysRef.current.clear();
      setChatMessages([]);
      setParticipants(new Map());
      setRoomState('idle');
    } catch (err) {
      console.error('Error leaving room:', err);
      setRoomState('idle');
    }
  }, [remoteStreams, localStream, signalingClient, roomId]);

  const syncRemoteProducers = useCallback(async () => {
    if (!mediaClientRef.current || roomState !== 'joined') return;

    let producers: RemoteProducer[];
    try {
      producers = await mediaClientRef.current.listRemoteProducers();
    } catch {
      return;
    }

    const liveProducerIds = new Set(producers.map((p) => p.producerId));
    const livePeerIds = new Set(producers.map((p) => p.peerId));
    const keysToRemove: string[] = [];

    for (const [screenProducerId, streamKey] of screenProducerKeysRef.current) {
      if (!liveProducerIds.has(screenProducerId)) {
        remoteStreamsRef.current.get(streamKey)?.getTracks().forEach((t) => t.stop());
        keysToRemove.push(streamKey);
        subscribedProducerIdsRef.current.delete(screenProducerId);
        producerOwnerRef.current.delete(screenProducerId);
        screenProducerKeysRef.current.delete(screenProducerId);
      }
    }

    for (const [streamKey, stream] of remoteStreamsRef.current) {
      if (streamKey.includes(':') || streamKey === peerId) continue;
      if (livePeerIds.has(streamKey)) continue;
      stream.getTracks().forEach((t) => t.stop());
      keysToRemove.push(streamKey);
      const ownedIds: string[] = [];
      producerOwnerRef.current.forEach((owner, pid) => { if (owner === streamKey) ownedIds.push(pid); });
      for (const pid of ownedIds) {
        subscribedProducerIdsRef.current.delete(pid);
        producerOwnerRef.current.delete(pid);
      }
    }

    if (keysToRemove.length > 0) {
      setRemoteStreams((prev) => {
        const updated = new Map(prev);
        for (const key of keysToRemove) updated.delete(key);
        return updated;
      });
    }

    const additions = new Map<string, MediaStream>();

    for (const producer of producers) {
      if (producer.peerId === peerId || subscribedProducerIdsRef.current.has(producer.producerId)) continue;

      let stream: MediaStream;
      try {
        stream = await mediaClientRef.current.subscribeMedia(producer.producerId, producer.peerId);
      } catch {
        continue;
      }

      const isScreen = producer.appData?.mediaTag === 'screen';
      const streamKey = isScreen ? `${producer.peerId}:screen` : producer.peerId;

      const target = additions.get(streamKey) ?? new (global as any).MediaStream() as MediaStream;
      for (const track of stream.getTracks()) {
        if (!target.getTracks().some((t: any) => t.id === track.id)) target.addTrack(track);
      }
      additions.set(streamKey, target);

      producerOwnerRef.current.set(producer.producerId, producer.peerId);
      subscribedProducerIdsRef.current.add(producer.producerId);
      if (isScreen) screenProducerKeysRef.current.set(producer.producerId, streamKey);
    }

    if (additions.size > 0) {
      setRemoteStreams((prev) => {
        const updated = new Map(prev);
        for (const [key, stream] of additions) {
          const existing = updated.get(key);
          if (existing) {
            for (const track of stream.getTracks()) {
              if (!existing.getTracks().some((t: any) => t.id === track.id)) existing.addTrack(track);
            }
          } else {
            updated.set(key, stream);
          }
        }
        return updated;
      });
    }
  }, [peerId, roomState]);

  const publishMedia = useCallback(async (constraints: Record<string, unknown> = { audio: true, video: true }): Promise<MediaStream | null> => {
    try {
      if (!mediaClientRef.current) throw new Error('Media client not initialized');
      const stream = await mediaClientRef.current.publishMedia(constraints);
      setLocalStream(stream);
      await syncRemoteProducers();
      return stream;
    } catch (err) {
      setError(err instanceof Error ? err : new Error('Failed to publish media'));
      return null;
    }
  }, [syncRemoteProducers]);

  const unpublishMedia = useCallback((kind: 'audio' | 'video') => {
    mediaClientRef.current?.unpublishMedia(kind);
  }, []);

  const setAudioEnabled = useCallback((enabled: boolean) => {
    mediaClientRef.current?.setAudioEnabled(enabled);
    if (signalingClient && roomState === 'joined') {
      void signalingClient.sendParticipantStateUpdate(roomId, { micEnabled: enabled }).catch(() => undefined);
    }
  }, [signalingClient, roomId, roomState]);

  const setVideoEnabled = useCallback((enabled: boolean) => {
    mediaClientRef.current?.setVideoEnabled(enabled);
    if (signalingClient && roomState === 'joined') {
      void signalingClient.sendParticipantStateUpdate(roomId, { cameraEnabled: enabled }).catch(() => undefined);
    }
  }, [signalingClient, roomId, roomState]);

  const sendChatMessage = useCallback((text: string) => {
    if (!signalingClient || !text.trim()) return;
    setChatMessages((prev) => [...prev, { id: `self-${Date.now()}`, peerId, text: text.trim(), ts: Date.now(), isSelf: true }]);
    void signalingClient.sendChatMessage(roomId, text.trim(), displayName ?? peerId).catch(console.error);
  }, [signalingClient, roomId, peerId, displayName]);

  const reconcile = useCallback(async () => {
    try {
      const res = await fetch(`${env.SIGNALING_URL}/rooms/${roomId}/participants`);
      if (!res.ok) return;
      const { participants: fresh } = await res.json() as { participants: ParticipantState[] };
      const freshMap = new Map(fresh.map((p) => [p.participantId, p]));

      setParticipants((prev) => {
        const next = new Map<string, ParticipantState>();
        for (const [id, p] of freshMap) {
          if (id === peerId) continue;
          const existing = prev.get(id);
          const entry: ParticipantState = { ...p };
          if (existing?.photo !== undefined) entry.photo = existing.photo;
          next.set(id, entry);
        }
        return next;
      });

      setRemoteStreams((prev) => {
        const ghostKeys = [...prev.keys()].filter((key) => {
          const basePeer = key.split(':')[0]!;
          return basePeer !== peerId && !freshMap.has(basePeer);
        });
        if (ghostKeys.length === 0) return prev;
        const updated = new Map(prev);
        for (const key of ghostKeys) {
          updated.get(key)?.getTracks().forEach((t) => t.stop());
          updated.delete(key);
        }
        return updated;
      });
    } catch { /* best-effort */ }
  }, [roomId, peerId, env.SIGNALING_URL]);

  // Signaling event listeners
  useEffect(() => {
    if (!signalingClient || roomState !== 'joined') return;
    const listeners: (() => void)[] = [];

    listeners.push(
      signalingClient.on('room.participant-joined', ({ participantId: remotePeerId }) => {
        if (remotePeerId !== peerId) {
          void reconcile();
          void syncRemoteProducers();
          if (photoRef.current !== undefined) {
            void signalingClient.sendPhotoAnnounce(roomId, photoRef.current ?? null).catch(() => undefined);
          }
        }
      }),
    );

    listeners.push(
      signalingClient.on('room.participant-state-updated', ({ participantId: remotePeerId, displayName: remoteDisplayName, cameraEnabled, micEnabled }) => {
        if (remotePeerId !== peerId) {
          setParticipants((prev) => {
            const next = new Map(prev);
            const existing = next.get(remotePeerId);
            const updated: ParticipantState = {
              participantId: remotePeerId,
              displayName: remoteDisplayName,
              cameraEnabled,
              micEnabled,
              joinedAt: existing?.joinedAt ?? new Date().toISOString(),
            };
            if (existing?.photo !== undefined) updated.photo = existing.photo;
            next.set(remotePeerId, updated);
            return next;
          });
        }
      }),
    );

    listeners.push(
      signalingClient.on('photo.announce', ({ participantId: remotePeerId, photo }) => {
        if (remotePeerId !== peerId) {
          setParticipants((prev) => {
            const existing = prev.get(remotePeerId);
            if (!existing) return prev;
            const next = new Map(prev);
            next.set(remotePeerId, { ...existing, photo });
            return next;
          });
        }
      }),
    );

    listeners.push(
      signalingClient.on('room.participant-left', ({ participantId: remotePeerId }) => {
        if (remotePeerId === peerId) return;
        setRemoteStreams((prev) => {
          const updated = new Map(prev);
          for (const [key, stream] of updated) {
            if (key === remotePeerId || key.startsWith(`${remotePeerId}:`)) {
              stream.getTracks().forEach((t) => t.stop());
              updated.delete(key);
            }
          }
          return updated;
        });
        setParticipants((prev) => { const next = new Map(prev); next.delete(remotePeerId); return next; });
      }),
    );

    listeners.push(
      signalingClient.on('chat.received', ({ participantId, text, ts, senderName }) => {
        if (participantId === peerId) return;
        setChatMessages((prev) => [...prev, { id: `${participantId}-${ts}`, peerId: senderName || participantId, text, ts, isSelf: false }]);
      }),
    );

    return () => listeners.forEach((u) => u());
  }, [signalingClient, roomState, peerId, syncRemoteProducers, reconcile, roomId]);

  // Recover room + media after signaling reconnect so offline/online transitions are seamless.
  useEffect(() => {
    if (!signalingClient || roomState !== 'joined') return;

    const unsub = signalingClient.on('reconnect.succeeded', () => {
      void (async () => {
        try {
          const joined = await signalingClient.joinRoom(roomId, displayName ?? peerId, {
            ...(initialMicEnabled !== undefined ? { micEnabled: initialMicEnabled } : {}),
            ...(initialCameraEnabled !== undefined ? { cameraEnabled: initialCameraEnabled } : {}),
          });

          const freshParticipants = Array.isArray(joined)
            ? joined
            : ((joined as { participants?: ParticipantState[] }).participants ?? []);
          setParticipants(new Map(freshParticipants.map((p) => [p.participantId, p])));

          remoteStreamsRef.current.forEach((stream) => {
            stream.getTracks().forEach((track) => track.stop());
          });
          setRemoteStreams(new Map());

          if (mediaClientRef.current) {
            await mediaClientRef.current.close();
            mediaClientRef.current = null;
          }

          if (localStream) {
            localStream.getTracks().forEach((track) => track.stop());
          }
          setLocalStream(null);

          producerOwnerRef.current.clear();
          subscribedProducerIdsRef.current.clear();
          screenProducerKeysRef.current.clear();

          await initializeMediasoup();
          await publishMedia({ audio: true, video: true });
          await reconcile();
          await syncRemoteProducers();
        } catch (err) {
          setError(err instanceof Error ? err : new Error('Failed to recover room after reconnect'));
        }
      })();
    });

    return unsub;
  }, [
    signalingClient,
    roomState,
    roomId,
    displayName,
    peerId,
    initialMicEnabled,
    initialCameraEnabled,
    localStream,
    initializeMediasoup,
    publishMedia,
    reconcile,
    syncRemoteProducers,
  ]);

  // Broadcast photo on join
  useEffect(() => {
    if (roomState !== 'joined' || !signalingClient || photo === undefined) return;
    void signalingClient.sendPhotoAnnounce(roomId, photo ?? null).catch(() => undefined);
  }, [roomState, signalingClient, roomId, photo]);

  // Periodic reconciliation
  useEffect(() => {
    if (roomState !== 'joined') return;
    const id = setInterval(() => { void reconcile(); }, 7000);
    return () => clearInterval(id);
  }, [roomState, reconcile]);

  // Periodic producer sync
  useEffect(() => {
    if (roomState !== 'joined') return;
    void syncRemoteProducers();
    const id = setInterval(() => { void syncRemoteProducers(); }, 5000);
    return () => clearInterval(id);
  }, [roomState, syncRemoteProducers]);

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
    participants,
    isScreenSharing: false,
    leaveRoom,
    publishMedia,
    unpublishMedia,
    setAudioEnabled,
    setVideoEnabled,
    sendChatMessage,
  };
}
