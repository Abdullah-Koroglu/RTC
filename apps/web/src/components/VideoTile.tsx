'use client';

import { memo, useRef, useState, useEffect } from 'react';

type ResolutionPreset = 'auto' | '240p' | '360p' | '480p' | '720p' | '1080p';
type FpsPreset = 'auto' | '5' | '10' | '15' | '24' | '30';

const RESOLUTION_OPTIONS: ResolutionPreset[] = ['auto', '240p', '360p', '480p', '720p', '1080p'];
const FPS_OPTIONS: FpsPreset[] = ['auto', '5', '10', '15', '24', '30'];

const RESOLUTION_DIMENSIONS: Record<Exclude<ResolutionPreset, 'auto'>, { width: number; height: number }> = {
  '240p': { width: 426, height: 240 },
  '360p': { width: 640, height: 360 },
  '480p': { width: 854, height: 480 },
  '720p': { width: 1280, height: 720 },
  '1080p': { width: 1920, height: 1080 },
};

const SS_TILE_QUALITY = 'rtc:tileQualityPrefs';

interface TileQualitySetting {
  resolution: ResolutionPreset;
  fps: FpsPreset;
}

export interface VideoTileProps {
  stream: MediaStream;
  label: string;
  muted?: boolean | undefined;
  mirrored?: boolean | undefined;
  isMicMuted?: boolean | undefined;
  cameraEnabled?: boolean | undefined;
  lowLatency?: boolean | undefined;
  color?: string | undefined;
  photo?: string | null | undefined;
  qualityStorageKey?: string | undefined;
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

const IcTune = ({ s = 13, c = 'currentColor' }: { s?: number; c?: string }) => (
  <svg width={s} height={s} viewBox="0 0 24 24" stroke={c} strokeWidth="2" fill="none" strokeLinecap="round" strokeLinejoin="round">
    <line x1="4" y1="21" x2="4" y2="14"/>
    <line x1="4" y1="10" x2="4" y2="3"/>
    <line x1="12" y1="21" x2="12" y2="12"/>
    <line x1="12" y1="8" x2="12" y2="3"/>
    <line x1="20" y1="21" x2="20" y2="16"/>
    <line x1="20" y1="12" x2="20" y2="3"/>
    <line x1="1" y1="14" x2="7" y2="14"/>
    <line x1="9" y1="8" x2="15" y2="8"/>
    <line x1="17" y1="16" x2="23" y2="16"/>
  </svg>
);

function loadTileQuality(key: string): TileQualitySetting {
  if (typeof window === 'undefined') {
    return { resolution: 'auto', fps: 'auto' };
  }
  try {
    const raw = sessionStorage.getItem(SS_TILE_QUALITY);
    if (!raw) return { resolution: 'auto', fps: 'auto' };
    const parsed = JSON.parse(raw) as Record<string, TileQualitySetting>;
    const value = parsed[key];
    if (!value) return { resolution: 'auto', fps: 'auto' };
    if (!RESOLUTION_OPTIONS.includes(value.resolution) || !FPS_OPTIONS.includes(value.fps)) {
      return { resolution: 'auto', fps: 'auto' };
    }
    return value;
  } catch {
    return { resolution: 'auto', fps: 'auto' };
  }
}

function saveTileQuality(key: string, value: TileQualitySetting): void {
  if (typeof window === 'undefined') return;
  try {
    const raw = sessionStorage.getItem(SS_TILE_QUALITY);
    const parsed = raw ? (JSON.parse(raw) as Record<string, TileQualitySetting>) : {};
    parsed[key] = value;
    sessionStorage.setItem(SS_TILE_QUALITY, JSON.stringify(parsed));
  } catch {
    // best-effort persistence only
  }
}

function useSpeaking(stream: MediaStream, disabled: boolean): boolean {
  const [speaking, setSpeaking] = useState(false);
  const speakingRef = useRef(false);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (disabled) {
      speakingRef.current = false;
      setSpeaking(false);
      return;
    }
    if (stream.getAudioTracks().length === 0) return;

    let ctx: AudioContext;
    try {
      ctx = new AudioContext();
    } catch { return; }

    const source = ctx.createMediaStreamSource(stream);
    const analyser = ctx.createAnalyser();
    // Smaller fftSize = less CPU per analysis tick
    analyser.fftSize = 128;
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
        if (!speakingRef.current) {
          speakingRef.current = true;
          setSpeaking(true);
        }
      } else {
        silenceFrames++;
        // ~8 ticks × 80ms = ~640ms of silence before clearing
        if (silenceFrames > 3 && speakingRef.current) {
          speakingRef.current = false;
          setSpeaking(false);
        }
      }
      // 80ms interval ≈ 12.5 fps — enough for speaking indicator, 5× less CPU than 60fps RAF
      timerRef.current = setTimeout(tick, 180);
    };
    timerRef.current = setTimeout(tick, 180);

    return () => {
      if (timerRef.current !== null) clearTimeout(timerRef.current);
      source.disconnect();
      void ctx.close().catch(() => undefined);
      speakingRef.current = false;
      setSpeaking(false);
    };
  }, [stream, disabled]);

  return speaking;
}

export const VideoTile = memo(function VideoTile({ stream, label, muted = false, mirrored = false, isMicMuted = false, cameraEnabled, lowLatency = false, color, photo, qualityStorageKey }: VideoTileProps) {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const articleRef = useRef<HTMLElement | null>(null);
  const settingsPanelRef = useRef<HTMLDivElement | null>(null);
  const [isNativeFullscreen, setIsNativeFullscreen] = useState(false);
  const [cssFullscreen, setCssFullscreen] = useState(false);
  const [isTouchDevice, setIsTouchDevice] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);

  const qualityKey = qualityStorageKey ?? label;
  const [quality, setQuality] = useState<TileQualitySetting>(() => loadTileQuality(qualityKey));

  useEffect(() => {
    setQuality(loadTileQuality(qualityKey));
  }, [qualityKey]);

  useEffect(() => {
    saveTileQuality(qualityKey, quality);
  }, [qualityKey, quality]);

  const tileColor = color ?? colorFromLabel(label);
  const initials = getInitials(label);
  // Self tile is typically muted locally; running analyser there adds CPU load
  // without UX value and can make local preview feel less responsive on weak devices.
  const isSpeaking = useSpeaking(stream, muted || isMicMuted === true);
  const hasVideoTracks = stream.getVideoTracks().length > 0 && cameraEnabled !== false;
  const inFullscreen = isNativeFullscreen || cssFullscreen;
  const renderWithCanvas = hasVideoTracks && (quality.resolution !== 'auto' || quality.fps !== 'auto');

  useEffect(() => {
    setIsTouchDevice('ontouchstart' in window || navigator.maxTouchPoints > 0);
  }, []);

  useEffect(() => {
    const videoEl = videoRef.current;
    if (!videoEl) return;

    videoEl.srcObject = hasVideoTracks ? stream : null;
    videoEl.muted = true;
    if (hasVideoTracks) {
      void videoEl.play().catch(() => undefined);
    }

    return () => {
      videoEl.srcObject = null;
    };
  }, [stream, hasVideoTracks]);

  useEffect(() => {
    const track = stream.getVideoTracks()[0];
    if (!track || typeof track.applyConstraints !== 'function') return;

    const constraints: MediaTrackConstraints = {};
    if (quality.resolution !== 'auto') {
      const preset = RESOLUTION_DIMENSIONS[quality.resolution];
      constraints.width = { ideal: preset.width, max: preset.width };
      constraints.height = { ideal: preset.height, max: preset.height };
    }
    if (quality.fps !== 'auto') {
      const fps = Number(quality.fps);
      constraints.frameRate = { ideal: fps, max: fps };
    }
    if (Object.keys(constraints).length === 0) return;

    void track.applyConstraints(constraints).catch(() => {
      // Some remote tracks may reject constraints; visual throttling still applies.
    });
  }, [stream, quality]);

  useEffect(() => {
    if (!renderWithCanvas) return;

    const videoEl = videoRef.current;
    const canvas = canvasRef.current;
    if (!videoEl || !canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let rafId: number | null = null;
    let disposed = false;
    let lastDraw = 0;

    const fpsLimit = quality.fps === 'auto' ? 0 : Number(quality.fps);
    const frameInterval = fpsLimit > 0 ? (1000 / fpsLimit) : 0;

    const getTargetSize = () => {
      if (quality.resolution !== 'auto') {
        return RESOLUTION_DIMENSIONS[quality.resolution];
      }

      const rect = canvas.getBoundingClientRect();
      const dpr = Math.max(1, window.devicePixelRatio || 1);
      return {
        width: Math.max(1, Math.round(rect.width * dpr)),
        height: Math.max(1, Math.round(rect.height * dpr)),
      };
    };

    const resizeCanvas = () => {
      const target = getTargetSize();
      if (canvas.width !== target.width || canvas.height !== target.height) {
        canvas.width = target.width;
        canvas.height = target.height;
      }
    };

    const drawCover = () => {
      const cw = canvas.width;
      const ch = canvas.height;
      const iw = videoEl.videoWidth || cw;
      const ih = videoEl.videoHeight || ch;
      if (!cw || !ch || !iw || !ih) return;

      const scale = Math.max(cw / iw, ch / ih);
      const dw = iw * scale;
      const dh = ih * scale;
      const dx = (cw - dw) / 2;
      const dy = (ch - dh) / 2;

      ctx.save();
      ctx.clearRect(0, 0, cw, ch);
      if (mirrored) {
        ctx.translate(cw, 0);
        ctx.scale(-1, 1);
      }
      ctx.drawImage(videoEl, dx, dy, dw, dh);
      ctx.restore();
    };

    const loop = (ts: number) => {
      if (disposed) return;

      if (frameInterval > 0 && ts - lastDraw < frameInterval) {
        rafId = window.requestAnimationFrame(loop);
        return;
      }

      resizeCanvas();
      drawCover();
      lastDraw = ts;
      rafId = window.requestAnimationFrame(loop);
    };

    rafId = window.requestAnimationFrame(loop);

    const onResize = () => resizeCanvas();
    window.addEventListener('resize', onResize);

    return () => {
      disposed = true;
      window.removeEventListener('resize', onResize);
      if (rafId !== null) {
        window.cancelAnimationFrame(rafId);
      }
      ctx.clearRect(0, 0, canvas.width, canvas.height);
    };
  }, [renderWithCanvas, quality, mirrored]);

  useEffect(() => {
    const audioEl = audioRef.current;
    if (!audioEl) return;

    const hasAudioTracks = stream.getAudioTracks().length > 0;
    audioEl.srcObject = hasAudioTracks ? stream : null;
    audioEl.muted = muted;

    if (!hasAudioTracks || muted) {
      return () => {
        audioEl.srcObject = null;
      };
    }

    let disposed = false;
    let detachRetry: (() => void) | null = null;

    const tryPlay = () => {
      void audioEl.play().catch(() => {
        if (disposed || detachRetry) return;
        const retry = () => {
          void audioEl.play().catch(() => undefined);
        };
        const opts: AddEventListenerOptions = { capture: true, once: true };
        window.addEventListener('pointerdown', retry, opts);
        window.addEventListener('keydown', retry, opts);
        detachRetry = () => {
          window.removeEventListener('pointerdown', retry, true);
          window.removeEventListener('keydown', retry, true);
        };
      });
    };

    tryPlay();

    return () => {
      disposed = true;
      if (detachRetry) detachRetry();
      audioEl.srcObject = null;
    };
  }, [stream, muted]);

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

  useEffect(() => {
    if (!settingsOpen) return;
    const onPointerDown = (event: MouseEvent) => {
      const panel = settingsPanelRef.current;
      if (!panel) return;
      if (!panel.contains(event.target as Node)) {
        setSettingsOpen(false);
      }
    };

    window.addEventListener('mousedown', onPointerDown);
    return () => window.removeEventListener('mousedown', onPointerDown);
  }, [settingsOpen]);

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
        border: lowLatency ? '1px solid rgba(255,255,255,0.06)' : (isSpeaking ? `2px solid ${tileColor}` : '2px solid rgba(255,255,255,0.04)'),
        boxShadow: lowLatency ? undefined : (isSpeaking ? `0 0 0 4px ${tileColor}33, 0 0 20px ${tileColor}22` : undefined),
        transition: lowLatency ? undefined : 'border-color 0.15s, box-shadow 0.15s',
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

      <video
        ref={videoRef}
        autoPlay
        playsInline
        muted
        style={{
          position: 'absolute', inset: 0, width: '100%', height: '100%',
          objectFit: 'cover',
          transform: mirrored ? 'scaleX(-1)' : undefined,
          willChange: lowLatency ? 'auto' : 'transform',
          display: hasVideoTracks ? 'block' : 'none',
          visibility: renderWithCanvas ? 'hidden' : 'visible',
        }}
      />

      <canvas
        ref={canvasRef}
        style={{
          position: 'absolute',
          inset: 0,
          width: '100%',
          height: '100%',
          display: renderWithCanvas ? 'block' : 'none',
        }}
      />

      <audio ref={audioRef} autoPlay playsInline style={{ display: 'none' }} />

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

      {/* Per-tile video quality control */}
      <div
        ref={settingsPanelRef}
        style={{
          position: 'absolute',
          top: 8,
          left: 8,
          zIndex: 2,
          pointerEvents: 'auto',
        }}
      >
        <button
          type="button"
          title="Video quality"
          onClick={(event) => {
            event.stopPropagation();
            setSettingsOpen((v) => !v);
          }}
          style={{
            width: 30,
            height: 30,
            borderRadius: 8,
            background: 'rgba(0,0,0,0.55)',
            border: '1px solid rgba(255,255,255,0.12)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            cursor: 'pointer',
            color: 'rgba(255,255,255,0.78)',
            backdropFilter: 'blur(8px)',
          }}
        >
          <IcTune s={13} c="rgba(255,255,255,0.78)" />
        </button>

        {settingsOpen && (
          <div
            onClick={(event) => event.stopPropagation()}
            style={{
              marginTop: 6,
              minWidth: 150,
              background: 'rgba(10,12,18,0.95)',
              border: '1px solid rgba(255,255,255,0.12)',
              borderRadius: 10,
              padding: 10,
              display: 'flex',
              flexDirection: 'column',
              gap: 8,
              boxShadow: '0 10px 30px rgba(0,0,0,0.35)',
            }}
          >
            <div style={{ color: 'rgba(255,255,255,0.85)', fontSize: 11, fontWeight: 700, letterSpacing: '0.06em', textTransform: 'uppercase' }}>
              Video Quality
            </div>

            <label style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
              <span style={{ color: 'rgba(255,255,255,0.55)', fontSize: 11 }}>Resolution</span>
              <select
                value={quality.resolution}
                onChange={(event) => {
                  const resolution = event.target.value as ResolutionPreset;
                  setQuality((prev) => ({ ...prev, resolution }));
                }}
                style={{
                  background: 'rgba(255,255,255,0.06)',
                  border: '1px solid rgba(255,255,255,0.14)',
                  borderRadius: 8,
                  padding: '6px 8px',
                  color: 'rgba(255,255,255,0.88)',
                  fontSize: 12,
                  outline: 'none',
                }}
              >
                {RESOLUTION_OPTIONS.map((option) => (
                  <option key={option} value={option} style={{ background: '#141820', color: 'white' }}>
                    {option === 'auto' ? 'Auto' : option}
                  </option>
                ))}
              </select>
            </label>

            <label style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
              <span style={{ color: 'rgba(255,255,255,0.55)', fontSize: 11 }}>FPS</span>
              <select
                value={quality.fps}
                onChange={(event) => {
                  const fps = event.target.value as FpsPreset;
                  setQuality((prev) => ({ ...prev, fps }));
                }}
                style={{
                  background: 'rgba(255,255,255,0.06)',
                  border: '1px solid rgba(255,255,255,0.14)',
                  borderRadius: 8,
                  padding: '6px 8px',
                  color: 'rgba(255,255,255,0.88)',
                  fontSize: 12,
                  outline: 'none',
                }}
              >
                {FPS_OPTIONS.map((option) => (
                  <option key={option} value={option} style={{ background: '#141820', color: 'white' }}>
                    {option === 'auto' ? 'Auto' : `${option} FPS`}
                  </option>
                ))}
              </select>
            </label>
          </div>
        )}
      </div>

      {!isTouchDevice && <style>{`article:hover .tile-fs-btn { opacity: 1 !important; }`}</style>}
    </article>
  );
});
