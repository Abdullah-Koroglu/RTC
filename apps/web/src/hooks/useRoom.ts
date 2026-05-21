'use client';

import { useEffect, useRef, useState, useCallback } from 'react';
import { MediasoupClient, type ParticipantState } from '@repo/rtc-sdk';
import { useSignaling } from './useSignaling';
import { getClientEnv } from '@/lib/env';

export type RoomState = 'idle' | 'joining' | 'joined' | 'error' | 'banned' | 'room_locked';

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
  screenStream: MediaStream | null;
  isScreenSharing: boolean;
  /** participantId → ParticipantState (includes displayName, cameraEnabled, micEnabled) */
  participants: Map<string, ParticipantState>;
  hostPeerId: string | null;
  isHost: boolean;
  isRoomLocked: boolean;
  wasKicked: boolean;
  localAudioEnabled: boolean;
  localVideoEnabled: boolean;
  joinRequests: Array<{ peerId: string; displayName: string }>;
  newJoinRequestAlert: { peerId: string; displayName: string } | null;
  raisedHands: Array<{ peerId: string; displayName: string }>;
  unmuteRequest: { kind: 'audio' | 'video' | 'both' } | null;
  joinRoom: () => Promise<void>;
  leaveRoom: () => Promise<void>;
  publishMedia: (constraints?: MediaStreamConstraints) => Promise<MediaStream | null>;
  unpublishMedia: (kind: 'audio' | 'video') => void;
  setAudioEnabled: (enabled: boolean) => void;
  setVideoEnabled: (enabled: boolean) => void;
  startScreenShare: () => Promise<MediaStream | null>;
  stopScreenShare: () => void;
  sendChatMessage: (text: string) => void;
  kickParticipant: (targetPeerId: string) => void;
  lockRoom: (locked: boolean) => void;
  approveJoin: (targetPeerId: string) => void;
  denyJoin: (targetPeerId: string) => void;
  transferHost: (targetPeerId: string) => void;
  forceMute: (targetPeerId: string, kind: 'audio' | 'video' | 'both') => void;
  requestUnmute: (targetPeerId: string, kind: 'audio' | 'video' | 'both') => void;
  raiseHand: () => void;
  lowerHand: (targetPeerId?: string) => void;
  dismissUnmuteRequest: () => void;
  dismissJoinRequestAlert: () => void;
  requestBannedJoin: () => void;
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
  const { roomId, peerId, displayName, autoJoin = true, initialMicEnabled, initialCameraEnabled, photo } = options;
  const photoRef = useRef(photo);
  useEffect(() => { photoRef.current = photo; }, [photo]);

  const [roomState, setRoomState] = useState<RoomState>('idle');
  const [error, setError] = useState<Error | null>(null);
  const [localStream, setLocalStream] = useState<MediaStream | null>(null);
  const [remoteStreams, setRemoteStreams] = useState<Map<string, MediaStream>>(new Map());
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [screenStream, setScreenStream] = useState<MediaStream | null>(null);
  const [isScreenSharing, setIsScreenSharing] = useState(false);
  const [participants, setParticipants] = useState<Map<string, ParticipantState>>(new Map());
  const pendingPhotosRef = useRef<Map<string, string | null>>(new Map());
  const [hostPeerId, setHostPeerId] = useState<string | null>(null);
  const [isRoomLocked, setIsRoomLocked] = useState(false);
  const [wasKicked, setWasKicked] = useState(false);
  const [joinRequests, setJoinRequests] = useState<Array<{ peerId: string; displayName: string }>>([]);
  const [raisedHands, setRaisedHands] = useState<Array<{ peerId: string; displayName: string }>>([]);
  const [unmuteRequest, setUnmuteRequest] = useState<{ kind: 'audio' | 'video' | 'both' } | null>(null);
  const [newJoinRequestAlert, setNewJoinRequestAlert] = useState<{ peerId: string; displayName: string } | null>(null);

  const mediaClientRef = useRef<MediasoupClient | null>(null);
  // producerId → peerId
  const producerOwnerRef = useRef<Map<string, string>>(new Map());
  // producerIds that have been subscribed — intentionally NOT cleared on participant-left
  const subscribedProducerIdsRef = useRef<Set<string>>(new Set());
  // producerId → streamKey for screen producers
  const screenProducerKeysRef = useRef<Map<string, string>>(new Map());
  const initRef = useRef(false);
  // Always-current ref so syncRemoteProducers orphan cleanup avoids stale closure
  const remoteStreamsRef = useRef<Map<string, MediaStream>>(new Map());
  useEffect(() => { remoteStreamsRef.current = remoteStreams; }, [remoteStreams]);

  const signalingOptions = {
    participantId: peerId,
    autoConnect: true,
    reconnect: {
      maxAttempts: Number.MAX_SAFE_INTEGER,
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
      const { participants: initialParticipants, hostPeerId: initialHostPeerId } = await signalingClient.joinRoom(
        roomId,
        displayName ?? peerId,
        {
          ...(initialMicEnabled !== undefined ? { micEnabled: initialMicEnabled } : {}),
          ...(initialCameraEnabled !== undefined ? { cameraEnabled: initialCameraEnabled } : {}),
        },
      );
      const initialMap = new Map(initialParticipants.map((p) => [p.participantId, p]));
      // Apply any pending photos that arrived before participants map was populated
      for (const [pid, photo] of pendingPhotosRef.current) {
        const p = initialMap.get(pid);
        if (p) { initialMap.set(pid, { ...p, photo }); pendingPhotosRef.current.delete(pid); }
      }
      setParticipants(initialMap);
      if (initialHostPeerId) setHostPeerId(initialHostPeerId);
      setRoomState('joined');
    } catch (err) {
      const joinError = err instanceof Error ? err : new Error('Failed to join room');
      const msg = joinError.message;
      if (msg.includes('BANNED')) {
        setRoomState('banned');
      } else if (msg.includes('ROOM_LOCKED')) {
        setRoomState('room_locked');
      } else {
        setError(joinError);
        setRoomState('error');
      }
      throw joinError;
    }
  }, [isSignalingConnected, initializeMediasoup, signalingClient, roomId, displayName, peerId, initialMicEnabled, initialCameraEnabled]);

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
      setParticipants(new Map());
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

    const liveProducerIds = new Set(producers.map((p) => p.producerId));
    const livePeerIds = new Set(producers.map((p) => p.peerId));

    const keysToRemove: string[] = [];

    for (const [screenProducerId, streamKey] of screenProducerKeysRef.current) {
      if (!liveProducerIds.has(screenProducerId)) {
        const gone = remoteStreamsRef.current.get(streamKey);
        if (gone) gone.getTracks().forEach((t) => t.stop());
        keysToRemove.push(streamKey);
        subscribedProducerIdsRef.current.delete(screenProducerId);
        producerOwnerRef.current.delete(screenProducerId);
        screenProducerKeysRef.current.delete(screenProducerId);
      }
    }

    for (const [streamKey, stream] of remoteStreamsRef.current) {
      if (streamKey.includes(':')) continue;
      if (streamKey === peerId) continue;
      if (livePeerIds.has(streamKey)) continue;

      stream.getTracks().forEach((t) => t.stop());
      keysToRemove.push(streamKey);
      const ownedIds: string[] = [];
      producerOwnerRef.current.forEach((ownerPeerId, producerId) => {
        if (ownerPeerId === streamKey) ownedIds.push(producerId);
      });
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

      const target = additions.get(streamKey) ?? new MediaStream();
      for (const track of stream.getTracks()) {
        if (!target.getTracks().some((t) => t.id === track.id)) target.addTrack(track);
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
              if (!existing.getTracks().some((t) => t.id === track.id)) existing.addTrack(track);
            }
          } else {
            updated.set(key, stream);
          }
        }
        return updated;
      });
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

  const [localAudioEnabled, setLocalAudioEnabled] = useState(true);
  const [localVideoEnabled, setLocalVideoEnabled] = useState(true);

  const setAudioEnabled = useCallback((enabled: boolean) => {
    try {
      mediaClientRef.current?.setAudioEnabled(enabled);
      setLocalAudioEnabled(enabled);
      if (signalingClient && roomState === 'joined') {
        void signalingClient.sendParticipantStateUpdate(roomId, { micEnabled: enabled }).catch(() => undefined);
      }
    } catch (err) {
      setError(err instanceof Error ? err : new Error('Failed to toggle audio'));
    }
  }, [signalingClient, roomId, roomState]);

  const setVideoEnabled = useCallback((enabled: boolean) => {
    try {
      mediaClientRef.current?.setVideoEnabled(enabled);
      setLocalVideoEnabled(enabled);
      if (signalingClient && roomState === 'joined') {
        void signalingClient.sendParticipantStateUpdate(roomId, { cameraEnabled: enabled }).catch(() => undefined);
      }
    } catch (err) {
      setError(err instanceof Error ? err : new Error('Failed to toggle video'));
    }
  }, [signalingClient, roomId, roomState]);

  const startScreenShare = useCallback(async (): Promise<MediaStream | null> => {
    try {
      if (!mediaClientRef.current) throw new Error('Mediasoup client not initialized');
      const stream = await mediaClientRef.current.startScreenShare();
      setScreenStream(stream);
      setIsScreenSharing(true);
      return stream;
    } catch (err) {
      if ((err as Error).name === 'NotAllowedError') return null;
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
    [signalingClient, roomId, peerId, displayName],
  );

  // Reconcile participants + ghost streams from Redis — extracted for reuse
  const reconcile = useCallback(async () => {
    try {
      const res = await fetch(`/api/rooms/${roomId}/participants`);
      if (!res.ok) return;
      const { participants: fresh } = await res.json() as { participants: ParticipantState[] };
      const freshMap = new Map(fresh.map((p) => [p.participantId, p]));

      setParticipants((prev) => {
        const next = new Map<string, ParticipantState>();
        for (const [id, p] of freshMap) {
          if (id === peerId) continue;
          const existing = prev.get(id);
          const entry: ParticipantState = { ...p };
          // Preserve client-side photo: from existing state, or from pending if freshly joined
          if (existing?.photo !== undefined) {
            entry.photo = existing.photo;
          } else if (pendingPhotosRef.current.has(id)) {
            entry.photo = pendingPhotosRef.current.get(id) ?? null;
            pendingPhotosRef.current.delete(id);
          }
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
          const basePeer = key.split(':')[0]!;
          producerOwnerRef.current.forEach((ownerPeerId, producerId) => {
            if (ownerPeerId === basePeer) {
              subscribedProducerIdsRef.current.delete(producerId);
              producerOwnerRef.current.delete(producerId);
              screenProducerKeysRef.current.delete(producerId);
            }
          });
        }
        return updated;
      });
    } catch {
      // best-effort, ignore errors
    }
  }, [roomId, peerId]);

  // Auto-retry join when host approves a banned/locked user's request
  useEffect(() => {
    if (!signalingClient || (roomState !== 'banned' && roomState !== 'room_locked')) return;
    const unsub = signalingClient.on('room.join-approved', () => {
      void joinRoom().catch(() => undefined);
    });
    return unsub;
  }, [signalingClient, roomState, joinRoom]);

  // Recover room + media after signaling reconnect so offline/online transitions are seamless.
  useEffect(() => {
    if (!signalingClient || roomState !== 'joined') return;

    const unsub = signalingClient.on('reconnect.succeeded', () => {
      void (async () => {
        try {
          const { participants: freshParticipants, hostPeerId: freshHostPeerId } = await signalingClient.joinRoom(
            roomId,
            displayName ?? peerId,
            {
              ...(initialMicEnabled !== undefined ? { micEnabled: initialMicEnabled } : {}),
              ...(initialCameraEnabled !== undefined ? { cameraEnabled: initialCameraEnabled } : {}),
            },
          );

          const freshMap = new Map(freshParticipants.map((p) => [p.participantId, p]));
          for (const [pid, queuedPhoto] of pendingPhotosRef.current) {
            const p = freshMap.get(pid);
            if (p) {
              freshMap.set(pid, { ...p, photo: queuedPhoto });
              pendingPhotosRef.current.delete(pid);
            }
          }
          setParticipants(freshMap);
          if (freshHostPeerId) setHostPeerId(freshHostPeerId);

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

          if (screenStream) {
            screenStream.getTracks().forEach((track) => track.stop());
          }
          setScreenStream(null);
          setIsScreenSharing(false);

          producerOwnerRef.current.clear();
          subscribedProducerIdsRef.current.clear();
          screenProducerKeysRef.current.clear();

          await initializeMediasoup();

          const republished = await publishMedia({ audio: true, video: true });
          if (republished) {
            setAudioEnabled(localAudioEnabled);
            setVideoEnabled(localVideoEnabled);
          }

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
    screenStream,
    localAudioEnabled,
    localVideoEnabled,
    initializeMediasoup,
    publishMedia,
    setAudioEnabled,
    setVideoEnabled,
    reconcile,
    syncRemoteProducers,
  ]);

  // Signaling event listeners
  useEffect(() => {
    if (!signalingClient || roomState !== 'joined') return;

    const listeners: (() => void)[] = [];

    listeners.push(
      signalingClient.on('room.participant-joined', ({ participantId: remotePeerId }) => {
        if (remotePeerId !== peerId) {
          // Fetch fresh state from Redis instead of defaulting mic/cam to false
          void reconcile().catch((err) => {
            console.error('Reconcile failed after participant joined', { roomId, peerId, remotePeerId, error: err });
          });
          void syncRemoteProducers().catch((err) => {
            console.error('Sync failed after participant joined', { roomId, peerId, remotePeerId, error: err });
          });
          // Re-broadcast our photo so the new joiner can see it
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
            if (!existing) {
              // Participant not in map yet — store for later application
              pendingPhotosRef.current.set(remotePeerId, photo);
              return prev;
            }
            const next = new Map(prev);
            next.set(remotePeerId, { ...existing, photo });
            return next;
          });
        }
      }),
    );

    listeners.push(
      signalingClient.on('name.announce', ({ participantId, displayName: remoteName }) => {
        if (participantId !== peerId) {
          setParticipants((prev) => {
            const next = new Map(prev);
            const existing = next.get(participantId);
            if (existing) {
              next.set(participantId, { ...existing, displayName: remoteName });
            }
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
              stream.getTracks().forEach((track) => track.stop());
              updated.delete(key);
            }
          }
          return updated;
        });

        setParticipants((prev) => {
          const next = new Map(prev);
          next.delete(remotePeerId);
          return next;
        });

        const producerIdsToDelete: string[] = [];
        producerOwnerRef.current.forEach((ownerPeerId, producerId) => {
          if (ownerPeerId === remotePeerId) producerIdsToDelete.push(producerId);
        });
        producerIdsToDelete.forEach((id) => producerOwnerRef.current.delete(id));
      }),
    );

    listeners.push(
      signalingClient.on('room.join-requested', ({ peerId: requesterPeerId, displayName: requesterName }) => {
        setJoinRequests((prev) => {
          if (prev.some((r) => r.peerId === requesterPeerId)) return prev;
          return [...prev, { peerId: requesterPeerId, displayName: requesterName }];
        });
        setNewJoinRequestAlert({ peerId: requesterPeerId, displayName: requesterName });
      }),
    );

    listeners.push(
      signalingClient.on('room.participant-kicked', ({ participantId: kickedId }) => {
        if (kickedId === peerId) {
          setWasKicked(true);
          void signalingClient.leaveRoom(roomId).catch(() => undefined);
        }
      }),
    );

    listeners.push(
      signalingClient.on('room.participant-muted', ({ participantId: mutedId, kind }) => {
        if (mutedId === peerId) {
          if (kind === 'audio' || kind === 'both') setAudioEnabled(false);
          if (kind === 'video' || kind === 'both') setVideoEnabled(false);
        }
      }),
    );

    listeners.push(
      signalingClient.on('room.unmute-requested', ({ kind }) => {
        setUnmuteRequest({ kind });
      }),
    );

    listeners.push(
      signalingClient.on('room.hand-raised', ({ participantId: raisedId, displayName: raisedName }) => {
        setRaisedHands((prev) => {
          if (prev.some((h) => h.peerId === raisedId)) return prev;
          return [...prev, { peerId: raisedId, displayName: raisedName }];
        });
      }),
    );

    listeners.push(
      signalingClient.on('room.hand-lowered', ({ participantId: loweredId }) => {
        setRaisedHands((prev) => prev.filter((h) => h.peerId !== loweredId));
      }),
    );

    listeners.push(
      signalingClient.on('room.locked', ({ locked }) => {
        setIsRoomLocked(locked);
      }),
    );

    listeners.push(
      signalingClient.on('room.host-transferred', ({ newHostPeerId }) => {
        setHostPeerId(newHostPeerId);
      }),
    );

    listeners.push(
      signalingClient.on('producer.new', ({ peerId: remotePeerId }) => {
        if (remotePeerId !== peerId) {
          void syncRemoteProducers().catch(() => undefined);
        }
      }),
    );

    listeners.push(
      signalingClient.on('producer.closed', ({ peerId: remotePeerId }) => {
        if (remotePeerId !== peerId) {
          void syncRemoteProducers().catch(() => undefined);
        }
      }),
    );

    listeners.push(
      signalingClient.on('chat.received', ({ participantId, text, ts, senderName }) => {
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
  }, [signalingClient, roomState, peerId, syncRemoteProducers, reconcile, roomId]);

  // Broadcast photo-announce on join and whenever photo changes (session may load late)
  useEffect(() => {
    if (roomState !== 'joined' || !signalingClient || photo === undefined) return;
    void signalingClient.sendPhotoAnnounce(roomId, photo ?? null).catch(() => undefined);
  }, [roomState, signalingClient, roomId, photo]);

  // Fallback reconciliation — ghost cleanup for abrupt disconnects only
  useEffect(() => {
    if (roomState !== 'joined') return;
    const id = setInterval(() => { void reconcile(); }, 30000);
    return () => clearInterval(id);
  }, [roomState, reconcile]);

  // Fallback producer discovery — real-time via producer.new/closed events, this is a safety net
  useEffect(() => {
    if (roomState !== 'joined') return;

    const runSync = () => {
      void syncRemoteProducers().catch((err) => {
        console.error('Periodic sync failed', { roomId, peerId, error: err instanceof Error ? err.message : err });
      });
    };

    runSync();
    const intervalId = setInterval(runSync, 30000);
    return () => clearInterval(intervalId);
  }, [roomState, syncRemoteProducers]);

  // Auto-join
  useEffect(() => {
    if (autoJoin && isSignalingConnected && !initRef.current && roomState === 'idle') {
      initRef.current = true;
      void joinRoom();
    }
  }, [autoJoin, isSignalingConnected, roomState, joinRoom]);

  const sendRaw = useCallback((msg: Record<string, unknown>) => {
    const ws = (signalingClient as unknown as { socket: WebSocket | null } | null)?.socket;
    if (ws?.readyState === WebSocket.OPEN) ws.send(JSON.stringify(msg));
  }, [signalingClient]);

  const kickParticipant = useCallback((targetPeerId: string) => {
    sendRaw({ type: 'room.kick', roomId, peerId: targetPeerId });
  }, [sendRaw, roomId]);

  const lockRoom = useCallback((locked: boolean) => {
    sendRaw({ type: 'room.lock', roomId, locked });
  }, [sendRaw, roomId]);

  const approveJoin = useCallback((targetPeerId: string) => {
    setJoinRequests((prev) => prev.filter((r) => r.peerId !== targetPeerId));
    sendRaw({ type: 'room.approve-join', roomId, peerId: targetPeerId });
  }, [sendRaw, roomId]);

  const denyJoin = useCallback((targetPeerId: string) => {
    setJoinRequests((prev) => prev.filter((r) => r.peerId !== targetPeerId));
    sendRaw({ type: 'room.deny-join', roomId, peerId: targetPeerId });
  }, [sendRaw, roomId]);

  const transferHost = useCallback((targetPeerId: string) => {
    sendRaw({ type: 'room.transfer-host', roomId, peerId: targetPeerId });
  }, [sendRaw, roomId]);

  const forceMute = useCallback((targetPeerId: string, kind: 'audio' | 'video' | 'both') => {
    sendRaw({ type: 'room.force-mute', roomId, peerId: targetPeerId, kind });
  }, [sendRaw, roomId]);

  const requestUnmute = useCallback((targetPeerId: string, kind: 'audio' | 'video' | 'both') => {
    sendRaw({ type: 'room.request-unmute', roomId, peerId: targetPeerId, kind });
  }, [sendRaw, roomId]);

  const raiseHand = useCallback(() => {
    sendRaw({ type: 'room.raise-hand', roomId });
  }, [sendRaw, roomId]);

  const lowerHand = useCallback((targetPeerId?: string) => {
    sendRaw({ type: 'room.lower-hand', roomId, ...(targetPeerId ? { peerId: targetPeerId } : {}) });
  }, [sendRaw, roomId]);

  const dismissUnmuteRequest = useCallback(() => {
    setUnmuteRequest(null);
  }, []);

  const dismissJoinRequestAlert = useCallback(() => {
    setNewJoinRequestAlert(null);
  }, []);

  const requestBannedJoin = useCallback(() => {
    sendRaw({ type: 'room.request-join', roomId, displayName: displayName ?? peerId });
  }, [sendRaw, roomId, displayName, peerId]);

  return {
    roomState,
    error,
    localStream,
    remoteStreams,
    chatMessages,
    screenStream,
    isScreenSharing,
    participants,
    hostPeerId,
    isHost: hostPeerId === peerId,
    isRoomLocked,
    wasKicked,
    localAudioEnabled,
    localVideoEnabled,
    joinRequests,
    newJoinRequestAlert,
    raisedHands,
    unmuteRequest,
    joinRoom,
    leaveRoom,
    publishMedia,
    unpublishMedia,
    setAudioEnabled,
    setVideoEnabled,
    startScreenShare,
    stopScreenShare,
    sendChatMessage,
    kickParticipant,
    lockRoom,
    approveJoin,
    denyJoin,
    transferHost,
    forceMute,
    requestUnmute,
    raiseHand,
    lowerHand,
    dismissUnmuteRequest,
    dismissJoinRequestAlert,
    requestBannedJoin,
  };
}
