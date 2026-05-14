'use client';

import { useEffect, useRef } from 'react';

export interface VideoTileProps {
  stream: MediaStream;
  label: string;
  muted?: boolean;
  mirrored?: boolean;
}

export function VideoTile({ stream, label, muted = false, mirrored = false }: VideoTileProps) {
  const videoRef = useRef<HTMLVideoElement | null>(null);

  useEffect(() => {
    if (!videoRef.current || !stream) {
      return;
    }

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

  return (
    <article className="relative min-h-0 overflow-hidden rounded-2xl border border-slate-800 bg-slate-900 shadow-lg shadow-slate-950/20">
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
    </article>
  );
}
