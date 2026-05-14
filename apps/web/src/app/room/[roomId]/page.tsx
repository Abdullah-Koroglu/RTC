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
    <main className="flex min-h-screen flex-col bg-slate-950 px-4 py-4 md:px-6">
      <div className="mx-auto flex w-full max-w-6xl flex-1 flex-col gap-4">

        {/* Header */}
        <header className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-slate-800 bg-slate-900/60 px-5 py-3 backdrop-blur">
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <h1 className="truncate text-base font-semibold text-slate-100" title={roomId}>
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
            <p className="mt-0.5 text-xs text-slate-500">{peerId}</p>
          </div>
          <div className="flex items-center gap-1.5 text-xs">
            <span className={`h-1.5 w-1.5 rounded-full ${roomState === 'joined' ? 'bg-emerald-400' : roomState === 'error' ? 'bg-rose-400' : 'bg-amber-400'}`} />
            <span className={statusColor}>{roomState}</span>
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
        <section className="grid flex-1 auto-rows-fr gap-3 md:grid-cols-2 xl:grid-cols-3">
          {localStream && <VideoTile stream={localStream} label={`${peerId} (You)`} muted mirrored />}

          {remoteEntries.map(([remotePeerId, stream]) => (
            <VideoTile key={remotePeerId} stream={stream} label={remotePeerId} />
          ))}

          {roomState === 'joined' && remoteEntries.length === 0 && (
            <div className="flex aspect-video flex-col items-center justify-center rounded-2xl border border-dashed border-slate-700/60 bg-slate-900/30 p-8 text-center">
              <Users size={32} className="mb-3 text-slate-600" />
              <p className="text-sm font-medium text-slate-400">Waiting for participants…</p>
              <p className="mt-1 text-xs text-slate-600">Share the room ID to invite others</p>
            </div>
          )}
        </section>

        {/* Controls */}
        <footer className="sticky bottom-4 flex justify-center">
          <div className="flex items-center gap-2 rounded-2xl border border-slate-800 bg-slate-900/90 px-4 py-3 shadow-xl backdrop-blur">
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

            <div className="mx-1 h-6 w-px bg-slate-700" />

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
