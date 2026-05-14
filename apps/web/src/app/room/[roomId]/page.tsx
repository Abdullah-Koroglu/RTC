'use client';

import { useEffect, useMemo, useState } from 'react';
import { useParams, useRouter, useSearchParams } from 'next/navigation';
import { Check, Copy, Mic, MicOff, PhoneOff, Users, Video, VideoOff } from 'lucide-react';
import { useRoom } from '@/hooks/useRoom';
import { VideoTile } from '@/components/VideoTile';
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

  const { roomState, error, localStream, remoteStreams, leaveRoom, publishMedia, setAudioEnabled, setVideoEnabled } =
    useRoom({ roomId, peerId, autoJoin: true });

  useEffect(() => {
    if (roomState !== 'joined' || hasPublished) return;
    const startPublishing = async () => {
      const stream = await publishMedia({ audio: true, video: true });
      if (stream) setHasPublished(true);
    };
    void startPublishing();
  }, [roomState, hasPublished, publishMedia]);

  const remoteEntries = useMemo(() => Array.from(remoteStreams.entries()), [remoteStreams]);
  const participantCount = remoteEntries.length + (localStream ? 1 : 0);

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
    await leaveRoom();
    router.push('/');
  };

  const onCopyRoomId = () => {
    void navigator.clipboard.writeText(roomId);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const statusColor =
    roomState === 'joined' ? 'text-emerald-400' : roomState === 'error' ? 'text-rose-400' : 'text-amber-400';

  return (
    <main className="min-h-screen bg-[radial-gradient(circle_at_top,_rgba(34,211,238,0.12),_transparent_28%),linear-gradient(180deg,_#020617_0%,_#020617_45%,_#0f172a_100%)] px-3 py-3 sm:px-4 sm:py-4 md:px-6">
      <div className="mx-auto flex min-h-[calc(100dvh-1.5rem)] w-full max-w-7xl flex-col gap-4 sm:min-h-[calc(100dvh-2rem)]">

        {/* Header */}
        <header className="flex flex-col gap-3 rounded-2xl border border-slate-800 bg-slate-900/70 px-4 py-4 shadow-2xl shadow-slate-950/30 backdrop-blur sm:flex-row sm:items-center sm:justify-between sm:px-5 sm:py-3">
          <div className="min-w-0 space-y-1">
            <div className="flex items-center gap-2">
              <h1 className="truncate text-sm font-semibold text-slate-100 sm:text-base" title={roomId}>
                {roomId}
              </h1>
              <button
                type="button"
                onClick={onCopyRoomId}
                title="Copy room ID"
                className="shrink-0 text-slate-500 transition hover:text-slate-300"
              >
                {copied ? <Check size={13} className="text-emerald-400" /> : <Copy size={13} />}
              </button>
            </div>
            <p className="text-xs text-slate-500">{peerId}</p>
          </div>
          <div className="flex flex-wrap items-center gap-2 text-xs sm:justify-end">
            <span className="rounded-full border border-slate-700 bg-slate-950/50 px-2.5 py-1 text-slate-300">
              {participantCount} participant{participantCount === 1 ? '' : 's'}
            </span>
            <span className="rounded-full border border-slate-700 bg-slate-950/50 px-2.5 py-1 capitalize text-slate-300">
              <span className={`mr-1 inline-block h-1.5 w-1.5 rounded-full ${roomState === 'joined' ? 'bg-emerald-400' : roomState === 'error' ? 'bg-rose-400' : 'bg-amber-400'}`} />
              {roomState}
            </span>
          </div>
        </header>

        {/* Alerts */}
        {roomState === 'joining' && (
          <div className="flex items-center gap-2 rounded-xl border border-amber-900/50 bg-amber-950/40 px-4 py-3 text-sm text-amber-300">
            <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-amber-400" />
            Joining room…
          </div>
        )}
        {error && (
          <div className="rounded-xl border border-rose-900/50 bg-rose-950/40 px-4 py-3 text-sm text-rose-300">
            {error.message}
          </div>
        )}

        {/* Video grid */}
        <section className="grid flex-1 auto-rows-fr gap-3 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4">
          {localStream && <VideoTile stream={localStream} label={`${peerId} (You)`} muted mirrored />}

          {remoteEntries.map(([remotePeerId, stream]) => (
            <VideoTile key={remotePeerId} stream={stream} label={remotePeerId} />
          ))}

          {roomState === 'joined' && remoteEntries.length === 0 && (
            <div className="flex min-h-[220px] flex-col items-center justify-center rounded-2xl border border-dashed border-slate-700/60 bg-slate-900/30 p-6 text-center sm:min-h-[280px] sm:p-8">
              <Users size={32} className="mb-3 text-slate-600" />
              <p className="text-sm font-medium text-slate-300">Waiting for participants…</p>
              <p className="mt-1 max-w-xs text-xs leading-5 text-slate-500">Share the room ID to invite others. New participants will appear here automatically.</p>
            </div>
          )}
        </section>

        {/* Controls */}
        <footer className="sticky bottom-3 flex justify-center pb-[env(safe-area-inset-bottom)]">
          <div className="flex w-full flex-wrap items-center justify-center gap-2 rounded-2xl border border-slate-800 bg-slate-900/90 px-3 py-3 shadow-xl backdrop-blur sm:w-auto sm:px-4">
            {/* Audio toggle */}
            <button
              type="button"
              onClick={onToggleAudio}
              title={isAudioEnabled ? 'Mute' : 'Unmute'}
              className={`flex h-11 w-11 items-center justify-center rounded-xl transition ${
                isAudioEnabled
                  ? 'border border-slate-700 text-slate-300 hover:bg-slate-800'
                  : 'bg-rose-600 text-white hover:bg-rose-500'
              }`}
            >
              {isAudioEnabled ? <Mic size={18} /> : <MicOff size={18} />}
            </button>

            {/* Video toggle */}
            <button
              type="button"
              onClick={onToggleVideo}
              title={isVideoEnabled ? 'Stop video' : 'Start video'}
              className={`flex h-11 w-11 items-center justify-center rounded-xl transition ${
                isVideoEnabled
                  ? 'border border-slate-700 text-slate-300 hover:bg-slate-800'
                  : 'bg-rose-600 text-white hover:bg-rose-500'
              }`}
            >
              {isVideoEnabled ? <Video size={18} /> : <VideoOff size={18} />}
            </button>

            <div className="mx-1 hidden h-6 w-px bg-slate-700 sm:block" />

            {/* Leave */}
            <button
              type="button"
              onClick={() => void onLeave()}
              title="Leave room"
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
