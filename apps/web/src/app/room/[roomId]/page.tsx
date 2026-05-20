'use client';

import { memo, useEffect, useMemo, useRef, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useSession } from 'next-auth/react';
import Image from 'next/image';
import { useRoom } from '@/hooks/useRoom';
import { useDevices } from '@/hooks/useDevices';
import { VideoTile } from '@/components/VideoTile';
import { ChatPanel } from '@/components/ChatPanel';
import { HostPanel } from '@/components/HostPanel';
import { generateUUID } from '@/lib/uuid';

const SS_DISPLAY_NAME = 'rtc:displayName';
const SS_PEER_ID = 'rtc:peerId';
const SS_VIDEO_DEVICE = 'rtc:videoDeviceId';
const SS_AUDIO_DEVICE = 'rtc:audioDeviceId';
const SS_MIC_ON = 'rtc:micOn';
const SS_CAM_ON = 'rtc:camOn';

function getPeerId(): string {
  const stored = sessionStorage.getItem(SS_PEER_ID);
  if (stored) return stored;
  const id = `usr-${generateUUID().slice(0, 8)}`;
  sessionStorage.setItem(SS_PEER_ID, id);
  return id;
}

/* ── Icon primitives ── */
const sb = { fill: 'none', strokeLinecap: 'round' as const, strokeLinejoin: 'round' as const };
const IcMic     = ({ s = 20, c = 'currentColor' }: { s?: number; c?: string }) => <svg width={s} height={s} viewBox="0 0 24 24" stroke={c} strokeWidth="2" {...sb}><path d="M12 2a3 3 0 0 0-3 3v7a3 3 0 0 0 6 0V5a3 3 0 0 0-3-3z"/><path d="M19 10v2a7 7 0 0 1-14 0v-2"/><line x1="12" y1="19" x2="12" y2="22"/><line x1="8" y1="22" x2="16" y2="22"/></svg>;
const IcMicOff  = ({ s = 20, c = 'currentColor' }: { s?: number; c?: string }) => <svg width={s} height={s} viewBox="0 0 24 24" stroke={c} strokeWidth="2" {...sb}><line x1="2" y1="2" x2="22" y2="22"/><path d="M18.89 13.23A7.12 7.12 0 0 0 19 12v-2"/><path d="M5 10v2a7 7 0 0 0 12 5"/><path d="M15 9.34V5a3 3 0 0 0-5.68-1.33"/><path d="M9 9v3a3 3 0 0 0 5.12 2.12"/><line x1="12" y1="19" x2="12" y2="22"/></svg>;
const IcVideo   = ({ s = 20, c = 'currentColor' }: { s?: number; c?: string }) => <svg width={s} height={s} viewBox="0 0 24 24" stroke={c} strokeWidth="2" {...sb}><path d="m22 8-6 4 6 4V8z"/><rect x="2" y="6" width="14" height="12" rx="2"/></svg>;
const IcVideoOff= ({ s = 20, c = 'currentColor' }: { s?: number; c?: string }) => <svg width={s} height={s} viewBox="0 0 24 24" stroke={c} strokeWidth="2" {...sb}><path d="M10.66 6H14a2 2 0 0 1 2 2v2.34l1 1L22 8v8"/><path d="M16 16a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h2l10 10z"/><line x1="2" y1="2" x2="22" y2="22"/></svg>;
const IcMonitor = ({ s = 20, c = 'currentColor' }: { s?: number; c?: string }) => <svg width={s} height={s} viewBox="0 0 24 24" stroke={c} strokeWidth="2" {...sb}><rect x="2" y="3" width="20" height="14" rx="2"/><line x1="8" y1="21" x2="16" y2="21"/><line x1="12" y1="17" x2="12" y2="21"/></svg>;
const IcChat    = ({ s = 20, c = 'currentColor' }: { s?: number; c?: string }) => <svg width={s} height={s} viewBox="0 0 24 24" stroke={c} strokeWidth="2" {...sb}><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>;
const IcPhone   = ({ s = 20, c = 'currentColor' }: { s?: number; c?: string }) => <svg width={s} height={s} viewBox="0 0 24 24" stroke={c} strokeWidth="2" {...sb}><path d="M10.68 13.31a16 16 0 0 0 3.41 2.6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7 2 2 0 0 1 1.72 2v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07A19.42 19.42 0 0 1 4.26 9.6a2 2 0 0 1 1.99-2.18h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L10.68 13.31z"/><line x1="23" y1="1" x2="1" y2="23"/></svg>;
const IcUsers   = ({ s = 15, c = 'currentColor' }: { s?: number; c?: string }) => <svg width={s} height={s} viewBox="0 0 24 24" stroke={c} strokeWidth="2" {...sb}><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>;
const IcGear    = ({ s = 17, c = 'currentColor' }: { s?: number; c?: string }) => <svg width={s} height={s} viewBox="0 0 24 24" stroke={c} strokeWidth="2" {...sb}><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/></svg>;
const IcHelp    = ({ s = 17, c = 'currentColor' }: { s?: number; c?: string }) => <svg width={s} height={s} viewBox="0 0 24 24" stroke={c} strokeWidth="2" {...sb}><circle cx="12" cy="12" r="10"/><path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>;
const IcLink    = ({ s = 15, c = 'currentColor' }: { s?: number; c?: string }) => <svg width={s} height={s} viewBox="0 0 24 24" stroke={c} strokeWidth="2" {...sb}><path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"/><path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"/></svg>;
const IcX       = ({ s = 14, c = 'currentColor' }: { s?: number; c?: string }) => <svg width={s} height={s} viewBox="0 0 24 24" stroke={c} strokeWidth="2" {...sb}><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>;
const IcChev    = ({ s = 14, c = 'currentColor' }: { s?: number; c?: string }) => <svg width={s} height={s} viewBox="0 0 24 24" stroke={c} strokeWidth="2" {...sb}><polyline points="6 9 12 15 18 9"/></svg>;

/* ── Profile avatar ── */
function ProfileAvatar({ name, photo, onClick }: { name: string; photo?: string | null | undefined; onClick: () => void }) {
  const initials = (name || '?').split(' ').filter(Boolean).map((n) => n[0]).join('').toUpperCase().slice(0, 2);
  return (
    <button onClick={onClick} title="My profile"
      style={{ width: 32, height: 32, borderRadius: '50%', overflow: 'hidden', cursor: 'pointer', border: '1.5px solid rgba(59,130,246,0.55)', padding: 0, background: 'transparent', flexShrink: 0, transition: 'border-color 0.2s' }}
      onMouseEnter={(e) => (e.currentTarget.style.borderColor = '#3B82F6')}
      onMouseLeave={(e) => (e.currentTarget.style.borderColor = 'rgba(59,130,246,0.55)')}
    >
      {photo
        ? <Image src={photo} width={32} height={32} alt={name} style={{ width: '100%', height: '100%', objectFit: 'cover', borderRadius: '50%' }} />
        : <div style={{ width: '100%', height: '100%', background: 'linear-gradient(135deg,#3B82F6cc,#3B82F666)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, fontWeight: 700, color: 'white' }}>{initials}</div>
      }
    </button>
  );
}

/* ── Top bar ── */
const TopBar = memo(function TopBar({ roomId, count, screenSharing, onSettings, onShortcuts, onProfile, userName, userPhoto, isMobile }: { roomId: string; count: number; screenSharing: boolean; onSettings: () => void; onShortcuts: () => void; onProfile: () => void; userName: string; userPhoto?: string | null | undefined; isMobile: boolean }) {
  const [elapsed, setElapsed] = useState(0);
  useEffect(() => { const t = setInterval(() => setElapsed((s) => s + 1), 1000); return () => clearInterval(t); }, []);
  const fmt = (s: number) => `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;
  return (
    <div style={{ position: 'fixed', top: 0, left: 0, right: 0, height: 56, display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0 16px', background: 'rgba(10,12,18,0.9)', backdropFilter: 'blur(20px)', borderBottom: '1px solid rgba(255,255,255,0.06)', zIndex: 100, fontFamily: 'Inter, sans-serif' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, minWidth: 0, flex: 1 }}>
        <Image src="/logo-only.png" width={28} height={28} alt="Link" style={{ objectFit: 'contain', flexShrink: 0 }} />
        <span style={{ color: 'rgba(255,255,255,0.88)', fontSize: 14, fontWeight: 600, letterSpacing: '-0.01em', maxWidth: isMobile ? 130 : 220, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{roomId}</span>
        {screenSharing && !isMobile && (
          <span style={{ background: 'rgba(59,130,246,0.18)', border: '1px solid rgba(59,130,246,0.4)', color: '#3B82F6', padding: '3px 9px', borderRadius: 20, fontSize: 11, fontWeight: 500, whiteSpace: 'nowrap' }}>● Sharing</span>
        )}
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: isMobile ? 8 : 12, flexShrink: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <span style={{ width: 7, height: 7, borderRadius: '50%', background: '#22C55E', display: 'block', boxShadow: '0 0 0 2px rgba(34,197,94,0.25)', flexShrink: 0 }} />
          {!isMobile && <span style={{ color: 'rgba(255,255,255,0.38)', fontSize: 12 }}>{fmt(elapsed)}</span>}
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
          <IcUsers c="rgba(255,255,255,0.38)" />
          <span style={{ color: 'rgba(255,255,255,0.38)', fontSize: 13 }}>{count}</span>
        </div>
        {!isMobile && <div style={{ width: 1, height: 20, background: 'rgba(255,255,255,0.08)' }} />}
        {!isMobile && <TopBarBtn onClick={onSettings} icon={<IcGear />} />}
        {!isMobile && <TopBarBtn onClick={onShortcuts} icon={<IcHelp />} />}
        {!isMobile && <div style={{ width: 1, height: 20, background: 'rgba(255,255,255,0.08)' }} />}
        <ProfileAvatar name={userName} photo={userPhoto} onClick={onProfile} />
      </div>
    </div>
  );
});
function TopBarBtn({ onClick, icon }: { onClick: () => void; icon: React.ReactNode }) {
  return (
    <button onClick={onClick} style={{ width: 32, height: 32, borderRadius: 8, background: 'transparent', border: '1px solid transparent', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', color: 'rgba(255,255,255,0.5)', transition: 'all 0.15s' }}
      onMouseEnter={(e) => { e.currentTarget.style.background = 'rgba(255,255,255,0.1)'; }}
      onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent'; }}
    >{icon}</button>
  );
}

/* ── Control button ── */
function CtrlBtn({ onClick, icon, label, danger, forceRed, lit, badge }: { onClick: () => void; icon: React.ReactNode; label?: string | undefined; danger?: boolean | undefined; forceRed?: boolean | undefined; lit?: boolean | undefined; badge?: number | undefined }) {
  const [hov, setHov] = useState(false);
  let bg = forceRed ? (hov ? '#DC2626' : '#EF4444') : danger ? (hov ? 'rgba(239,68,68,0.22)' : 'rgba(239,68,68,0.13)') : lit ? (hov ? 'rgba(59,130,246,0.22)' : 'rgba(59,130,246,0.18)') : (hov ? 'rgba(255,255,255,0.12)' : 'rgba(255,255,255,0.07)');
  let ic = forceRed ? 'white' : danger ? '#F87171' : lit ? '#3B82F6' : 'rgba(255,255,255,0.82)';
  return (
    <button onClick={onClick} onMouseEnter={() => setHov(true)} onMouseLeave={() => setHov(false)}
      style={{ position: 'relative', background: bg, border: `1px solid ${lit ? 'rgba(59,130,246,0.3)' : 'rgba(255,255,255,0.07)'}`, borderRadius: label ? 12 : '50%', padding: label ? '10px 16px' : 0, minWidth: label ? 'auto' : 50, width: label ? 'auto' : 50, height: 50, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 4, cursor: 'pointer', color: ic, transition: 'background 0.15s', boxShadow: forceRed && hov ? '0 6px 20px rgba(239,68,68,0.35)' : 'none', fontFamily: 'Inter, sans-serif' }}>
      {icon}
      {label && <span style={{ fontSize: 10, fontWeight: 500, color: ic, whiteSpace: 'nowrap' }}>{label}</span>}
      {badge !== undefined && badge > 0 && (
        <span style={{ position: 'absolute', top: -4, right: -4, minWidth: 18, height: 18, borderRadius: 9, background: '#EF4444', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 10, fontWeight: 700, color: 'white', padding: '0 4px' }}>{badge}</span>
      )}
    </button>
  );
}

/* ── Control bar ── */
function ControlBar({ micOn, camOn, screenShare, chatOpen, breakoutOpen, unread, onMic, onCam, onScreen, onChat, onBreakout, onLeave, isMobile }: { micOn: boolean; camOn: boolean; screenShare: boolean; chatOpen: boolean; breakoutOpen: boolean; unread: number; onMic: () => void; onCam: () => void; onScreen: () => void; onChat: () => void; onBreakout: () => void; onLeave: () => void; isMobile: boolean }) {
  const L = (s: string) => isMobile ? undefined : s;
  return (
    <div style={{ position: 'fixed', bottom: 0, left: 0, right: 0, height: isMobile ? 72 : 82, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10, background: 'rgba(10,12,18,0.9)', backdropFilter: 'blur(20px)', borderTop: '1px solid rgba(255,255,255,0.06)', zIndex: 100, padding: '0 20px' }}>
      <CtrlBtn onClick={onMic}      icon={micOn ? <IcMic s={20} /> : <IcMicOff s={20} />}    label={L(micOn ? 'Mute' : 'Unmute')}         danger={!micOn} />
      <CtrlBtn onClick={onCam}      icon={camOn ? <IcVideo s={20} /> : <IcVideoOff s={20} />} label={L(camOn ? 'Stop Video' : 'Start Video')} danger={!camOn} />
      <CtrlBtn onClick={onScreen}   icon={<IcMonitor s={20} />}                                label={L('Share')}    lit={screenShare} />
      <CtrlBtn onClick={onChat}     icon={<IcChat s={20} />}                                   label={L('Chat')}     lit={chatOpen} badge={unread} />
      <CtrlBtn onClick={onBreakout} icon={<IcGrid s={20} />}                                   label={L('Rooms')}    lit={breakoutOpen} />
      <div style={{ width: 1, height: 30, background: 'rgba(255,255,255,0.08)', margin: '0 4px' }} />
      <CtrlBtn onClick={onLeave}    icon={<IcPhone s={20} />} label={L('Leave')} forceRed />
    </div>
  );
}

/* ── Waiting room ── */
function WaitingRoom({ roomId, isMobile = false }: { roomId: string; isMobile?: boolean }) {
  const [copied, setCopied] = useState(false);
  const link = typeof window !== 'undefined' ? `${window.location.origin}/join/${roomId}` : roomId;
  const copy = () => {
    void navigator.clipboard.writeText(link).catch(() => undefined);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };
  return (
    <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: isMobile ? '0 16px' : 0 }}>
      <div style={{ textAlign: 'center', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: isMobile ? 16 : 20, width: '100%', maxWidth: isMobile ? 340 : 'none' }}>
        <div style={{ position: 'relative', marginBottom: 8 }}>
          <div style={{ position: 'absolute', inset: -24, borderRadius: '50%', border: '2px solid rgba(59,130,246,0.3)', animation: 'pulseRing 2.2s ease-out infinite' }} />
          <div style={{ position: 'absolute', inset: -10, borderRadius: '50%', border: '2px solid rgba(59,130,246,0.18)', animation: 'pulseRing 2.2s ease-out 0.6s infinite' }} />
          <Image src="/logo-only.png" width={isMobile ? 56 : 76} height={isMobile ? 56 : 76} alt="Link" style={{ objectFit: 'contain', position: 'relative', zIndex: 1 }} />
        </div>
        <div>
          <h3 style={{ color: 'white', fontSize: isMobile ? 17 : 21, fontWeight: 600, letterSpacing: '-0.02em', margin: '0 0 8px', fontFamily: 'Inter, sans-serif' }}>Waiting for others to join…</h3>
          <p style={{ color: 'rgba(255,255,255,0.38)', fontSize: isMobile ? 13 : 14, fontFamily: 'Inter, sans-serif' }}>Share the link below to invite people</p>
        </div>
        <div style={{ background: 'rgba(22,27,42,0.8)', backdropFilter: 'blur(16px)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 14, padding: isMobile ? '12px 14px' : '14px 18px', display: 'flex', alignItems: 'center', gap: isMobile ? 10 : 14, width: '100%' }}>
          <IcLink c="rgba(255,255,255,0.4)" />
          <span style={{ color: 'rgba(255,255,255,0.55)', fontSize: 12, fontFamily: 'Inter, sans-serif', flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', minWidth: 0 }}>{link}</span>
          <button onClick={copy} style={{ background: copied ? 'rgba(34,197,94,0.15)' : 'rgba(59,130,246,0.18)', border: `1px solid ${copied ? 'rgba(34,197,94,0.3)' : 'rgba(59,130,246,0.3)'}`, borderRadius: 8, padding: isMobile ? '6px 10px' : '7px 14px', color: copied ? '#22C55E' : '#3B82F6', fontSize: 12, fontWeight: 600, cursor: 'pointer', fontFamily: 'Inter, sans-serif', transition: 'all 0.2s', whiteSpace: 'nowrap', flexShrink: 0 }}>
            {copied ? '✓ Copied!' : 'Copy'}
          </button>
        </div>
      </div>
    </div>
  );
}

/* ── Screen share view ── */
function ScreenShareView({ screenStream, localStream, remoteEntries, displayName, isAudioEnabled, isVideoEnabled, participants, isMobile, localPhoto }: { screenStream: MediaStream; localStream: MediaStream | null; remoteEntries: [string, MediaStream][]; displayName: string; isAudioEnabled: boolean; isVideoEnabled: boolean; participants: Map<string, import('@/hooks/useRoom').ParticipantState>; isMobile: boolean; localPhoto?: string | null | undefined }) {
  const resolve = (key: string) => participants.get(key)?.displayName ?? key;
  const stripTiles: Array<{ key: string; stream: MediaStream; label: string; muted: boolean; mirrored: boolean; isMicMuted?: boolean; cameraEnabled?: boolean; photo?: string | null }> = [
    ...(localStream ? [{ key: '__local', stream: localStream, label: `${displayName} (You)`, muted: true, mirrored: true, isMicMuted: !isAudioEnabled, cameraEnabled: isVideoEnabled, photo: localPhoto ?? null }] : []),
    ...remoteEntries.filter(([k]) => !k.endsWith(':screen')).map(([key, stream]) => {
      const pState = participants.get(key);
      return { key, stream, label: resolve(key), muted: false, mirrored: false, ...(pState ? { isMicMuted: !pState.micEnabled, cameraEnabled: pState.cameraEnabled, photo: pState.photo ?? null } : {}) };
    }),
  ];

  if (isMobile) {
    return (
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 6, padding: '8px', minHeight: 0 }}>
        {/* Main screen — fills available space */}
        <div style={{ flex: 1, background: '#141820', borderRadius: 12, position: 'relative', overflow: 'hidden', border: '1.5px solid rgba(59,130,246,0.4)', minHeight: 0 }}>
          <VideoTile stream={screenStream} label={`${displayName} (Screen)`} muted />
          <div style={{ position: 'absolute', top: 8, left: 8, background: 'rgba(59,130,246,0.2)', border: '1px solid rgba(59,130,246,0.4)', borderRadius: 20, padding: '3px 8px', fontSize: 10, color: '#3B82F6', fontWeight: 500, fontFamily: 'Inter, sans-serif' }}>● Sharing</div>
        </div>
        {/* Horizontal participant strip */}
        {stripTiles.length > 0 && (
          <div style={{ height: 88, display: 'flex', gap: 6, overflowX: 'auto', flexShrink: 0, paddingBottom: 2 }}>
            {stripTiles.map((p) => (
              <div key={p.key} style={{ aspectRatio: '16/9', height: '100%', flexShrink: 0, borderRadius: 8, overflow: 'hidden' }}>
                <VideoTile stream={p.stream} label={p.label} muted={p.muted} mirrored={p.mirrored} isMicMuted={p.isMicMuted} cameraEnabled={p.cameraEnabled} photo={p.photo} />
              </div>
            ))}
          </div>
        )}
      </div>
    );
  }

  return (
    <div style={{ flex: 1, display: 'flex', gap: 8, padding: '10px', minHeight: 0 }}>
      {/* Main screen */}
      <div style={{ flex: 4, background: '#141820', borderRadius: 14, position: 'relative', overflow: 'hidden', border: '1.5px solid rgba(59,130,246,0.4)', minWidth: 0 }}>
        <VideoTile stream={screenStream} label={`${displayName} (Screen)`} muted />
        <div style={{ position: 'absolute', top: 10, left: 10, background: 'rgba(59,130,246,0.2)', border: '1px solid rgba(59,130,246,0.4)', borderRadius: 20, padding: '4px 10px', fontSize: 11, color: '#3B82F6', fontWeight: 500, fontFamily: 'Inter, sans-serif' }}>● Sharing screen</div>
      </div>
      {/* Participant strip */}
      <div style={{ width: 176, display: 'flex', flexDirection: 'column', gap: 8, overflowY: 'auto', flexShrink: 0 }}>
        {stripTiles.map((p) => (
          <div key={p.key} style={{ aspectRatio: '16/9', flexShrink: 0, borderRadius: 10, overflow: 'hidden' }}>
            <VideoTile stream={p.stream} label={p.label} muted={p.muted} mirrored={p.mirrored} isMicMuted={p.isMicMuted} cameraEnabled={p.cameraEnabled} />
          </div>
        ))}
      </div>
    </div>
  );
}

/* ── Video grid ── */
function VideoGrid({ localStream, remoteEntries, screenStream, displayName, isAudioEnabled, isVideoEnabled, participants, isMobile, localPhoto }: { localStream: MediaStream | null; remoteEntries: [string, MediaStream][]; screenStream: MediaStream | null; displayName: string; isAudioEnabled: boolean; isVideoEnabled: boolean; participants: Map<string, import('@/hooks/useRoom').ParticipantState>; isMobile: boolean; localPhoto?: string | null | undefined }) {
  const resolve = (key: string) => participants.get(key)?.displayName ?? key;
  const tiles: Array<{ key: string; stream: MediaStream; label: string; muted: boolean; mirrored?: boolean; isMicMuted?: boolean; cameraEnabled?: boolean; photo?: string | null }> = [];
  if (localStream) tiles.push({ key: '__local', stream: localStream, label: `${displayName} (You)`, muted: true, mirrored: true, isMicMuted: !isAudioEnabled, cameraEnabled: isVideoEnabled, photo: localPhoto ?? null });
  if (screenStream) tiles.push({ key: '__screen', stream: screenStream, label: `${displayName} (Screen)`, muted: true });
  for (const [key, stream] of remoteEntries) {
    const isScreen = key.endsWith(':screen');
    const basePeer = isScreen ? key.replace(':screen', '') : key;
    const pState = participants.get(basePeer);
    tiles.push({
      key,
      stream,
      label: isScreen ? `${resolve(basePeer)} (Screen)` : resolve(key),
      muted: false,
      ...(!isScreen && pState ? { isMicMuted: !pState.micEnabled, cameraEnabled: pState.cameraEnabled, photo: pState.photo ?? null } : {}),
    });
  }
  const count = tiles.length;
  if (count === 0) return null;

  console.log({tiles});
  

  const cols = isMobile ? 1 : count <= 1 ? 1 : count <= 2 ? 2 : count <= 4 ? 2 : 3;
  const rows = Math.ceil(count / cols);

  if (count === 1) {
    if (isMobile) {
      // Mobile: fill entire available area (no aspect-ratio constraint)
      return (
        <div style={{ flex: 1, padding: 8, minHeight: 0 }}>
          <VideoTile stream={tiles[0]!.stream} label={tiles[0]!.label} muted={tiles[0]!.muted} mirrored={tiles[0]!.mirrored} isMicMuted={tiles[0]!.isMicMuted} cameraEnabled={tiles[0]!.cameraEnabled} photo={tiles[0]!.photo} />
        </div>
      );
    }
    return (
      <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24 }}>
        <div style={{ width: '100%', maxWidth: 820, aspectRatio: '16/9' }}>
          <VideoTile stream={tiles[0]!.stream} label={tiles[0]!.label} muted={tiles[0]!.muted} mirrored={tiles[0]!.mirrored} isMicMuted={tiles[0]!.isMicMuted} cameraEnabled={tiles[0]!.cameraEnabled} photo={tiles[0]!.photo} />
        </div>
      </div>
    );
  }

  return (
    <div style={{ flex: 1, display: 'grid', gridTemplateColumns: `repeat(${cols},1fr)`, gridTemplateRows: `repeat(${rows},1fr)`, gap: isMobile ? 6 : 10, padding: isMobile ? 8 : 12, minHeight: 0 }}>
      {tiles.map((t) => (
        <VideoTile key={t.key} stream={t.stream} label={t.label} muted={t.muted} mirrored={t.mirrored} isMicMuted={t.isMicMuted} cameraEnabled={t.cameraEnabled} photo={t.photo} />
      ))}
    </div>
  );
}

/* ── Mini toggle (for settings) ── */
function MiniToggle({ value, onChange }: { value: boolean; onChange: (v: boolean) => void }) {
  return (
    <div onClick={() => onChange(!value)} style={{ width: 40, height: 22, borderRadius: 11, background: value ? '#3B82F6' : 'rgba(255,255,255,0.12)', cursor: 'pointer', position: 'relative', transition: 'background 0.2s', flexShrink: 0 }}>
      <div style={{ width: 18, height: 18, borderRadius: '50%', background: 'white', position: 'absolute', top: 2, left: value ? 20 : 2, transition: 'left 0.2s', boxShadow: '0 1px 4px rgba(0,0,0,0.3)' }} />
    </div>
  );
}

/* ── Settings modal ── */
function SettingsModal({ onClose, onRepublish }: { onClose: () => void; onRepublish: (camId: string, micId: string) => void }) {
  const { cameras, microphones } = useDevices();
  const [selectedCam, setSelectedCam] = useState(() => (typeof window !== 'undefined' ? sessionStorage.getItem('rtc:videoDeviceId') ?? '' : ''));
  const [selectedMic, setSelectedMic] = useState(() => (typeof window !== 'undefined' ? sessionStorage.getItem('rtc:audioDeviceId') ?? '' : ''));
  const [blur, setBlur] = useState(false);
  const [noise, setNoise] = useState(true);

  // Set defaults once devices are enumerated
  useEffect(() => {
    if (cameras.length > 0 && !selectedCam) setSelectedCam(cameras[0]!.deviceId);
  }, [cameras, selectedCam]);
  useEffect(() => {
    if (microphones.length > 0 && !selectedMic) setSelectedMic(microphones[0]!.deviceId);
  }, [microphones, selectedMic]);

  const handleApply = () => {
    if (selectedCam) sessionStorage.setItem('rtc:videoDeviceId', selectedCam);
    if (selectedMic) sessionStorage.setItem('rtc:audioDeviceId', selectedMic);
    onRepublish(selectedCam, selectedMic);
    onClose();
  };

  const DeviceRow = ({ label, devices, value, onChange }: { label: string; devices: MediaDeviceInfo[]; value: string; onChange: (v: string) => void }) => (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
      <span style={{ color: 'rgba(255,255,255,0.7)', fontSize: 13 }}>{label}</span>
      <div style={{ position: 'relative', minWidth: 180 }}>
        <select
          value={value}
          onChange={(e) => onChange(e.target.value)}
          style={{ width: '100%', background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 8, padding: '8px 28px 8px 10px', color: 'rgba(255,255,255,0.75)', fontSize: 12, outline: 'none', appearance: 'none', cursor: 'pointer', fontFamily: 'Inter, sans-serif' }}
        >
          {devices.length === 0 && <option value="">No device found</option>}
          {devices.map((d) => <option key={d.deviceId} value={d.deviceId} style={{ background: '#1A1F2E' }}>{d.label || `Device ${d.deviceId.slice(0, 8)}`}</option>)}
        </select>
        <div style={{ position: 'absolute', right: 9, top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none' }}><IcChev c="rgba(255,255,255,0.3)" /></div>
      </div>
    </div>
  );

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.65)', backdropFilter: 'blur(4px)', zIndex: 500, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }} onClick={onClose}>
      <div onClick={(e) => e.stopPropagation()} style={{ background: 'rgba(18,22,34,0.98)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 20, width: '100%', maxWidth: 440, boxShadow: '0 32px 80px rgba(0,0,0,0.6)', fontFamily: 'Inter, sans-serif', overflow: 'hidden' }}>
        <div style={{ padding: '18px 20px', borderBottom: '1px solid rgba(255,255,255,0.07)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 9 }}><IcGear s={16} c="#3B82F6" /><span style={{ color: 'white', fontSize: 15, fontWeight: 600 }}>Settings</span></div>
          <button onClick={onClose} style={{ background: 'rgba(255,255,255,0.06)', border: 'none', borderRadius: 7, width: 28, height: 28, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', color: 'rgba(255,255,255,0.5)' }}><IcX /></button>
        </div>

        <div style={{ padding: '16px 20px', borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
          <div style={{ color: 'rgba(255,255,255,0.38)', fontSize: 10, fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: 14 }}>Audio</div>
          <DeviceRow label="Microphone" devices={microphones} value={selectedMic} onChange={setSelectedMic} />
        </div>

        <div style={{ padding: '16px 20px', borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
          <div style={{ color: 'rgba(255,255,255,0.38)', fontSize: 10, fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: 14 }}>Video</div>
          <DeviceRow label="Camera" devices={cameras} value={selectedCam} onChange={setSelectedCam} />
        </div>

        <div style={{ padding: '16px 20px', borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
          <div style={{ color: 'rgba(255,255,255,0.38)', fontSize: 10, fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: 14 }}>Effects</div>
          {[{ label: 'Background blur', val: blur, set: setBlur }, { label: 'Noise cancellation', val: noise, set: setNoise }].map((r) => (
            <div key={r.label} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
              <div style={{ color: 'rgba(255,255,255,0.75)', fontSize: 13 }}>{r.label}</div>
              <MiniToggle value={r.val} onChange={r.set} />
            </div>
          ))}
        </div>

        <div style={{ padding: '14px 20px', display: 'flex', justifyContent: 'flex-end' }}>
          <button onClick={handleApply} style={{ padding: '9px 20px', background: '#3B82F6', border: 'none', borderRadius: 9, color: 'white', fontSize: 13, fontWeight: 600, cursor: 'pointer', fontFamily: 'Inter, sans-serif', transition: 'background 0.15s' }}
            onMouseEnter={(e) => (e.currentTarget.style.background = '#2563EB')}
            onMouseLeave={(e) => (e.currentTarget.style.background = '#3B82F6')}>
            Apply
          </button>
        </div>
      </div>
    </div>
  );
}

/* ── Shortcuts modal ── */
function ShortcutsModal({ onClose }: { onClose: () => void }) {
  const keys = [['Space', 'Mute / Unmute'], ['V', 'Toggle camera'], ['S', 'Screen share'], ['C', 'Toggle chat'], ['Esc', 'Close panels'], ['?', 'Keyboard shortcuts']];
  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.65)', backdropFilter: 'blur(4px)', zIndex: 500, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }} onClick={onClose}>
      <div onClick={(e) => e.stopPropagation()} style={{ background: 'rgba(18,22,34,0.98)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 20, width: '100%', maxWidth: 360, boxShadow: '0 32px 80px rgba(0,0,0,0.6)', fontFamily: 'Inter, sans-serif', overflow: 'hidden' }}>
        <div style={{ padding: '18px 20px', borderBottom: '1px solid rgba(255,255,255,0.07)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 9 }}><IcHelp s={16} c="#3B82F6" /><span style={{ color: 'white', fontSize: 15, fontWeight: 600 }}>Keyboard shortcuts</span></div>
          <button onClick={onClose} style={{ background: 'rgba(255,255,255,0.06)', border: 'none', borderRadius: 7, width: 28, height: 28, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', color: 'rgba(255,255,255,0.5)' }}><IcX /></button>
        </div>
        <div style={{ padding: '8px 0 16px' }}>
          {keys.map(([k, l]) => (
            <div key={k} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 20px' }}>
              <span style={{ color: 'rgba(255,255,255,0.65)', fontSize: 13 }}>{l}</span>
              <kbd style={{ background: 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,255,255,0.12)', borderRadius: 6, padding: '3px 9px', fontSize: 12, color: 'rgba(255,255,255,0.7)', fontFamily: 'Inter, sans-serif', fontWeight: 500 }}>{k}</kbd>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

/* ── Breakout rooms panel ── */
const IcArrowLeft = ({ s = 14, c = 'currentColor' }: { s?: number; c?: string }) => (
  <svg width={s} height={s} viewBox="0 0 24 24" stroke={c} strokeWidth="2" fill="none" strokeLinecap="round" strokeLinejoin="round">
    <line x1="19" y1="12" x2="5" y2="12"/><polyline points="12 19 5 12 12 5"/>
  </svg>
);
const IcPlus = ({ s = 14, c = 'currentColor' }: { s?: number; c?: string }) => (
  <svg width={s} height={s} viewBox="0 0 24 24" stroke={c} strokeWidth="2" fill="none" strokeLinecap="round" strokeLinejoin="round">
    <line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/>
  </svg>
);
const IcGrid = ({ s = 20, c = 'currentColor' }: { s?: number; c?: string }) => (
  <svg width={s} height={s} viewBox="0 0 24 24" stroke={c} strokeWidth="2" fill="none" strokeLinecap="round" strokeLinejoin="round">
    <rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/>
    <rect x="14" y="14" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/>
  </svg>
);

function getMainRoomId(roomId: string): string {
  const idx = roomId.indexOf('--br-');
  return idx >= 0 ? roomId.slice(0, idx) : roomId;
}

function getBreakoutRooms(mainRoomId: string): string[] {
  if (typeof window === 'undefined') return [];
  try {
    return JSON.parse(sessionStorage.getItem(`rtc:breakouts:${mainRoomId}`) ?? '[]') as string[];
  } catch { return []; }
}

function saveBreakoutRooms(mainRoomId: string, rooms: string[]): void {
  sessionStorage.setItem(`rtc:breakouts:${mainRoomId}`, JSON.stringify(rooms));
}

interface BreakoutPanelProps {
  open: boolean;
  onClose: () => void;
  currentRoomId: string;
  onJoin: (roomId: string) => void;
  isMobile: boolean;
}

function BreakoutPanel({ open, onClose, currentRoomId, onJoin, isMobile }: BreakoutPanelProps) {
  const mainRoomId = getMainRoomId(currentRoomId);
  const isInBreakout = currentRoomId !== mainRoomId;

  const [breakouts, setBreakouts] = useState<string[]>(() => getBreakoutRooms(mainRoomId));

  const createBreakout = () => {
    const n = breakouts.length + 1;
    const newId = `${mainRoomId}--br-${n}`;
    const updated = [...breakouts, newId];
    setBreakouts(updated);
    saveBreakoutRooms(mainRoomId, updated);
  };

  const COLORS = ['#3B82F6', '#8B5CF6', '#EC4899', '#10B981', '#F59E0B'];

  return (
    <div style={{
      position: 'fixed', top: 0, right: 0, bottom: 0, width: isMobile ? '100%' : 300,
      background: 'rgba(11,13,20,0.95)', backdropFilter: 'blur(28px)',
      borderLeft: isMobile ? 'none' : '1px solid rgba(255,255,255,0.07)',
      display: 'flex', flexDirection: 'column', zIndex: 200,
      transform: open ? 'translateX(0)' : 'translateX(100%)',
      transition: 'transform 0.26s cubic-bezier(0.4,0,0.2,1)',
      fontFamily: 'Inter, sans-serif',
    }}>
      {/* Header */}
      <div style={{ padding: '18px 18px 16px', borderBottom: '1px solid rgba(255,255,255,0.07)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexShrink: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <IcGrid s={16} c="#3B82F6" />
          <span style={{ color: 'white', fontSize: 14, fontWeight: 600 }}>Breakout Rooms</span>
        </div>
        <button onClick={onClose} style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 8, width: 30, height: 30, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', color: 'rgba(255,255,255,0.55)', transition: 'background 0.15s' }}
          onMouseEnter={(e) => (e.currentTarget.style.background = 'rgba(255,255,255,0.1)')}
          onMouseLeave={(e) => (e.currentTarget.style.background = 'rgba(255,255,255,0.06)')}>
          <IcX />
        </button>
      </div>

      {/* Return to main room */}
      {isInBreakout && (
        <button onClick={() => onJoin(mainRoomId)}
          style={{ margin: '12px 14px 0', padding: '10px 14px', background: 'rgba(59,130,246,0.1)', border: '1px solid rgba(59,130,246,0.3)', borderRadius: 10, display: 'flex', alignItems: 'center', gap: 9, cursor: 'pointer', transition: 'background 0.15s', flexShrink: 0 }}
          onMouseEnter={(e) => (e.currentTarget.style.background = 'rgba(59,130,246,0.18)')}
          onMouseLeave={(e) => (e.currentTarget.style.background = 'rgba(59,130,246,0.1)')}>
          <IcArrowLeft s={14} c="#3B82F6" />
          <span style={{ color: '#3B82F6', fontSize: 13, fontWeight: 500 }}>Return to main room</span>
        </button>
      )}

      {/* Main room entry (always visible) */}
      <div style={{ padding: '12px 14px 4px', flexShrink: 0 }}>
        <div style={{ color: 'rgba(255,255,255,0.3)', fontSize: 10, fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: 8 }}>Main Room</div>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: currentRoomId === mainRoomId ? 'rgba(59,130,246,0.1)' : 'rgba(255,255,255,0.04)', border: `1px solid ${currentRoomId === mainRoomId ? 'rgba(59,130,246,0.3)' : 'rgba(255,255,255,0.07)'}`, borderRadius: 10, padding: '10px 12px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <div style={{ width: 8, height: 8, borderRadius: '50%', background: currentRoomId === mainRoomId ? '#22C55E' : 'rgba(255,255,255,0.2)', flexShrink: 0 }} />
            <span style={{ color: 'rgba(255,255,255,0.8)', fontSize: 13, fontWeight: 500 }}>Main Room</span>
          </div>
          {currentRoomId !== mainRoomId && (
            <button onClick={() => onJoin(mainRoomId)}
              style={{ padding: '5px 12px', background: '#3B82F6', border: 'none', borderRadius: 7, color: 'white', fontSize: 12, fontWeight: 600, cursor: 'pointer', transition: 'background 0.15s' }}
              onMouseEnter={(e) => (e.currentTarget.style.background = '#2563EB')}
              onMouseLeave={(e) => (e.currentTarget.style.background = '#3B82F6')}>
              Join
            </button>
          )}
        </div>
      </div>

      {/* Breakout list */}
      <div style={{ flex: 1, overflowY: 'auto', padding: '12px 14px' }}>
        {breakouts.length > 0 && (
          <div style={{ color: 'rgba(255,255,255,0.3)', fontSize: 10, fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: 8 }}>Breakout Rooms</div>
        )}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {breakouts.map((bId, idx) => {
            const isCurrent = currentRoomId === bId;
            const color = COLORS[idx % COLORS.length]!;
            return (
              <div key={bId} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: isCurrent ? `${color}18` : 'rgba(255,255,255,0.04)', border: `1px solid ${isCurrent ? `${color}40` : 'rgba(255,255,255,0.07)'}`, borderRadius: 10, padding: '10px 12px', transition: 'background 0.15s' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <div style={{ width: 28, height: 28, borderRadius: 8, background: `${color}22`, border: `1px solid ${color}40`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, fontWeight: 700, color, flexShrink: 0 }}>
                    {idx + 1}
                  </div>
                  <div>
                    <div style={{ color: 'rgba(255,255,255,0.85)', fontSize: 13, fontWeight: 500 }}>Breakout {idx + 1}</div>
                    {isCurrent && <div style={{ color: 'rgba(255,255,255,0.35)', fontSize: 10, marginTop: 1 }}>You are here</div>}
                  </div>
                </div>
                {!isCurrent && (
                  <button onClick={() => onJoin(bId)}
                    style={{ padding: '5px 12px', background: color, border: 'none', borderRadius: 7, color: 'white', fontSize: 12, fontWeight: 600, cursor: 'pointer', transition: 'opacity 0.15s' }}
                    onMouseEnter={(e) => (e.currentTarget.style.opacity = '0.8')}
                    onMouseLeave={(e) => (e.currentTarget.style.opacity = '1')}>
                    Join
                  </button>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Create breakout */}
      <div style={{ padding: '12px 14px', borderTop: '1px solid rgba(255,255,255,0.07)', flexShrink: 0 }}>
        <button onClick={createBreakout}
          style={{ width: '100%', padding: '10px', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 10, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 7, cursor: 'pointer', color: 'rgba(255,255,255,0.7)', fontSize: 13, fontWeight: 500, transition: 'background 0.15s', fontFamily: 'Inter, sans-serif' }}
          onMouseEnter={(e) => (e.currentTarget.style.background = 'rgba(255,255,255,0.1)')}
          onMouseLeave={(e) => (e.currentTarget.style.background = 'rgba(255,255,255,0.05)')}>
          <IcPlus s={14} c="rgba(255,255,255,0.7)" />
          Create breakout room
        </button>
      </div>
    </div>
  );
}

/* ── Toast ── */
interface ToastItem { id: number; message: string; ini: string; color: string }
function ToastStack({ toasts, isMobile = false }: { toasts: ToastItem[]; isMobile?: boolean }) {
  if (toasts.length === 0) return null;
  return (
    <div style={{ position: 'fixed', bottom: isMobile ? 82 : 92, right: 16, display: 'flex', flexDirection: 'column-reverse', gap: 8, zIndex: 300, pointerEvents: 'none' }}>
      {toasts.map((t) => (
        <div key={t.id} style={{ background: 'rgba(22,27,42,0.95)', backdropFilter: 'blur(20px)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 10, padding: '10px 14px', display: 'flex', alignItems: 'center', gap: 10, boxShadow: '0 8px 32px rgba(0,0,0,0.4)', whiteSpace: 'nowrap', fontFamily: 'Inter, sans-serif', animation: 'toastIn 0.25s ease both' }}>
          <div style={{ width: 26, height: 26, borderRadius: '50%', background: t.color, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 10, fontWeight: 700, color: 'white', flexShrink: 0 }}>{t.ini}</div>
          <span style={{ color: 'rgba(255,255,255,0.88)', fontSize: 13 }}>{t.message}</span>
        </div>
      ))}
    </div>
  );
}

/* ── Room Page ── */
export default function RoomPage() {
  const router = useRouter();
  const params = useParams<{ roomId: string }>();
  const roomId = decodeURIComponent(params.roomId ?? '');
  const { data: session } = useSession();

  const [peerId] = useState(() => typeof window !== 'undefined' ? getPeerId() : `usr-${generateUUID().slice(0, 8)}`);
  const [displayName, setDisplayName] = useState(() => typeof window !== 'undefined' ? (sessionStorage.getItem(SS_DISPLAY_NAME) ?? '') : '');

  const [isAudioEnabled, setIsAudioEnabled] = useState(true);
  const [isVideoEnabled, setIsVideoEnabled] = useState(true);
  const [hasPublished, setHasPublished] = useState(false);
  const [isChatOpen, setIsChatOpen] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [shortcutsOpen, setShortcutsOpen] = useState(false);
  const [breakoutOpen, setBreakoutOpen] = useState(false);
  const [hostPanelOpen, setHostPanelOpen] = useState(false);
  const [toasts, setToasts] = useState<ToastItem[]>([]);
  const [screenShareToast, setScreenShareToast] = useState('');
  const [isMobile, setIsMobile] = useState(false);

  const prevRemoteKeys = useRef<Set<string>>(new Set());

  useEffect(() => {
    const mq = window.matchMedia('(max-width: 767px)');
    setIsMobile(mq.matches);
    const handler = (e: MediaQueryListEvent) => setIsMobile(e.matches);
    mq.addEventListener('change', handler);
    return () => mq.removeEventListener('change', handler);
  }, []);

  const canScreenShare = typeof window !== 'undefined' && typeof navigator.mediaDevices?.getDisplayMedia === 'function';

  const readyToJoin = displayName !== '';

  // Read join-time preferences once (stable for the session)
  const [initialMicEnabled] = useState(() =>
    typeof window !== 'undefined' ? sessionStorage.getItem(SS_MIC_ON) !== '0' : true,
  );
  const [initialCameraEnabled] = useState(() =>
    typeof window !== 'undefined' ? sessionStorage.getItem(SS_CAM_ON) !== '0' : true,
  );

  const {
    roomState,
    localStream,
    remoteStreams,
    chatMessages,
    screenStream,
    isScreenSharing,
    participants,
    isHost,
    isRoomLocked,
    joinRequests,
    leaveRoom,
    publishMedia,
    unpublishMedia,
    setAudioEnabled,
    setVideoEnabled,
    startScreenShare,
    stopScreenShare,
    sendChatMessage,
    kickParticipant,
    lockRoom,
    approveJoin,
    denyJoin,
    transferHost,
  } = useRoom({
    roomId,
    peerId,
    displayName,
    autoJoin: readyToJoin,
    initialMicEnabled,
    initialCameraEnabled,
    photo: session?.user?.image ?? null,
  });

  // Helper: resolve display name from stream key
  const resolveLabel = (key: string, suffix?: string): string => {
    const base = participants.get(key)?.displayName ?? key;
    return suffix ? `${base} (${suffix})` : base;
  };

  // Redirect to join lobby if no displayName
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const stored = sessionStorage.getItem(SS_DISPLAY_NAME);
    if (!stored) {
      router.replace(`/join/${encodeURIComponent(roomId)}`);
    } else {
      setDisplayName(stored);
    }
  }, [roomId, router]);

  // Auto-publish on join using stored device prefs
  useEffect(() => {
    if (roomState !== 'joined' || hasPublished) return;
    const videoDeviceId = sessionStorage.getItem(SS_VIDEO_DEVICE);
    const audioDeviceId = sessionStorage.getItem(SS_AUDIO_DEVICE);
    const camOn = sessionStorage.getItem(SS_CAM_ON) !== '0';
    const micOn = sessionStorage.getItem(SS_MIC_ON) !== '0';

    setIsAudioEnabled(micOn);
    setIsVideoEnabled(camOn);

    // Always request both tracks regardless of on/off state so toggling works
    // after joining. The initial enabled state is applied after publish.
    const constraints: MediaStreamConstraints = {
      video: videoDeviceId ? { deviceId: { exact: videoDeviceId } } : true,
      audio: audioDeviceId ? { deviceId: { exact: audioDeviceId } } : true,
    };

    const applyInitialState = () => {
      setAudioEnabled(micOn);
      setVideoEnabled(camOn);
    };

    void publishMedia(constraints).then((stream) => {
      if (stream) { setHasPublished(true); applyInitialState(); }
    }).catch(() => {
      void publishMedia({ video: true, audio: true }).then((stream) => {
        if (stream) { setHasPublished(true); applyInitialState(); }
      });
    });
  }, [roomState, hasPublished, publishMedia, setAudioEnabled, setVideoEnabled]);

  // Toast on remote peer join/leave
  const addToast = (message: string, ini: string, color: string) => {
    const id = Date.now() + Math.random();
    setToasts((prev) => [...prev, { id, message, ini, color }]);
    setTimeout(() => setToasts((prev) => prev.filter((t) => t.id !== id)), 3800);
  };

  const TILE_COLORS = ['#3B82F6', '#8B5CF6', '#EC4899', '#10B981', '#F59E0B', '#EF4444'];
  function colorFor(label: string) {
    let h = 0; for (let i = 0; i < label.length; i++) h = (h * 31 + label.charCodeAt(i)) & 0xfffffff;
    return TILE_COLORS[h % TILE_COLORS.length]!;
  }

  useEffect(() => {
    const currentKeys = new Set(remoteStreams.keys());
    for (const key of currentKeys) {
      if (!prevRemoteKeys.current.has(key) && !key.endsWith(':screen')) {
        const name = participants.get(key)?.displayName ?? key;
        const ini = name.split(' ').filter(Boolean).map((n) => n[0]).join('').toUpperCase().slice(0, 2) || '??';
        addToast(`${name} joined`, ini, colorFor(key));
      }
    }
    for (const key of prevRemoteKeys.current) {
      if (!currentKeys.has(key) && !key.endsWith(':screen')) {
        const name = participants.get(key)?.displayName ?? key;
        const ini = name.split(' ').filter(Boolean).map((n) => n[0]).join('').toUpperCase().slice(0, 2) || '??';
        addToast(`${name} left`, ini, '#6B7280');
      }
    }
    prevRemoteKeys.current = currentKeys;
  }, [remoteStreams]);

  // Unread badge
  useEffect(() => {
    if (isChatOpen || chatMessages.length === 0) return;
    const last = chatMessages.at(-1);
    if (last && !last.isSelf) setUnreadCount((n) => n + 1);
  }, [chatMessages, isChatOpen]);

  const remoteEntries = useMemo(() => Array.from(remoteStreams.entries()), [remoteStreams]);
  const participantCount = (localStream ? 1 : 0) + remoteEntries.filter(([k]) => !k.endsWith(':screen')).length;
  const hasRemotes = remoteEntries.filter(([k]) => !k.endsWith(':screen')).length > 0;
  const isWaiting = roomState === 'joined' && !hasRemotes;

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

  const onToggleScreen = async () => {
    if (!canScreenShare) {
      setScreenShareToast('Screen sharing is not supported on this device');
      setTimeout(() => setScreenShareToast(''), 3000);
      return;
    }
    if (isScreenSharing) stopScreenShare();
    else await startScreenShare();
  };

  const onLeave = async () => {
    try { await leaveRoom(); } finally { router.push('/'); }
  };

  const onRepublish = async (camId: string, micId: string) => {
    unpublishMedia('video');
    unpublishMedia('audio');
    const constraints: MediaStreamConstraints = {
      video: camId ? { deviceId: { exact: camId } } : true,
      audio: micId ? { deviceId: { exact: micId } } : true,
    };
    await publishMedia(constraints);
  };

  const onJoinBreakout = async (targetRoomId: string) => {
    setBreakoutOpen(false);
    try { await leaveRoom(); } catch { /* ignore */ }
    router.push(`/room/${encodeURIComponent(targetRoomId)}`);
  };

  // Keyboard shortcuts
  useEffect(() => {
    const fn = (e: KeyboardEvent) => {
      if (['input', 'textarea'].includes((e.target as HTMLElement)?.tagName?.toLowerCase())) return;
      if (e.code === 'Space') { e.preventDefault(); onToggleAudio(); }
      else if (e.key === 'v') onToggleVideo();
      else if (e.key === 's') void onToggleScreen();
      else if (e.key === 'c') { setIsChatOpen((v) => !v); }
      else if (e.key === '?') setShortcutsOpen((v) => !v);
      else if (e.key === 'Escape') { setSettingsOpen(false); setShortcutsOpen(false); }
    };
    window.addEventListener('keydown', fn);
    return () => window.removeEventListener('keydown', fn);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isAudioEnabled, isVideoEnabled]);

  const userPhoto = session?.user?.image;
  // On mobile, panels are full-screen overlays — don't shift the main content
  const chatW = !isMobile && isChatOpen ? 320 : 0;
  const breakoutW = !isMobile && breakoutOpen && !isChatOpen ? 300 : 0;

  return (
    <div style={{ width: '100dvw', height: '100dvh', background: '#0a0c14', display: 'flex', flexDirection: 'column', fontFamily: 'Inter, sans-serif', overflow: 'hidden' }}>
      <TopBar
        roomId={roomId}
        count={participantCount}
        screenSharing={isScreenSharing}
        onSettings={() => setSettingsOpen(true)}
        onShortcuts={() => setShortcutsOpen(true)}
        onProfile={() => router.push('/profile')}
        userName={displayName || peerId}
        userPhoto={userPhoto}
        isMobile={isMobile}
      />

      {/* Main content area */}
      <div style={{ flex: 1, display: 'flex', paddingTop: 56, paddingBottom: 82, transition: 'padding-right 0.26s cubic-bezier(0.4,0,0.2,1)', paddingRight: chatW || breakoutW, minHeight: 0, overflow: 'hidden' }}>
        {roomState === 'joining' && (
          <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <div style={{ display: 'flex', gap: 6 }}>
              {[0, 1, 2].map((i) => (
                <span key={i} style={{ width: 7, height: 7, borderRadius: '50%', background: '#3B82F6', display: 'block', animation: `dotBounce 1.2s ease-in-out ${i * 0.16}s infinite` }} />
              ))}
            </div>
          </div>
        )}

        {roomState === 'joined' && isWaiting && localStream && (
          <div style={{ flex: 1, display: 'flex', gap: 8, padding: '10px', minHeight: 0, position: 'relative' }}>
            <WaitingRoom roomId={roomId} isMobile={isMobile} />
            {/* PiP self preview */}
            <div style={{ position: 'absolute', bottom: 16, right: 16, width: isMobile ? 130 : 200, aspectRatio: '16/9', borderRadius: 10, overflow: 'hidden', border: '2px solid rgba(59,130,246,0.5)', boxShadow: '0 0 0 3px rgba(59,130,246,0.2)' }}>
              <VideoTile stream={localStream} label={`${displayName} (You)`} muted mirrored isMicMuted={!isAudioEnabled} photo={userPhoto} />
            </div>
          </div>
        )}

        {roomState === 'joined' && isWaiting && !localStream && (
          <WaitingRoom roomId={roomId} isMobile={isMobile} />
        )}

        {roomState === 'joined' && !isWaiting && isScreenSharing && screenStream && (
          <ScreenShareView screenStream={screenStream} localStream={localStream} remoteEntries={remoteEntries} displayName={displayName} isAudioEnabled={isAudioEnabled} isVideoEnabled={isVideoEnabled} participants={participants} isMobile={isMobile} localPhoto={userPhoto} />
        )}

        {roomState === 'joined' && !isWaiting && !(isScreenSharing && screenStream) && (
          <VideoGrid localStream={localStream} remoteEntries={remoteEntries} screenStream={screenStream} displayName={displayName} isAudioEnabled={isAudioEnabled} isVideoEnabled={isVideoEnabled} participants={participants} isMobile={isMobile} localPhoto={userPhoto} />
        )}

        {roomState === 'error' && (
          <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <div style={{ background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.3)', borderRadius: 14, padding: '20px 28px', color: '#F87171', fontFamily: 'Inter, sans-serif', textAlign: 'center' }}>
              Connection error. Please try again.
            </div>
          </div>
        )}
      </div>

      <ControlBar
        micOn={isAudioEnabled}
        camOn={isVideoEnabled}
        screenShare={isScreenSharing}
        chatOpen={isChatOpen}
        breakoutOpen={breakoutOpen}
        unread={unreadCount}
        onMic={onToggleAudio}
        onCam={onToggleVideo}
        onScreen={() => void onToggleScreen()}
        onChat={() => { setIsChatOpen((v) => { if (!v) { setUnreadCount(0); setBreakoutOpen(false); } return !v; }); }}
        onBreakout={() => { setBreakoutOpen((v) => { if (!v) setIsChatOpen(false); return !v; }); }}
        onLeave={() => void onLeave()}
        isMobile={isMobile}
      />

      <ChatPanel
        open={isChatOpen}
        messages={chatMessages}
        onClose={() => setIsChatOpen(false)}
        onSend={sendChatMessage}
        isMobile={isMobile}
      />

      <BreakoutPanel
        open={breakoutOpen}
        onClose={() => setBreakoutOpen(false)}
        currentRoomId={roomId}
        onJoin={(targetId) => void onJoinBreakout(targetId)}
        isMobile={isMobile}
      />

      <ToastStack toasts={toasts} isMobile={isMobile} />

      {/* Screen share toast */}
      {screenShareToast && (
        <div style={{ position: 'fixed', bottom: isMobile ? 82 : 92, left: '50%', transform: 'translateX(-50%)', background: 'rgba(22,27,42,0.95)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 10, padding: '10px 18px', color: 'rgba(255,255,255,0.88)', fontSize: 13, fontFamily: 'Inter, sans-serif', zIndex: 400, boxShadow: '0 8px 32px rgba(0,0,0,0.4)', whiteSpace: 'nowrap' }}>
          {screenShareToast}
        </div>
      )}

      {settingsOpen && <SettingsModal onClose={() => setSettingsOpen(false)} onRepublish={(c, m) => void onRepublish(c, m)} />}
      {shortcutsOpen && <ShortcutsModal onClose={() => setShortcutsOpen(false)} />}

      {/* Host panel button */}
      {isHost && (
        <button
          onClick={() => setHostPanelOpen((v) => !v)}
          style={{ position: 'fixed', top: 64, right: 12, padding: '7px 13px', background: joinRequests.length > 0 ? 'rgba(239,68,68,0.25)' : 'rgba(59,130,246,0.2)', border: `1px solid ${joinRequests.length > 0 ? 'rgba(239,68,68,0.5)' : 'rgba(59,130,246,0.4)'}`, borderRadius: 10, color: joinRequests.length > 0 ? '#f87171' : '#93c5fd', fontSize: 12, fontWeight: 600, cursor: 'pointer', fontFamily: 'Inter,sans-serif', zIndex: 150, display: 'flex', alignItems: 'center', gap: 6 }}
        >
          👑 Host Paneli
          {joinRequests.length > 0 && (
            <span style={{ background: '#ef4444', color: 'white', borderRadius: '50%', width: 18, height: 18, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 10, fontWeight: 700 }}>
              {joinRequests.length}
            </span>
          )}
        </button>
      )}

      {hostPanelOpen && isHost && (
        <HostPanel
          isHost={isHost}
          isLocked={isRoomLocked}
          joinRequests={joinRequests}
          participants={participants}
          myPeerId={peerId}
          onApprove={approveJoin}
          onDeny={denyJoin}
          onKick={kickParticipant}
          onLock={lockRoom}
          onTransferHost={transferHost}
          onClose={() => setHostPanelOpen(false)}
        />
      )}
    </div>
  );
}
