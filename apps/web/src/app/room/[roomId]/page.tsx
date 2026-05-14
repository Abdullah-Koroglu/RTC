'use client';

import { useEffect, useMemo, useState } from 'react';
import { useParams, useRouter, useSearchParams } from 'next/navigation';
import { Check, Copy, MessageSquare, Mic, MicOff, Monitor, MonitorOff, PhoneOff, Users, Video, VideoOff } from 'lucide-react';
import { useRoom } from '@/hooks/useRoom';
import { VideoTile } from '@/components/VideoTile';
import { ChatPanel } from '@/components/ChatPanel';
import { generateUUID } from '@/lib/uuid';

export default function RoomPage() {
  const router = useRouter();
  const params = useParams<{ roomId: string }>();
  const searchParams = useSearchParams();

  const roomId = decodeURIComponent(params.roomId ?? '');
  const peerIdFromQuery = searchParams.get('peerId')?.trim();
  const [peerId] = useState(() => peerIdFromQuery ?? `peer-${generateUUID().slice(0, 8)}`);

  const [isAudioEnabled, setIsAudioEnabled] = useState(true);
  const [isVideoEnabled, setIsVideoEnabled] = useState(true);
  const [hasPublished, setHasPublished] = useState(false);
  const [copied, setCopied] = useState(false);
  const [isChatOpen, setIsChatOpen] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);

  const {
    roomState,
    error,
    localStream,
    remoteStreams,
    chatMessages,
    screenStream,
    isScreenSharing,
    leaveRoom,
    publishMedia,
    setAudioEnabled,
    setVideoEnabled,
    startScreenShare,
    stopScreenShare,
    sendChatMessage,
  } = useRoom({ roomId, peerId, autoJoin: true });

  useEffect(() => {
    if (roomState !== 'joined' || hasPublished) return;
    const startPublishing = async () => {
      const stream = await publishMedia({ audio: true, video: true });
      if (stream) setHasPublished(true);
    };
    void startPublishing();
  }, [roomState, hasPublished, publishMedia]);

  // Badge: count unread messages when chat is closed
  useEffect(() => {
    if (isChatOpen || chatMessages.length === 0) return;
    const last = chatMessages.at(-1);
    if (last && !last.isSelf) setUnreadCount((n) => n + 1);
  }, [chatMessages, isChatOpen]);

  const remoteEntries = useMemo(() => Array.from(remoteStreams.entries()), [remoteStreams]);

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

  const onToggleScreen = () => {
    if (isScreenSharing) stopScreenShare();
    else void startScreenShare();
  };

  const onLeave = async () => {
    try {
      await leaveRoom();
    } finally {
      router.push('/');
    }
  };

  const onCopyRoomId = () => {
    void navigator.clipboard.writeText(roomId);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleOpenChat = () => {
    setIsChatOpen(true);
    setUnreadCount(0);
  };

  const statusDot =
    roomState === 'joined' ? 'bg-emerald-400' : roomState === 'error' ? 'bg-rose-400' : 'bg-amber-400';
  const statusText =
    roomState === 'joined' ? 'text-emerald-400' : roomState === 'error' ? 'text-rose-400' : 'text-amber-400';

  return (
    <main className="flex min-h-screen flex-col bg-slate-950 px-4 py-4 md:px-6">
      <div className="mx-auto flex w-full max-w-7xl flex-1 flex-col gap-4">

        {/* ── Header ─────────────────────────────────────────────────── */}
        <header className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-slate-800 bg-slate-900/60 px-5 py-3 backdrop-blur">
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <h1
                className="max-w-xs truncate text-base font-semibold text-slate-100 sm:max-w-sm md:max-w-lg"
                title={roomId}
              >
                {roomId}
              </h1>
              <button
                type="button"
                onClick={onCopyRoomId}
                title="Oda ID'sini kopyala"
                className="shrink-0 text-slate-500 transition hover:text-slate-300"
              >
                {copied ? <Check size={13} className="text-emerald-400" /> : <Copy size={13} />}
              </button>
            </div>
            <p className="mt-0.5 text-xs text-slate-500">{peerId}</p>
          </div>
          <div className="flex items-center gap-1.5 text-xs">
            <span className={`h-1.5 w-1.5 rounded-full ${statusDot}`} />
            <span className={statusText}>{roomState}</span>
          </div>
        </header>

        {/* ── Alerts ─────────────────────────────────────────────────── */}
        {roomState === 'joining' && (
          <div className="flex items-center gap-2 rounded-xl border border-amber-900/50 bg-amber-950/40 px-4 py-3 text-sm text-amber-300">
            <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-amber-400" />
            Odaya katılınıyor…
          </div>
        )}
        {error && (
          <div className="rounded-xl border border-rose-900/50 bg-rose-950/40 px-4 py-3 text-sm text-rose-300">
            {error.message}
          </div>
        )}

        {/* ── Main: video grid + chat panel ──────────────────────────── */}
        <div className={`flex flex-1 gap-3 ${isChatOpen ? 'flex-col md:flex-row' : ''}`}>

          {/* Video grid */}
          <section
            className={`grid auto-rows-fr gap-3 ${
              isChatOpen
                ? 'flex-1 grid-cols-1 sm:grid-cols-2'
                : 'grid-cols-1 sm:grid-cols-2 xl:grid-cols-3'
            }`}
          >
            {localStream && (
              <VideoTile stream={localStream} label={`${peerId} (Sen)`} muted mirrored />
            )}

            {screenStream && (
              <VideoTile stream={screenStream} label={`${peerId} (Ekranın)`} muted />
            )}

            {remoteEntries.map(([key, stream]) => {
              const isScreen = key.endsWith(':screen');
              const label = isScreen ? `${key.replace(':screen', '')} (Ekran)` : key;
              return <VideoTile key={key} stream={stream} label={label} />;
            })}

            {roomState === 'joined' && remoteEntries.length === 0 && (
              <div className="flex aspect-video flex-col items-center justify-center rounded-2xl border border-dashed border-slate-700/60 bg-slate-900/30 p-8 text-center">
                <Users size={32} className="mb-3 text-slate-600" />
                <p className="text-sm font-medium text-slate-400">Katılımcı bekleniyor…</p>
                <p className="mt-1 text-xs text-slate-600">Oda ID&apos;sini paylaşarak davet et</p>
              </div>
            )}
          </section>

          {/* Chat panel */}
          {isChatOpen && (
            <div className="h-[420px] w-full shrink-0 md:h-auto md:w-80 lg:w-96">
              <ChatPanel
                messages={chatMessages}
                peerId={peerId}
                onSend={sendChatMessage}
                onClose={() => setIsChatOpen(false)}
              />
            </div>
          )}
        </div>

        {/* ── Controls ───────────────────────────────────────────────── */}
        <footer className="sticky bottom-4 flex justify-center">
          <div className="flex items-center gap-2 rounded-2xl border border-slate-800 bg-slate-900/90 px-4 py-3 shadow-xl backdrop-blur">

            <button
              type="button"
              onClick={onToggleAudio}
              title={isAudioEnabled ? 'Mikrofonu kapat' : 'Mikrofonu aç'}
              className={`flex h-11 w-11 items-center justify-center rounded-xl transition ${
                isAudioEnabled
                  ? 'border border-slate-700 text-slate-300 hover:bg-slate-800'
                  : 'bg-rose-600 text-white hover:bg-rose-500'
              }`}
            >
              {isAudioEnabled ? <Mic size={18} /> : <MicOff size={18} />}
            </button>

            <button
              type="button"
              onClick={onToggleVideo}
              title={isVideoEnabled ? 'Kamerayı kapat' : 'Kamerayı aç'}
              className={`flex h-11 w-11 items-center justify-center rounded-xl transition ${
                isVideoEnabled
                  ? 'border border-slate-700 text-slate-300 hover:bg-slate-800'
                  : 'bg-rose-600 text-white hover:bg-rose-500'
              }`}
            >
              {isVideoEnabled ? <Video size={18} /> : <VideoOff size={18} />}
            </button>

            <button
              type="button"
              onClick={onToggleScreen}
              title={isScreenSharing ? 'Ekran paylaşımını durdur' : 'Ekranı paylaş'}
              className={`flex h-11 w-11 items-center justify-center rounded-xl transition ${
                isScreenSharing
                  ? 'bg-cyan-600 text-white hover:bg-cyan-500'
                  : 'border border-slate-700 text-slate-300 hover:bg-slate-800'
              }`}
            >
              {isScreenSharing ? <MonitorOff size={18} /> : <Monitor size={18} />}
            </button>

            <button
              type="button"
              onClick={handleOpenChat}
              title="Sohbet"
              className="relative flex h-11 w-11 items-center justify-center rounded-xl border border-slate-700 text-slate-300 transition hover:bg-slate-800"
            >
              <MessageSquare size={18} />
              {unreadCount > 0 && (
                <span className="absolute -right-0.5 -top-0.5 flex h-4 w-4 items-center justify-center rounded-full bg-cyan-500 text-[10px] font-bold text-white">
                  {unreadCount > 9 ? '9+' : unreadCount}
                </span>
              )}
            </button>

            <div className="mx-1 h-6 w-px bg-slate-700" />

            <button
              type="button"
              onClick={() => void onLeave()}
              title="Görüşmeden ayrıl"
              className="flex h-11 w-11 items-center justify-center rounded-xl bg-rose-600 text-white transition hover:bg-rose-500"
            >
              <PhoneOff size={18} />
            </button>
          </div>
        </footer>

      </div>
    </main>
  );
}
