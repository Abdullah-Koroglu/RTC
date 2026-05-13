'use client';

import { useEffect, useMemo, useState } from 'react';
import { useParams, useRouter, useSearchParams } from 'next/navigation';
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

  const { roomState, error, localStream, remoteStreams, leaveRoom, publishMedia, setAudioEnabled, setVideoEnabled } =
    useRoom({ roomId, peerId, autoJoin: true });

  useEffect(() => {
    if (roomState !== 'joined' || hasPublished) {
      return;
    }

    const startPublishing = async () => {
      const stream = await publishMedia({ audio: true, video: true });
      if (stream) {
        setHasPublished(true);
      }
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

  return (
    <main className="min-h-screen bg-slate-950 px-4 py-6 text-slate-100 md:px-8">
      <div className="mx-auto flex w-full max-w-6xl flex-col gap-5">
        <header className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-slate-800 bg-slate-900/70 p-4">
          <div>
            <h1 className="text-xl font-semibold">Room: {roomId}</h1>
            <p className="text-xs text-slate-300">Peer: {peerId}</p>
          </div>
          <div className="text-sm">
            Status:{' '}
            <span className={roomState === 'joined' ? 'text-emerald-400' : roomState === 'error' ? 'text-rose-300' : 'text-amber-300'}>
              {roomState}
            </span>
          </div>
        </header>

        {roomState === 'joining' ? (
          <div className="rounded-xl border border-slate-800 bg-slate-900/70 p-4 text-sm text-amber-300">Joining room...</div>
        ) : null}

        {error ? (
          <div className="rounded-xl border border-rose-900 bg-rose-950/60 p-4 text-sm text-rose-200">Error: {error.message}</div>
        ) : null}

        <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {localStream ? <VideoTile stream={localStream} label={`${peerId} (You)`} muted mirrored /> : null}
          {remoteEntries.map(([remotePeerId, stream]) => (
            <VideoTile key={remotePeerId} stream={stream} label={remotePeerId} />
          ))}
        </section>

        <footer className="sticky bottom-4 rounded-xl border border-slate-800 bg-slate-900/90 p-3 backdrop-blur">
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={onToggleAudio}
              className="rounded-md border border-slate-700 px-4 py-2 text-sm hover:bg-slate-800"
            >
              {isAudioEnabled ? 'Mute' : 'Unmute'}
            </button>
            <button
              type="button"
              onClick={onToggleVideo}
              className="rounded-md border border-slate-700 px-4 py-2 text-sm hover:bg-slate-800"
            >
              {isVideoEnabled ? 'Camera Off' : 'Camera On'}
            </button>
            <button
              type="button"
              onClick={() => void onLeave()}
              className="rounded-md bg-rose-600 px-4 py-2 text-sm font-medium text-white hover:bg-rose-500"
            >
              Leave Room
            </button>
          </div>
        </footer>
      </div>
    </main>
  );
}
