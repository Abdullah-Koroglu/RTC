import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Dimensions,
  Alert,
  Clipboard,
  ActivityIndicator,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import type { MediaStream } from 'react-native-webrtc';
import { mediaDevices } from 'react-native-webrtc';
import * as ExpoClipboard from 'expo-clipboard';
import { C, colorFromLabel, getInitials } from '@/constants/colors';
import { useRoom, type ParticipantState } from '@/hooks/useRoom';
import { Storage, KEYS, getOrCreatePeerId } from '@/lib/storage';
import { VideoTile } from '@/components/VideoTile';
import { ControlBar } from '@/components/ControlBar';
import { ChatPanel } from '@/components/ChatPanel';
import { BreakoutPanel } from '@/components/BreakoutPanel';
import { IcUsers, IcLink } from '@/components/Icons';
import { getEnv } from '@/lib/env';

const { width: SCREEN_W } = Dimensions.get('window');

/* ── Toast ── */
interface ToastItem { id: number; message: string; ini: string; color: string }
function ToastStack({ toasts }: { toasts: ToastItem[] }) {
  if (toasts.length === 0) return null;
  return (
    <View style={toastStyles.stack}>
      {toasts.slice(-3).map((t) => (
        <View key={t.id} style={toastStyles.toast}>
          <View style={[toastStyles.avatar, { backgroundColor: t.color }]}>
            <Text style={toastStyles.avatarText}>{t.ini}</Text>
          </View>
          <Text style={toastStyles.toastText}>{t.message}</Text>
        </View>
      ))}
    </View>
  );
}
const toastStyles = StyleSheet.create({
  stack: { position: 'absolute', bottom: 86, right: 12, gap: 6, zIndex: 300 },
  toast: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: 'rgba(22,27,42,0.95)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 10,
    maxWidth: SCREEN_W * 0.7,
  },
  avatar: {
    width: 26,
    height: 26,
    borderRadius: 13,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  avatarText: { fontSize: 10, fontWeight: '700', color: 'white' },
  toastText: { color: 'rgba(255,255,255,0.88)', fontSize: 13, flexShrink: 1 },
});

/* ── Waiting room ── */
function WaitingRoom({ roomId }: { roomId: string }) {
  const [copied, setCopied] = useState(false);
  const env = getEnv();
  const link = `${env.API_URL}/join/${roomId}`;

  const copy = async () => {
    await ExpoClipboard.setStringAsync(link);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <View style={waitingStyles.container}>
      <Text style={waitingStyles.title}>Waiting for others…</Text>
      <Text style={waitingStyles.sub}>Share the link below to invite people</Text>
      <View style={waitingStyles.linkRow}>
        <IcLink s={14} c="rgba(255,255,255,0.4)" />
        <Text style={waitingStyles.linkText} numberOfLines={1}>{link}</Text>
        <TouchableOpacity
          onPress={() => void copy()}
          style={[waitingStyles.copyBtn, copied && waitingStyles.copyBtnSuccess]}
        >
          <Text style={[waitingStyles.copyBtnText, copied && waitingStyles.copyBtnTextSuccess]}>
            {copied ? '✓ Copied' : 'Copy'}
          </Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}
const waitingStyles = StyleSheet.create({
  container: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24, gap: 12 },
  title: { color: 'white', fontSize: 18, fontWeight: '600', letterSpacing: -0.3, textAlign: 'center' },
  sub: { color: 'rgba(255,255,255,0.38)', fontSize: 13, textAlign: 'center' },
  linkRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: 'rgba(22,27,42,0.8)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
    borderRadius: 14,
    padding: 14,
    width: '100%',
  },
  linkText: { flex: 1, color: 'rgba(255,255,255,0.55)', fontSize: 12 },
  copyBtn: {
    backgroundColor: 'rgba(59,130,246,0.18)',
    borderWidth: 1,
    borderColor: 'rgba(59,130,246,0.3)',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 7,
  },
  copyBtnSuccess: { backgroundColor: 'rgba(34,197,94,0.15)', borderColor: 'rgba(34,197,94,0.3)' },
  copyBtnText: { color: '#3B82F6', fontSize: 12, fontWeight: '600' },
  copyBtnTextSuccess: { color: '#22C55E' },
});

/* ── Video grid ── */
function VideoGrid({
  localStream,
  remoteEntries,
  displayName,
  isAudioEnabled,
  isVideoEnabled,
  participants,
  localPhoto,
}: {
  localStream: MediaStream | null;
  remoteEntries: [string, MediaStream][];
  displayName: string;
  isAudioEnabled: boolean;
  isVideoEnabled: boolean;
  participants: Map<string, ParticipantState>;
  localPhoto?: string | null;
}) {
  const resolve = (key: string) => participants.get(key)?.displayName ?? key;

  const tiles: Array<{
    key: string;
    stream: MediaStream;
    label: string;
    muted: boolean;
    mirrored?: boolean;
    isMicMuted?: boolean;
    cameraEnabled?: boolean;
    photo?: string | null;
  }> = [];

  if (localStream) {
    tiles.push({ key: '__local', stream: localStream, label: `${displayName} (You)`, muted: true, mirrored: true, isMicMuted: !isAudioEnabled, cameraEnabled: isVideoEnabled, photo: localPhoto ?? null });
  }

  for (const [key, stream] of remoteEntries) {
    if (key.endsWith(':screen')) continue;
    const pState = participants.get(key);
    tiles.push({
      key,
      stream,
      label: resolve(key),
      muted: false,
      ...(pState ? { isMicMuted: !pState.micEnabled, cameraEnabled: pState.cameraEnabled, photo: pState.photo ?? null } : {}),
    });
  }

  if (tiles.length === 0) return null;

  if (tiles.length === 1) {
    return (
      <View style={gridStyles.single}>
        <VideoTile {...tiles[0]!} />
      </View>
    );
  }

  if (tiles.length === 2) {
    return (
      <View style={gridStyles.two}>
        {tiles.map((t) => (
          <View key={t.key} style={gridStyles.twoItem}>
            <VideoTile {...t} />
          </View>
        ))}
      </View>
    );
  }

  // 3+: 2 columns
  const cols = 2;
  const rows = Math.ceil(tiles.length / cols);
  return (
    <View style={[gridStyles.grid, { aspectRatio: cols / rows }]}>
      {tiles.map((t) => (
        <View key={t.key} style={{ width: '50%', padding: 4 }}>
          <View style={{ aspectRatio: 1 }}>
            <VideoTile {...t} />
          </View>
        </View>
      ))}
    </View>
  );
}
const gridStyles = StyleSheet.create({
  single: { flex: 1, padding: 8 },
  two: { flex: 1, padding: 8, gap: 6 },
  twoItem: { flex: 1 },
  grid: { width: '100%', flexWrap: 'wrap', flexDirection: 'row', padding: 4 },
});

/* ── Top bar ── */
function TopBar({ roomId, count, elapsed }: { roomId: string; count: number; elapsed: number }) {
  const fmt = (s: number) => `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;
  return (
    <View style={topBarStyles.bar}>
      <Text style={topBarStyles.roomId} numberOfLines={1}>{roomId}</Text>
      <View style={topBarStyles.right}>
        <View style={topBarStyles.timer}>
          <View style={topBarStyles.greenDot} />
          <Text style={topBarStyles.timerText}>{fmt(elapsed)}</Text>
        </View>
        <View style={topBarStyles.countRow}>
          <IcUsers s={14} c="rgba(255,255,255,0.38)" />
          <Text style={topBarStyles.countText}>{count}</Text>
        </View>
      </View>
    </View>
  );
}
const topBarStyles = StyleSheet.create({
  bar: {
    height: 52,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    backgroundColor: 'rgba(10,12,18,0.9)',
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.06)',
  },
  roomId: { color: 'rgba(255,255,255,0.88)', fontSize: 14, fontWeight: '600', flex: 1, maxWidth: 200 },
  right: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  timer: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  greenDot: { width: 7, height: 7, borderRadius: 3.5, backgroundColor: C.green },
  timerText: { color: 'rgba(255,255,255,0.38)', fontSize: 12 },
  countRow: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  countText: { color: 'rgba(255,255,255,0.38)', fontSize: 13 },
});

/* ── Room Page ── */
export default function RoomScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { roomId: rawRoomId } = useLocalSearchParams<{ roomId: string }>();
  const roomId = decodeURIComponent(rawRoomId ?? '');

  const [peerId, setPeerId] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [isAudioEnabled, setIsAudioEnabled] = useState(true);
  const [isVideoEnabled, setIsVideoEnabled] = useState(true);
  const [hasPublished, setHasPublished] = useState(false);
  const [isChatOpen, setIsChatOpen] = useState(false);
  const [isBreakoutOpen, setIsBreakoutOpen] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  const [toasts, setToasts] = useState<ToastItem[]>([]);
  const [elapsed, setElapsed] = useState(0);
  const [initialMicEnabled, setInitialMicEnabled] = useState(true);
  const [initialCameraEnabled, setInitialCameraEnabled] = useState(true);
  const [ready, setReady] = useState(false);

  const prevRemoteKeys = useRef<Set<string>>(new Set());

  // Load session data
  useEffect(() => {
    Promise.all([
      getOrCreatePeerId(),
      Storage.get(KEYS.DISPLAY_NAME),
      Storage.get(KEYS.MIC_ON),
      Storage.get(KEYS.CAM_ON),
    ]).then(([pid, name, micOn, camOn]) => {
      setPeerId(pid);
      setDisplayName(name ?? 'Guest');
      const mic = micOn !== '0';
      const cam = camOn !== '0';
      setInitialMicEnabled(mic);
      setInitialCameraEnabled(cam);
      setIsAudioEnabled(mic);
      setIsVideoEnabled(cam);
      setReady(true);
    });
  }, []);

  const {
    roomState,
    localStream,
    remoteStreams,
    chatMessages,
    participants,
    leaveRoom,
    publishMedia,
    unpublishMedia,
    setAudioEnabled,
    setVideoEnabled,
    sendChatMessage,
  } = useRoom({
    roomId,
    peerId,
    displayName,
    autoJoin: ready && peerId !== '',
    initialMicEnabled,
    initialCameraEnabled,
    photo: null,
  });

  // Timer
  useEffect(() => {
    if (roomState !== 'joined') return;
    const t = setInterval(() => setElapsed((s) => s + 1), 1000);
    return () => clearInterval(t);
  }, [roomState]);

  // Redirect if no display name
  useEffect(() => {
    Storage.get(KEYS.DISPLAY_NAME).then((name) => {
      if (!name) router.navigate({ pathname: '/join/[roomId]', params: { roomId } });
    });
  }, [roomId, router]);

  // Auto-publish
  useEffect(() => {
    if (roomState !== 'joined' || hasPublished || !ready) return;
    const wantsAudio = initialMicEnabled;
    const wantsVideo = initialCameraEnabled;

    // If user joins with both disabled, skip capture to avoid unnecessary prompts.
    if (!wantsAudio && !wantsVideo) {
      setHasPublished(true);
      return;
    }

    const constraints = {
      video: wantsVideo ? { facingMode: 'user' } : false,
      audio: wantsAudio,
    };

    void publishMedia(constraints).then((stream) => {
      if (stream) {
        setHasPublished(true);
        setAudioEnabled(initialMicEnabled);
        setVideoEnabled(initialCameraEnabled);
      }
    });
  }, [roomState, hasPublished, ready, publishMedia, setAudioEnabled, setVideoEnabled, initialMicEnabled, initialCameraEnabled]);

  // Toast on join/leave
  const addToast = (message: string, ini: string, color: string) => {
    const id = Date.now() + Math.random();
    setToasts((prev) => [...prev, { id, message, ini, color }]);
    setTimeout(() => setToasts((prev) => prev.filter((t) => t.id !== id)), 3800);
  };

  useEffect(() => {
    const currentKeys = new Set(remoteStreams.keys());
    for (const key of currentKeys) {
      if (!prevRemoteKeys.current.has(key) && !key.endsWith(':screen')) {
        const name = participants.get(key)?.displayName ?? key;
        const ini = getInitials(name);
        addToast(`${name} joined`, ini, colorFromLabel(key));
      }
    }
    for (const key of prevRemoteKeys.current) {
      if (!currentKeys.has(key) && !key.endsWith(':screen')) {
        const name = participants.get(key)?.displayName ?? key;
        const ini = getInitials(name);
        addToast(`${name} left`, ini, '#6B7280');
      }
    }
    prevRemoteKeys.current = currentKeys;
  }, [remoteStreams, participants]);

  // Unread badge
  useEffect(() => {
    if (isChatOpen || chatMessages.length === 0) return;
    const last = chatMessages.at(-1);
    if (last && !last.isSelf) setUnreadCount((n) => n + 1);
  }, [chatMessages, isChatOpen]);

  const remoteEntries = useMemo(() => Array.from(remoteStreams.entries()), [remoteStreams]);
  const participantCount = (localStream ? 1 : 0) + remoteEntries.filter(([k]) => !k.endsWith(':screen')).length;
  const hasRemotes = remoteEntries.filter(([k]) => !k.endsWith(':screen')).length > 0;
  const isWaiting = roomState === 'joined' && !hasRemotes;

  const onToggleAudio = () => {
    const next = !isAudioEnabled;
    setAudioEnabled(next);
    setIsAudioEnabled(next);
  };

  const onToggleVideo = () => {
    const next = !isVideoEnabled;
    setVideoEnabled(next);
    setIsVideoEnabled(next);
  };

  const onLeave = async () => {
    try { await leaveRoom(); } finally { router.replace('/'); }
  };

  const onJoinBreakout = async (targetRoomId: string) => {
    setIsBreakoutOpen(false);
    try { await leaveRoom(); } catch { /* ignore */ }
    router.navigate({ pathname: '/room/[roomId]', params: { roomId: targetRoomId } });
  };

  if (!ready || peerId === '') {
    return (
      <View style={styles.loading}>
        <ActivityIndicator color={C.blue} size="large" />
      </View>
    );
  }

  return (
    <View style={[styles.root, { paddingTop: insets.top }]}>
      <TopBar roomId={roomId} count={participantCount} elapsed={elapsed} />

      {/* Main content */}
      <View style={styles.content}>
        {roomState === 'joining' && (
          <View style={styles.center}>
            <ActivityIndicator color={C.blue} size="large" />
            <Text style={styles.joiningText}>Connecting…</Text>
          </View>
        )}

        {roomState === 'joined' && isWaiting && (
          <View style={styles.flex}>
            <WaitingRoom roomId={roomId} />
            {/* PiP self preview */}
            {localStream && (
              <View style={styles.pip}>
                <VideoTile
                  stream={localStream}
                  label={`${displayName} (You)`}
                  muted
                  mirrored
                  isMicMuted={!isAudioEnabled}
                  cameraEnabled={isVideoEnabled}
                />
              </View>
            )}
          </View>
        )}

        {roomState === 'joined' && !isWaiting && (
          <VideoGrid
            localStream={localStream}
            remoteEntries={remoteEntries}
            displayName={displayName}
            isAudioEnabled={isAudioEnabled}
            isVideoEnabled={isVideoEnabled}
            participants={participants}
            localPhoto={null}
          />
        )}

        {roomState === 'error' && (
          <View style={styles.center}>
            <Text style={styles.errorText}>Connection error. Please try again.</Text>
            <TouchableOpacity onPress={() => router.replace('/')} style={styles.errorBtn}>
              <Text style={styles.errorBtnText}>Go back</Text>
            </TouchableOpacity>
          </View>
        )}
      </View>

      <ControlBar
        micOn={isAudioEnabled}
        camOn={isVideoEnabled}
        chatOpen={isChatOpen}
        breakoutOpen={isBreakoutOpen}
        unread={unreadCount}
        onMic={onToggleAudio}
        onCam={onToggleVideo}
        onChat={() => {
          setIsChatOpen((v) => {
            if (!v) { setUnreadCount(0); setIsBreakoutOpen(false); }
            return !v;
          });
        }}
        onBreakout={() => {
          setIsBreakoutOpen((v) => {
            if (!v) setIsChatOpen(false);
            return !v;
          });
        }}
        onLeave={() => void onLeave()}
      />

      <ToastStack toasts={toasts} />

      {/* Panels — rendered on top */}
      <ChatPanel
        open={isChatOpen}
        messages={chatMessages}
        onClose={() => setIsChatOpen(false)}
        onSend={sendChatMessage}
      />
      <BreakoutPanel
        open={isBreakoutOpen}
        onClose={() => setIsBreakoutOpen(false)}
        currentRoomId={roomId}
        onJoin={(id) => void onJoinBreakout(id)}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: C.bg },
  content: { flex: 1 },
  flex: { flex: 1, position: 'relative' },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 12 },
  loading: { flex: 1, backgroundColor: C.bg, alignItems: 'center', justifyContent: 'center' },
  joiningText: { color: 'rgba(255,255,255,0.4)', fontSize: 14 },
  pip: {
    position: 'absolute',
    bottom: 12,
    right: 12,
    width: 130,
    aspectRatio: 16 / 9,
    borderRadius: 10,
    overflow: 'hidden',
    borderWidth: 2,
    borderColor: 'rgba(59,130,246,0.5)',
  },
  errorText: {
    color: '#F87171',
    fontSize: 14,
    textAlign: 'center',
    backgroundColor: 'rgba(239,68,68,0.1)',
    borderWidth: 1,
    borderColor: 'rgba(239,68,68,0.3)',
    borderRadius: 12,
    paddingHorizontal: 20,
    paddingVertical: 14,
  },
  errorBtn: {
    backgroundColor: C.blue,
    borderRadius: 10,
    paddingHorizontal: 20,
    paddingVertical: 10,
  },
  errorBtnText: { color: 'white', fontSize: 14, fontWeight: '600' },
});
