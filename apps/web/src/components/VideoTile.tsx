'use client';

import { useEffect, useRef, useState } from 'react';
import { Maximize2 } from 'lucide-react';

export interface VideoTileProps {
  stream: MediaStream;
  label: string;
  muted?: boolean;
  mirrored?: boolean;
}

export function VideoTile({ stream, label, muted = false, mirrored = false }: VideoTileProps) {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const articleRef = useRef<HTMLElement | null>(null);
  const [isFullscreen, setIsFullscreen] = useState(false);

  useEffect(() => {
    if (!videoRef.current || !stream) return;

    const video = videoRef.current;
    video.srcObject = stream;
    video.muted = muted;

    const play = () => void video.play().catch(() => undefined);

    const onTrackAdded = () => {
      video.srcObject = null;
      video.srcObject = stream;
      play();
    };

    stream.addEventListener('addtrack', onTrackAdded);
    play();

    return () => {
      stream.removeEventListener('addtrack', onTrackAdded);
      video.srcObject = null;
    };
  }, [stream, muted]);

  // Track fullscreen state
  useEffect(() => {
    const onChange = () => setIsFullscreen(!!document.fullscreenElement);
    document.addEventListener('fullscreenchange', onChange);
    return () => document.removeEventListener('fullscreenchange', onChange);
  }, []);

  const enterFullscreen = () => {
    const el = articleRef.current;
    if (!el) return;
    if (isFullscreen) {
      void document.exitFullscreen().catch(() => undefined);
    } else {
      void el.requestFullscreen().catch(() => undefined);
    }
  };

  return (
    <article
      ref={articleRef}
      className="group relative min-h-0 overflow-hidden rounded-2xl border border-slate-800 bg-slate-900 shadow-lg shadow-slate-950/20"
      onDoubleClick={enterFullscreen}
    >
      <video
        ref={videoRef}
        autoPlay
        playsInline
        muted={muted}
        className="block aspect-video w-full bg-slate-950"
        style={{ objectFit: 'cover', transform: mirrored ? 'scaleX(-1)' : undefined }}
      />

      {/* Gradient overlay + label */}
      <div className="pointer-events-none absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/75 via-black/20 to-transparent px-3 pb-2.5 pt-8">
        <span className="line-clamp-1 text-xs font-medium text-white/90">{label}</span>
      </div>

      {/* Fullscreen button — visible on hover */}
      <button
        type="button"
        onClick={enterFullscreen}
        title={isFullscreen ? 'Küçült' : 'Tam ekran'}
        className="absolute right-2 top-2 flex h-7 w-7 items-center justify-center rounded-lg bg-black/50 text-white/70 opacity-0 backdrop-blur-sm transition hover:bg-black/70 hover:text-white group-hover:opacity-100"
      >
        <Maximize2 size={13} />
      </button>
    </article>
  );
}
