'use client';

import { memo, useRef, useState, useEffect } from 'react';
import { useCanvasVideo } from '@/hooks/useCanvasVideo';

export interface VideoTileProps {
  stream: MediaStream;
  label: string;
  muted?: boolean | undefined;
  mirrored?: boolean | undefined;
  isMicMuted?: boolean | undefined;
  cameraEnabled?: boolean | undefined;
  color?: string | undefined;
  photo?: string | null | undefined;
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

const IcMinimize = ({ s = 13, c = 'currentColor' }: { s?: number; c?: string }) => (
  <svg width={s} height={s} viewBox="0 0 24 24" stroke={c} strokeWidth="2" fill="none" strokeLinecap="round" strokeLinejoin="round">
    <path d="M8 3v3a2 2 0 0 1-2 2H3m18 0h-3a2 2 0 0 1-2-2V3m0 18v-3a2 2 0 0 1 2-2h3M3 16h3a2 2 0 0 1 2 2v3"/>
  </svg>
);

function useSpeaking(stream: MediaStream, disabled: boolean): boolean {
  const [speaking, setSpeaking] = useState(false);
  const ctxRef = useRef<AudioContext | null>(null);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (disabled) { setSpeaking(false); return; }
    if (stream.getAudioTracks().length === 0) return;

    let ctx: AudioContext;
    try {
      ctx = new AudioContext();
    } catch { return; }

    ctxRef.current = ctx;
    const source = ctx.createMediaStreamSource(stream);
    const analyser = ctx.createAnalyser();
    // Smaller fftSize = less CPU per analysis tick
    analyser.fftSize = 256;
    analyser.smoothingTimeConstant = 0.6;
    source.connect(analyser);

    const data = new Uint8Array(analyser.frequencyBinCount);
    let silenceFrames = 0;

    const tick = () => {
      analyser.getByteFrequencyData(data);
      let sum = 0;
      for (let i = 0; i < data.length; i++) sum += data[i]!;
      const avg = sum / data.length;
      if (avg > 12) {
        silenceFrames = 0;
        setSpeaking(true);
      } else {
        silenceFrames++;
        // ~8 ticks × 80ms = ~640ms of silence before clearing
        if (silenceFrames > 8) setSpeaking(false);
      }
      // 80ms interval ≈ 12.5 fps — enough for speaking indicator, 5× less CPU than 60fps RAF
      timerRef.current = setTimeout(tick, 80);
    };
    timerRef.current = setTimeout(tick, 80);

    return () => {
      if (timerRef.current !== null) clearTimeout(timerRef.current);
      source.disconnect();
      void ctx.close().catch(() => undefined);
      ctxRef.current = null;
      setSpeaking(false);
    };
  }, [stream, disabled]);

  return speaking;
}

export const VideoTile = memo(function VideoTile({ stream, label, muted = false, mirrored = false, isMicMuted = false, cameraEnabled, color, photo }: VideoTileProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const articleRef = useRef<HTMLElement | null>(null);
  const [isNativeFullscreen, setIsNativeFullscreen] = useState(false);
  const [cssFullscreen, setCssFullscreen] = useState(false);
  const [isTouchDevice, setIsTouchDevice] = useState(false);

  const tileColor = color ?? colorFromLabel(label);
  const initials = getInitials(label);
  const isSpeaking = useSpeaking(stream, isMicMuted === true);
  const hasVideoTracks = stream.getVideoTracks().length > 0 && cameraEnabled !== false;
  const inFullscreen = isNativeFullscreen || cssFullscreen;

  useEffect(() => {
    setIsTouchDevice('ontouchstart' in window || navigator.maxTouchPoints > 0);
  }, []);

  // Cross-browser canvas renderer: rVFC when available, rAF fallback
  useCanvasVideo(hasVideoTracks ? stream : null, canvasRef as React.RefObject<HTMLCanvasElement>, hasVideoTracks, muted);

  useEffect(() => {
    const onChange = () => {
      const fsEl = document.fullscreenElement ?? (document as any).webkitFullscreenElement;
      setIsNativeFullscreen(!!fsEl);
      if (!fsEl) setCssFullscreen(false);
    };
    document.addEventListener('fullscreenchange', onChange);
    document.addEventListener('webkitfullscreenchange', onChange);
    return () => {
      document.removeEventListener('fullscreenchange', onChange);
      document.removeEventListener('webkitfullscreenchange', onChange);
    };
  }, []);

  const enterFullscreen = () => {
    const el = articleRef.current;

    // Exit any active fullscreen
    if (isNativeFullscreen) {
      void (document.exitFullscreen?.() ?? Promise.resolve()).catch(() => undefined);
      (document as any).webkitExitFullscreen?.();
      return;
    }
    if (cssFullscreen) {
      setCssFullscreen(false);
      return;
    }

    // Try native fullscreen on the container element
    if (el?.requestFullscreen) {
      void el.requestFullscreen().catch(() => {
        setCssFullscreen(true);
      });
      return;
    }

    // Try webkit fullscreen on container (some older browsers)
    if (el && (el as any).webkitRequestFullscreen) {
      (el as any).webkitRequestFullscreen();
      return;
    }

    // CSS-based fullscreen as last resort
    setCssFullscreen(true);
  };

  const articleStyle: React.CSSProperties = cssFullscreen
    ? {
        position: 'fixed',
        inset: 0,
        zIndex: 9999,
        borderRadius: 0,
        border: 'none',
        width: '100%',
        height: '100%',
        overflow: 'hidden',
        background: '#141820',
        cursor: 'pointer',
      }
    : {
        position: 'relative',
        width: '100%',
        height: '100%',
        borderRadius: 14,
        overflow: 'hidden',
        background: '#141820',
        border: isSpeaking ? `2px solid ${tileColor}` : '2px solid rgba(255,255,255,0.04)',
        boxShadow: isSpeaking ? `0 0 0 4px ${tileColor}33, 0 0 20px ${tileColor}22` : undefined,
        transition: 'border-color 0.15s, box-shadow 0.15s',
        cursor: 'pointer',
        minHeight: 0,
      };


  return (
    <article
      ref={articleRef}
      onDoubleClick={enterFullscreen}
      style={articleStyle}
    >
      {/* Avatar background — shown when camera is off */}
      <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', background: `radial-gradient(ellipse 90% 80% at 50% 25%, ${tileColor}14, #090b12)` }}>
        {photo ? (
          // Profile photo avatar
          <div style={{ width: 80, height: 80, borderRadius: '50%', overflow: 'hidden', flexShrink: 0, boxShadow: `0 0 30px ${tileColor}44, 0 0 0 3px ${tileColor}55` }}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={photo} alt={label} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
          </div>
        ) : (
          // Initials avatar
          <div style={{ width: 72, height: 72, borderRadius: '50%', background: `linear-gradient(140deg,${tileColor}ee,${tileColor}77)`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 24, fontWeight: 700, color: 'white', fontFamily: 'Inter, sans-serif', letterSpacing: '-0.02em', flexShrink: 0, boxShadow: `0 0 30px ${tileColor}33` }}>
            {initials}
          </div>
        )}
      </div>

      <canvas
        ref={canvasRef}
        style={{
          position: 'absolute', inset: 0, width: '100%', height: '100%',
          objectFit: 'cover',
          transform: mirrored ? 'scaleX(-1)' : undefined,
          willChange: 'transform',  // GPU composite hint
          display: hasVideoTracks ? 'block' : 'none',
        }}
      />

      {/* Name label */}
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

      {/* Fullscreen button — always visible on touch, hover-only on desktop */}
      <button
        type="button"
        onClick={enterFullscreen}
        title={inFullscreen ? 'Exit fullscreen' : 'Fullscreen'}
        style={{
          position: 'absolute', top: 8, right: 8, width: 28, height: 28,
          borderRadius: 8, background: 'rgba(0,0,0,0.5)',
          border: '1px solid rgba(255,255,255,0.1)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          cursor: 'pointer', color: 'rgba(255,255,255,0.7)',
          opacity: isTouchDevice ? 1 : 0,
          transition: 'opacity 0.15s',
          backdropFilter: 'blur(8px)', zIndex: 1,
        }}
        className="tile-fs-btn"
      >
        {inFullscreen
          ? <IcMinimize s={13} c="rgba(255,255,255,0.7)" />
          : <IcMaximize s={13} c="rgba(255,255,255,0.7)" />
        }
      </button>

      {!isTouchDevice && <style>{`article:hover .tile-fs-btn { opacity: 1 !important; }`}</style>}
    </article>
  );
});
