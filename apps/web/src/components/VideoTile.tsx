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
    if (!videoRef.current) {
      return;
    }

    videoRef.current.srcObject = stream;
    return () => {
      if (videoRef.current) {
        videoRef.current.srcObject = null;
      }
    };
  }, [stream]);

  return (
    <article className="overflow-hidden rounded-xl border border-slate-800 bg-slate-900">
      <video
        ref={videoRef}
        autoPlay
        playsInline
        muted={muted}
        className={mirrored ? 'aspect-video w-full bg-slate-950 object-cover [transform:scaleX(-1)]' : 'aspect-video w-full bg-slate-950 object-cover'}
      />
      <p className="border-t border-slate-800 px-3 py-2 text-xs font-medium text-slate-200">{label}</p>
    </article>
  );
}
