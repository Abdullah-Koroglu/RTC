'use client';

import { useEffect, useRef, useState } from 'react';

export interface VideoTileProps {
  stream: MediaStream;
  label: string;
  muted?: boolean | undefined;
  mirrored?: boolean | undefined;
  isSpeaking?: boolean | undefined;
  isMicMuted?: boolean | undefined;
  color?: string | undefined;
}

const TILE_COLORS = ['#3B82F6', '#8B5CF6', '#EC4899', '#10B981', '#F59E0B', '#EF4444'];

function colorFromLabel(label: string): string {
  let hash = 0;
  for (let i = 0; i < label.length; i++) hash = (hash * 31 + label.charCodeAt(i)) & 0xfffffff;
  return TILE_COLORS[hash % TILE_COLORS.length]!;
}

function getInitials(label: string): string {
  const base = label.replace(/\s*\(.*?\)\s*/g, '').trim();
  return base.split(' ').filter(Boolean).map((n) => n[0]).join('').toUpperCase().slice(0, 2) || '??';
}

const IcMicOff = ({ s = 10, c = 'white' }: { s?: number; c?: string }) => (
  <svg width={s} height={s} viewBox="0 0 24 24" stroke={c} strokeWidth="2" fill="none" strokeLinecap="round" strokeLinejoin="round">
    <line x1="2" y1="2" x2="22" y2="22"/>
    <path d="M18.89 13.23A7.12 7.12 0 0 0 19 12v-2"/>
    <path d="M5 10v2a7 7 0 0 0 12 5"/>
    <path d="M15 9.34V5a3 3 0 0 0-5.68-1.33"/>
    <path d="M9 9v3a3 3 0 0 0 5.12 2.12"/>
    <line x1="12" y1="19" x2="12" y2="22"/>
  </svg>
);

const IcMaximize = ({ s = 13, c = 'currentColor' }: { s?: number; c?: string }) => (
  <svg width={s} height={s} viewBox="0 0 24 24" stroke={c} strokeWidth="2" fill="none" strokeLinecap="round" strokeLinejoin="round">
    <path d="M8 3H5a2 2 0 0 0-2 2v3m18 0V5a2 2 0 0 0-2-2h-3m0 18h3a2 2 0 0 0 2-2v-3M3 16v3a2 2 0 0 0 2 2h3"/>
  </svg>
);

export function VideoTile({ stream, label, muted = false, mirrored = false, isSpeaking = false, isMicMuted = false, color }: VideoTileProps) {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const articleRef = useRef<HTMLElement | null>(null);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [videoActive, setVideoActive] = useState(false);

  const tileColor = color ?? colorFromLabel(label);
  const initials = getInitials(label);

  useEffect(() => {
    if (!videoRef.current || !stream) return;
    const video = videoRef.current;
    video.srcObject = stream;
    video.muted = muted;

    const play = () => void video.play().catch(() => undefined);
    const onActive = () => setVideoActive(true);

    const onTrackAdded = () => {
      video.srcObject = null;
      video.srcObject = stream;
      play();
    };

    // Mark video as active once it starts playing — any event that fires on real data
    video.addEventListener('playing', onActive);
    video.addEventListener('canplay', onActive);
    stream.addEventListener('addtrack', onTrackAdded);
    play();

    return () => {
      stream.removeEventListener('addtrack', onTrackAdded);
      video.removeEventListener('playing', onActive);
      video.removeEventListener('canplay', onActive);
      video.srcObject = null;
    };
  }, [stream, muted]);

  // Reset videoActive when stream changes so avatar shows briefly again
  useEffect(() => { setVideoActive(false); }, [stream]);

  useEffect(() => {
    const onChange = () => setIsFullscreen(!!document.fullscreenElement);
    document.addEventListener('fullscreenchange', onChange);
    return () => document.removeEventListener('fullscreenchange', onChange);
  }, []);

  const hasVideoTracks = stream.getVideoTracks().length > 0;

  const enterFullscreen = () => {
    const el = articleRef.current;
    if (!el) return;
    if (isFullscreen) void document.exitFullscreen().catch(() => undefined);
    else void el.requestFullscreen().catch(() => undefined);
  };

  return (
    <article
      ref={articleRef}
      onDoubleClick={enterFullscreen}
      style={{
        position: 'relative',
        width: '100%',
        height: '100%',
        borderRadius: 14,
        overflow: 'hidden',
        background: '#141820',
        border: isSpeaking ? '2px solid #3B82F6' : '2px solid rgba(255,255,255,0.04)',
        boxShadow: isSpeaking ? '0 0 0 4px rgba(59,130,246,0.2)' : undefined,
        animation: isSpeaking ? 'speakPulse 1.6s ease-out infinite' : undefined,
        transition: 'border-color 0.2s, box-shadow 0.2s',
        cursor: 'pointer',
        minHeight: 0,
      }}
    >
      {/* Avatar background — always rendered, video overlays it */}
      <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', background: `radial-gradient(ellipse 90% 80% at 50% 25%, ${tileColor}14, #090b12)` }}>
        <div style={{ width: 72, height: 72, borderRadius: '50%', background: `linear-gradient(140deg,${tileColor}ee,${tileColor}77)`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 24, fontWeight: 700, color: 'white', fontFamily: 'Inter, sans-serif', letterSpacing: '-0.02em', flexShrink: 0, boxShadow: `0 0 30px ${tileColor}33` }}>
          {initials}
        </div>
      </div>

      {/* Actual video — shown on top of avatar once playing */}
      <video
        ref={videoRef}
        autoPlay
        playsInline
        muted={muted}
        style={{
          position: 'absolute',
          inset: 0,
          width: '100%',
          height: '100%',
          objectFit: 'cover',
          transform: mirrored ? 'scaleX(-1)' : undefined,
          // Only hide video if stream has no video tracks at all (audio-only)
          display: hasVideoTracks ? 'block' : 'none',
        }}
      />

      {/* Name label bottom-left */}
      <div style={{ position: 'absolute', bottom: 8, left: 8, display: 'flex', alignItems: 'center', gap: 5, zIndex: 1 }}>
        <span style={{ background: 'rgba(0,0,0,0.58)', backdropFilter: 'blur(10px)', padding: '3px 9px', borderRadius: 7, fontSize: 12, color: 'rgba(255,255,255,0.9)', fontWeight: 500, fontFamily: 'Inter, sans-serif', whiteSpace: 'nowrap', border: '1px solid rgba(255,255,255,0.06)' }}>
          {label}
        </span>
        {isMicMuted && (
          <span style={{ width: 22, height: 22, borderRadius: '50%', background: 'rgba(239,68,68,0.78)', backdropFilter: 'blur(8px)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
            <IcMicOff s={10} />
          </span>
        )}
      </div>

      {/* Fullscreen button — visible on hover */}
      <button
        type="button"
        onClick={enterFullscreen}
        title={isFullscreen ? 'Exit fullscreen' : 'Fullscreen'}
        style={{ position: 'absolute', top: 8, right: 8, width: 28, height: 28, borderRadius: 8, background: 'rgba(0,0,0,0.5)', border: '1px solid rgba(255,255,255,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', color: 'rgba(255,255,255,0.7)', opacity: 0, transition: 'opacity 0.15s', backdropFilter: 'blur(8px)', flexShrink: 0, zIndex: 1 }}
        className="tile-fullscreen-btn"
        onMouseEnter={(e) => (e.currentTarget.style.background = 'rgba(0,0,0,0.7)')}
        onMouseLeave={(e) => (e.currentTarget.style.background = 'rgba(0,0,0,0.5)')}
      >
        <IcMaximize s={13} c="rgba(255,255,255,0.7)" />
      </button>

      <style>{`
        article:hover .tile-fullscreen-btn { opacity: 1 !important; }
      `}</style>
    </article>
  );
}
