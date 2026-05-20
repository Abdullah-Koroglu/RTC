'use client';

import { useEffect, useRef, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useSession } from 'next-auth/react';
import Image from 'next/image';
import { useDevices } from '@/hooks/useDevices';

const SS_DISPLAY_NAME = 'rtc:displayName';
const SS_PEER_ID = 'rtc:peerId';
const SS_VIDEO_DEVICE = 'rtc:videoDeviceId';
const SS_AUDIO_DEVICE = 'rtc:audioDeviceId';
const SS_MIC_ON = 'rtc:micOn';
const SS_CAM_ON = 'rtc:camOn';

function getOrCreatePeerId(): string {
  const stored = sessionStorage.getItem(SS_PEER_ID);
  if (stored) return stored;
  const id = `usr-${Math.random().toString(36).slice(2, 10)}`;
  sessionStorage.setItem(SS_PEER_ID, id);
  return id;
}

/* ── SVG icons ── */
const IcCam = ({ s = 16, c = 'currentColor' }: { s?: number; c?: string }) => (
  <svg width={s} height={s} viewBox="0 0 24 24" stroke={c} strokeWidth="2" fill="none" strokeLinecap="round" strokeLinejoin="round">
    <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"/>
    <circle cx="12" cy="13" r="4"/>
  </svg>
);
const IcCamOff = ({ s = 16, c = 'currentColor' }: { s?: number; c?: string }) => (
  <svg width={s} height={s} viewBox="0 0 24 24" stroke={c} strokeWidth="2" fill="none" strokeLinecap="round" strokeLinejoin="round">
    <path d="M10.66 6H14a2 2 0 0 1 2 2v2.34l1 1L22 8v8"/>
    <path d="M16 16a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h2l10 10z"/>
    <line x1="2" y1="2" x2="22" y2="22"/>
  </svg>
);
const IcMic = ({ s = 16, c = 'currentColor' }: { s?: number; c?: string }) => (
  <svg width={s} height={s} viewBox="0 0 24 24" stroke={c} strokeWidth="2" fill="none" strokeLinecap="round" strokeLinejoin="round">
    <path d="M12 2a3 3 0 0 0-3 3v7a3 3 0 0 0 6 0V5a3 3 0 0 0-3-3z"/>
    <path d="M19 10v2a7 7 0 0 1-14 0v-2"/>
    <line x1="12" y1="19" x2="12" y2="22"/>
    <line x1="8" y1="22" x2="16" y2="22"/>
  </svg>
);
const IcMicOff = ({ s = 16, c = 'currentColor' }: { s?: number; c?: string }) => (
  <svg width={s} height={s} viewBox="0 0 24 24" stroke={c} strokeWidth="2" fill="none" strokeLinecap="round" strokeLinejoin="round">
    <line x1="2" y1="2" x2="22" y2="22"/>
    <path d="M18.89 13.23A7.12 7.12 0 0 0 19 12v-2"/>
    <path d="M5 10v2a7 7 0 0 0 12 5"/>
    <path d="M15 9.34V5a3 3 0 0 0-5.68-1.33"/>
    <path d="M9 9v3a3 3 0 0 0 5.12 2.12"/>
    <line x1="12" y1="19" x2="12" y2="22"/>
  </svg>
);
const IcChev = ({ s = 14, c = 'currentColor' }: { s?: number; c?: string }) => (
  <svg width={s} height={s} viewBox="0 0 24 24" stroke={c} strokeWidth="2" fill="none" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="6 9 12 15 18 9"/>
  </svg>
);

/* ── Error/Gate screen ── */
function GateScreen({ title, text }: { title: string; text: string }) {
  return (
    <div style={{ minHeight: '100vh', background: '#0a0c14', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', fontFamily: 'Inter,sans-serif', gap: 12 }}>
      <p style={{ color: 'white', fontSize: 20, fontWeight: 700, margin: 0 }}>{title}</p>
      <p style={{ color: 'rgba(255,255,255,0.4)', fontSize: 14, margin: 0 }}>{text}</p>
      <a href="/" style={{ marginTop: 12, color: '#60a5fa', fontSize: 13, textDecoration: 'none' }}>← Ana Sayfaya Dön</a>
    </div>
  );
}

/* ── Connecting splash ── */
function ConnectingSplash({ initials }: { initials: string }) {
  return (
    <div style={{ width: '100vw', height: '100vh', background: '#0a0c14', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', fontFamily: 'Inter, sans-serif' }}>
      <div style={{ position: 'relative', marginBottom: 28 }}>
        <div style={{ position: 'absolute', inset: -20, borderRadius: '50%', border: '2px solid rgba(59,130,246,0.4)', animation: 'pulseRing 1.4s ease-out infinite' }} />
        <div style={{ width: 72, height: 72, borderRadius: '50%', background: 'linear-gradient(135deg,rgba(59,130,246,0.8),rgba(59,130,246,0.4))', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 26, fontWeight: 700, color: 'white', position: 'relative', zIndex: 1 }}>
          {initials}
        </div>
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 9, marginBottom: 8 }}>
        <Image src="/logo-only.png" width={24} height={24} alt="Link" style={{ objectFit: 'contain' }} />
        <span style={{ color: 'white', fontSize: 18, fontWeight: 700, letterSpacing: '-0.02em' }}>Link</span>
      </div>
      <span style={{ color: 'rgba(255,255,255,0.4)', fontSize: 13 }}>Joining room…</span>
      <div style={{ display: 'flex', gap: 6, marginTop: 20 }}>
        {[0, 1, 2].map((i) => (
          <span key={i} style={{ width: 7, height: 7, borderRadius: '50%', background: '#3B82F6', display: 'block', animation: `dotBounce 1.2s ease-in-out ${i * 0.16}s infinite` }} />
        ))}
      </div>
    </div>
  );
}

/* ── Device select row ── */
function DeviceSelect({ label, devices, value, onChange }: { label: string; devices: MediaDeviceInfo[]; value: string; onChange: (v: string) => void }) {
  return (
    <div>
      <label style={{ display: 'block', color: 'rgba(255,255,255,0.4)', fontSize: 10, fontWeight: 600, marginBottom: 5, letterSpacing: '0.08em', textTransform: 'uppercase' }}>
        {label}
      </label>
      <div style={{ position: 'relative' }}>
        <select
          value={value}
          onChange={(e) => onChange(e.target.value)}
          style={{ width: '100%', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 8, padding: '9px 28px 9px 11px', color: 'rgba(255,255,255,0.75)', fontSize: 12, outline: 'none', appearance: 'none', cursor: 'pointer', fontFamily: 'Inter,sans-serif' }}
        >
          {devices.length === 0 && <option value="">No device found</option>}
          {devices.map((d) => (
            <option key={d.deviceId} value={d.deviceId} style={{ background: '#1A1F2E' }}>
              {d.label || `Device ${d.deviceId.slice(0, 8)}`}
            </option>
          ))}
        </select>
        <div style={{ position: 'absolute', right: 9, top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none' }}>
          <IcChev c="rgba(255,255,255,0.3)" />
        </div>
      </div>
    </div>
  );
}

/* ── Preview toggle button ── */
function PreviewToggle({ on, onToggle, iconOn, iconOff }: { on: boolean; onToggle: () => void; iconOn: React.ReactNode; iconOff: React.ReactNode }) {
  return (
    <button
      onClick={onToggle}
      style={{ width: 36, height: 36, borderRadius: '50%', cursor: 'pointer', backdropFilter: 'blur(8px)', background: on ? 'rgba(255,255,255,0.1)' : 'rgba(239,68,68,0.7)', border: '1px solid rgba(255,255,255,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'background 0.15s', flexShrink: 0 }}
      onMouseEnter={(e) => { e.currentTarget.style.background = on ? 'rgba(255,255,255,0.18)' : 'rgba(239,68,68,0.85)'; }}
      onMouseLeave={(e) => { e.currentTarget.style.background = on ? 'rgba(255,255,255,0.1)' : 'rgba(239,68,68,0.7)'; }}
    >
      {on ? iconOn : iconOff}
    </button>
  );
}

type RoomInfo = { type: 'public' | 'password' | 'invite_only'; isExpired: boolean; isLocked: boolean };
type AccessPhase = 'loading' | 'password' | 'waiting' | 'lobby' | 'denied' | 'expired' | 'locked' | 'notfound';

/* ── Waiting Room Screen ── */
function WaitingScreen({ roomId, displayName, peerId, onApproved, onDenied }: { roomId: string; displayName: string; peerId: string; onApproved: () => void; onDenied: () => void }) {
  const [dots, setDots] = useState('');
  const [submitted, setSubmitted] = useState(false);

  useEffect(() => {
    const t = setInterval(() => setDots((d) => d.length >= 3 ? '' : d + '.'), 600);
    return () => clearInterval(t);
  }, []);

  // Submit join request once
  useEffect(() => {
    if (submitted) return;
    setSubmitted(true);
    void fetch(`/api/rooms/${roomId}/join-requests`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ peerId, displayName }),
    });
  }, [roomId, peerId, displayName, submitted]);

  // Poll for status every 3 seconds
  useEffect(() => {
    const check = async () => {
      const res = await fetch(`/api/rooms/${roomId}/join-requests/${peerId}`).catch(() => null);
      if (!res?.ok) return;
      const data = await res.json() as { status?: string };
      if (data.status === 'approved') onApproved();
      else if (data.status === 'denied') onDenied();
    };
    const id = setInterval(() => void check(), 3000);
    return () => clearInterval(id);
  }, [roomId, peerId, onApproved, onDenied]);

  return (
    <div style={{ minHeight: '100vh', background: '#0a0c14', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', fontFamily: 'Inter, sans-serif', gap: 20 }}>
      <div style={{ position: 'relative' }}>
        <div style={{ position: 'absolute', inset: -16, borderRadius: '50%', border: '2px solid rgba(59,130,246,0.3)', animation: 'pulseRing 1.4s ease-out infinite' }} />
        <div style={{ width: 64, height: 64, borderRadius: '50%', background: 'rgba(59,130,246,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 22, fontWeight: 700, color: 'white' }}>
          {(displayName[0] ?? '?').toUpperCase()}
        </div>
      </div>
      <div style={{ textAlign: 'center' }}>
        <p style={{ color: 'white', fontSize: 17, fontWeight: 600, margin: '0 0 6px' }}>Host onayı bekleniyor{dots}</p>
        <p style={{ color: 'rgba(255,255,255,0.38)', fontSize: 13, margin: 0 }}>İstek gönderildi — host kabul edince otomatik katılacaksınız.</p>
      </div>
      <button onClick={onDenied} style={{ marginTop: 8, padding: '10px 24px', background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 10, color: 'rgba(255,255,255,0.5)', fontSize: 13, cursor: 'pointer', fontFamily: 'Inter,sans-serif' }}>
        Vazgeç
      </button>
    </div>
  );
}

/* ── Password Screen ── */
function PasswordScreen({ roomId, onSuccess, onBack }: { roomId: string; onSuccess: () => void; onBack: () => void }) {
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true); setError('');
    const res = await fetch(`/api/rooms/${roomId}/verify-password`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ password }),
    });
    const data = await res.json() as { valid?: boolean };
    setLoading(false);
    if (data.valid) { onSuccess(); }
    else { setError('Şifre hatalı. Tekrar deneyin.'); }
  };

  return (
    <div style={{ minHeight: '100vh', background: '#0a0c14', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'Inter,sans-serif' }}>
      <div style={{ background: 'rgba(22,27,42,0.9)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 18, padding: '32px 28px', width: '100%', maxWidth: 380 }}>
        <h2 style={{ color: 'white', fontSize: 20, fontWeight: 700, margin: '0 0 6px', textAlign: 'center' }}>Şifreli Toplantı</h2>
        <p style={{ color: 'rgba(255,255,255,0.38)', fontSize: 13, textAlign: 'center', margin: '0 0 24px' }}>Bu toplantıya katılmak için şifre gerekiyor.</p>
        <form onSubmit={(e) => void submit(e)} style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          <input type="password" autoFocus placeholder="Toplantı şifresi" value={password} onChange={(e) => setPassword(e.target.value)} required
            style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 10, padding: '12px 13px', color: 'white', fontSize: 14, outline: 'none', fontFamily: 'Inter,sans-serif' }}
            onFocus={(e) => (e.target.style.borderColor = 'rgba(59,130,246,0.6)')}
            onBlur={(e) => (e.target.style.borderColor = 'rgba(255,255,255,0.1)')}
          />
          {error && <p style={{ color: '#f87171', fontSize: 13, margin: 0, textAlign: 'center' }}>{error}</p>}
          <button type="submit" disabled={loading}
            style={{ padding: '12px', background: loading ? '#1d4ed8' : '#3B82F6', border: 'none', borderRadius: 10, color: 'white', fontSize: 14, fontWeight: 600, cursor: loading ? 'not-allowed' : 'pointer', fontFamily: 'Inter,sans-serif', opacity: loading ? 0.7 : 1 }}>
            {loading ? 'Doğrulanıyor…' : 'Katıl'}
          </button>
          <button type="button" onClick={onBack}
            style={{ padding: '10px', background: 'transparent', border: 'none', color: 'rgba(255,255,255,0.35)', fontSize: 13, cursor: 'pointer', fontFamily: 'Inter,sans-serif' }}>
            ← Geri
          </button>
        </form>
      </div>
    </div>
  );
}

/* ── Join Lobby Page ── */
export default function JoinLobbyPage() {
  const router = useRouter();
  const params = useParams<{ roomId: string }>();
  const roomId = decodeURIComponent(params.roomId ?? '');
  const { data: session } = useSession();

  const [roomInfo, setRoomInfo] = useState<RoomInfo | null>(null);
  const [accessPhase, setAccessPhase] = useState<AccessPhase>('loading');
  const [name, setName] = useState('');
  const [camOn, setCamOn] = useState(true);
  const [micOn, setMicOn] = useState(true);
  const [selectedCam, setSelectedCam] = useState('');
  const [selectedMic, setSelectedMic] = useState('');
  const [connecting, setConnecting] = useState(false);
  const [camError, setCamError] = useState(false);

  const videoRef = useRef<HTMLVideoElement | null>(null);
  const previewStreamRef = useRef<MediaStream | null>(null);

  const { cameras, microphones } = useDevices();

  // Fetch room info and determine access phase
  useEffect(() => {
    void (async () => {
      const res = await fetch(`/api/rooms/${roomId}`).catch(() => null);
      if (!res) { setAccessPhase('notfound'); return; }
      if (res.status === 404) { setAccessPhase('notfound'); return; }
      const room = await res.json() as RoomInfo;
      setRoomInfo(room);
      if (room.isExpired) { setAccessPhase('expired'); return; }
      if (room.isLocked) { setAccessPhase('locked'); return; }

      if (room.type === 'public') {
        setAccessPhase('lobby');
        return;
      }

      // Check if invited (requires login)
      if (session?.user?.id) {
        const invRes = await fetch(`/api/rooms/${roomId}/invites/me`).catch(() => null);
        if (invRes?.ok) {
          const { invited } = await invRes.json() as { invited: boolean };
          if (invited) { setAccessPhase('lobby'); return; }
        }
      }

      if (room.type === 'password') {
        setAccessPhase('password');
      } else {
        // invite_only and not invited → waiting room
        setAccessPhase('waiting');
      }
    })();
  }, [roomId, session?.user?.id]);

  // Pre-fill name from session or sessionStorage
  useEffect(() => {
    const stored = typeof window !== 'undefined' ? sessionStorage.getItem(SS_DISPLAY_NAME) : null;
    const initial = session?.user?.name ?? stored ?? '';
    setName(initial);
    if (session?.user?.name && typeof window !== 'undefined') {
      sessionStorage.setItem(SS_DISPLAY_NAME, session.user.name);
    }
  }, [session]);

  // Set default device selections
  useEffect(() => {
    if (cameras.length > 0 && !selectedCam) setSelectedCam(cameras[0]!.deviceId);
  }, [cameras, selectedCam]);
  useEffect(() => {
    if (microphones.length > 0 && !selectedMic) setSelectedMic(microphones[0]!.deviceId);
  }, [microphones, selectedMic]);

  // Camera preview
  useEffect(() => {
    const stopPreview = () => {
      if (previewStreamRef.current) {
        previewStreamRef.current.getTracks().forEach((t) => t.stop());
        previewStreamRef.current = null;
      }
      if (videoRef.current) videoRef.current.srcObject = null;
    };

    if (!camOn) { stopPreview(); return; }

    const constraints: MediaStreamConstraints = {
      video: selectedCam ? { deviceId: { exact: selectedCam } } : true,
      audio: false,
    };

    navigator.mediaDevices.getUserMedia(constraints)
      .then((stream) => {
        previewStreamRef.current = stream;
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          void videoRef.current.play().catch(() => undefined);
        }
        setCamError(false);
      })
      .catch(() => {
        setCamError(true);
        setCamOn(false);
      });

    return stopPreview;
  }, [camOn, selectedCam]);

  const initials = name.trim()
    ? name.trim().split(' ').filter(Boolean).map((n) => n[0]).join('').toUpperCase().slice(0, 2)
    : '?';

  const canJoin = name.trim().length > 0;

  const handleJoin = () => {
    if (!canJoin) { document.getElementById('join-name-input')?.focus(); return; }

    // Stop preview
    if (previewStreamRef.current) {
      previewStreamRef.current.getTracks().forEach((t) => t.stop());
      previewStreamRef.current = null;
    }

    // Save to sessionStorage
    sessionStorage.setItem(SS_DISPLAY_NAME, name.trim());
    const peerId = (session?.user?.id) ?? getOrCreatePeerId();
    sessionStorage.setItem(SS_PEER_ID, peerId);
    if (selectedCam) sessionStorage.setItem(SS_VIDEO_DEVICE, selectedCam);
    if (selectedMic) sessionStorage.setItem(SS_AUDIO_DEVICE, selectedMic);
    sessionStorage.setItem(SS_MIC_ON, micOn ? '1' : '0');
    sessionStorage.setItem(SS_CAM_ON, camOn ? '1' : '0');

    setConnecting(true);
    setTimeout(() => router.push(`/room/${encodeURIComponent(roomId)}`), 1900);
  };

  const userAvatar = session?.user?.image;
  const userInitials = (session?.user?.name ?? '').trim().split(' ').filter(Boolean).map((n) => n[0]).join('').toUpperCase().slice(0, 2);

  const peerId = session?.user?.id ?? (typeof window !== 'undefined' ? sessionStorage.getItem(SS_PEER_ID) ?? `usr-${Math.random().toString(36).slice(2, 10)}` : 'guest');

  // Access gate screens
  if (accessPhase === 'loading') return <ConnectingSplash initials="…" />;
  if (accessPhase === 'notfound') return <GateScreen title="Toplantı Bulunamadı" text="Bu oda mevcut değil veya silinmiş." />;
  if (accessPhase === 'expired') return <GateScreen title="Toplantı Sona Erdi" text="Bu toplantının süresi dolmuş." />;
  if (accessPhase === 'locked') return <GateScreen title="Oda Kilitli" text="Host bu odayı kilitledi, yeni katılımcı kabul edilmiyor." />;
  if (accessPhase === 'denied') return <GateScreen title="Reddedildiniz" text="Host katılım isteğinizi reddetti." />;
  if (accessPhase === 'password') return (
    <PasswordScreen roomId={roomId}
      onSuccess={() => {
        // After correct password: if non-public type, go to waiting; otherwise lobby
        if (roomInfo?.type === 'invite_only') setAccessPhase('waiting');
        else setAccessPhase('lobby');
      }}
      onBack={() => router.back()}
    />
  );
  if (accessPhase === 'waiting') return (
    <WaitingScreen roomId={roomId} displayName={name || peerId} peerId={peerId}
      onApproved={() => setAccessPhase('lobby')}
      onDenied={() => setAccessPhase('denied')}
    />
  );

  if (connecting) return <ConnectingSplash initials={initials} />;

  return (
    <div style={{ minHeight: '100vh', background: '#0a0c14', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', fontFamily: 'Inter, sans-serif', padding: '24px', position: 'relative', overflow: 'hidden' }}>
      {/* BG glow */}
      <div style={{ position: 'absolute', inset: 0, pointerEvents: 'none', background: 'radial-gradient(ellipse 70% 45% at 50% -5%, rgba(59,130,246,0.13) 0%, transparent 70%)' }} />
      <div style={{ position: 'absolute', inset: 0, pointerEvents: 'none', opacity: 0.022, backgroundImage: 'linear-gradient(rgba(255,255,255,1) 1px,transparent 1px),linear-gradient(90deg,rgba(255,255,255,1) 1px,transparent 1px)', backgroundSize: '56px 56px' }} />

      {/* Room badge */}
      <div style={{ position: 'absolute', top: 22, left: '50%', transform: 'translateX(-50%)', background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 20, padding: '5px 14px', display: 'flex', alignItems: 'center', gap: 7, backdropFilter: 'blur(12px)', whiteSpace: 'nowrap', zIndex: 10 }}>
        <span style={{ width: 7, height: 7, borderRadius: '50%', background: '#22C55E', display: 'block', flexShrink: 0 }} />
        <span style={{ color: 'rgba(255,255,255,0.4)', fontSize: 11 }}>Room</span>
        <span style={{ color: 'rgba(255,255,255,0.8)', fontSize: 11, fontWeight: 600, letterSpacing: '0.06em' }}>{roomId}</span>
      </div>

      {/* Auth user badge (top-right) */}
      {session?.user && (
        <div style={{ position: 'absolute', top: 18, right: 20, display: 'flex', alignItems: 'center', gap: 9, background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 24, padding: '6px 12px 6px 6px', backdropFilter: 'blur(12px)', zIndex: 10 }}>
          {userAvatar ? (
            <Image src={userAvatar} width={28} height={28} alt={session.user.name ?? ''} style={{ borderRadius: '50%' }} />
          ) : (
            <div style={{ width: 28, height: 28, borderRadius: '50%', background: 'linear-gradient(135deg,#3B82F6,#1E3FC4)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, fontWeight: 700, color: 'white', flexShrink: 0 }}>
              {userInitials || '?'}
            </div>
          )}
          <span style={{ color: 'rgba(255,255,255,0.75)', fontSize: 12, fontWeight: 500 }}>{session.user.name}</span>
        </div>
      )}

      {/* Card */}
      <div style={{ background: 'rgba(22,27,42,0.82)', backdropFilter: 'blur(24px)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 22, padding: '36px 32px 32px', width: '100%', maxWidth: 460, position: 'relative', zIndex: 1, boxShadow: '0 32px 80px rgba(0,0,0,0.55)' }}>
        {/* Branding */}
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', marginBottom: 22 }}>
          <Image src="/logo-only.png" width={54} height={54} alt="Link" style={{ objectFit: 'contain' }} />
          <div style={{ marginTop: 10, display: 'flex', alignItems: 'center', gap: 8 }}>
            <span style={{ color: 'white', fontSize: 24, fontWeight: 700, letterSpacing: '-0.03em' }}>Link</span>
          </div>
          <span style={{ color: 'rgba(255,255,255,0.3)', fontSize: 12, marginTop: 3 }}>Video Conferencing</span>
        </div>

        {/* Camera preview label */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
          <span style={{ color: 'rgba(255,255,255,0.6)', fontSize: 12, fontWeight: 500 }}>Looks good?</span>
          <span style={{ color: 'rgba(255,255,255,0.3)', fontSize: 11 }}>Your preview</span>
        </div>

        {/* Camera preview */}
        <div style={{ width: '100%', aspectRatio: '16/9', background: camOn ? 'radial-gradient(ellipse 80% 70% at 50% 30%, rgba(59,130,246,0.07), #080a10)' : '#080a10', borderRadius: 12, overflow: 'hidden', marginBottom: 16, position: 'relative', border: '1px solid rgba(255,255,255,0.06)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          {/* Actual camera preview */}
          <video
            ref={videoRef}
            autoPlay
            playsInline
            muted
            style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover', transform: 'scaleX(-1)', display: camOn && !camError ? 'block' : 'none' }}
          />
          {/* Avatar fallback */}
          {(!camOn || camError) && (
            <div style={{ textAlign: 'center' }}>
              {initials !== '?' ? (
                <div style={{ width: 68, height: 68, borderRadius: '50%', background: 'linear-gradient(135deg,rgba(59,130,246,0.8),rgba(59,130,246,0.5))', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 8px', fontSize: 24, fontWeight: 700, color: 'white', boxShadow: '0 0 0 3px rgba(59,130,246,0.2)' }}>{initials}</div>
              ) : (
                <div style={{ width: 68, height: 68, borderRadius: '50%', background: 'rgba(255,255,255,0.05)', border: '2px dashed rgba(255,255,255,0.12)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 8px' }}>
                  <IcCam s={22} c="rgba(255,255,255,0.2)" />
                </div>
              )}
              <span style={{ color: 'rgba(255,255,255,0.2)', fontSize: 10, letterSpacing: '0.06em', textTransform: 'uppercase' }}>
                {camError ? 'Camera unavailable' : 'Camera off'}
              </span>
            </div>
          )}
          {/* Overlay controls */}
          <div style={{ position: 'absolute', bottom: 10, left: '50%', transform: 'translateX(-50%)', display: 'flex', gap: 8 }}>
            <PreviewToggle on={micOn} onToggle={() => setMicOn((v) => !v)} iconOn={<IcMic s={15} c="white" />} iconOff={<IcMicOff s={15} c="white" />} />
            <PreviewToggle on={camOn} onToggle={() => setCamOn((v) => !v)} iconOn={<IcCam s={15} c="white" />} iconOff={<IcCamOff s={15} c="white" />} />
          </div>
        </div>

        {/* Display name */}
        <div style={{ marginBottom: 13 }}>
          <label style={{ display: 'block', color: 'rgba(255,255,255,0.4)', fontSize: 10, fontWeight: 600, marginBottom: 5, letterSpacing: '0.08em', textTransform: 'uppercase' }}>
            Display Name
          </label>
          <input
            id="join-name-input"
            type="text"
            placeholder="e.g. Alex Chen"
            value={name}
            onChange={(e) => setName(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter' && canJoin) handleJoin(); }}
            autoFocus={!session}
            style={{ width: '100%', boxSizing: 'border-box', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 10, padding: '12px 13px', color: 'white', fontSize: 14, outline: 'none', fontFamily: 'Inter, sans-serif', transition: 'border-color 0.15s' }}
            onFocus={(e) => (e.target.style.borderColor = 'rgba(59,130,246,0.6)')}
            onBlur={(e) => (e.target.style.borderColor = 'rgba(255,255,255,0.1)')}
          />
        </div>

        {/* Device selects */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 22 }}>
          <DeviceSelect label="Camera" devices={cameras} value={selectedCam} onChange={setSelectedCam} />
          <DeviceSelect label="Microphone" devices={microphones} value={selectedMic} onChange={setSelectedMic} />
        </div>

        {/* Join button */}
        <button
          onClick={handleJoin}
          disabled={!canJoin}
          style={{ width: '100%', padding: '13px', background: canJoin ? '#3B82F6' : 'rgba(59,130,246,0.22)', border: 'none', borderRadius: 11, color: canJoin ? 'white' : 'rgba(255,255,255,0.3)', fontSize: 14, fontWeight: 600, cursor: canJoin ? 'pointer' : 'not-allowed', transition: 'all 0.15s', fontFamily: 'Inter, sans-serif' }}
          onMouseEnter={(e) => { if (canJoin) { e.currentTarget.style.background = '#2563EB'; e.currentTarget.style.boxShadow = '0 8px 24px rgba(59,130,246,0.35)'; } }}
          onMouseLeave={(e) => { if (canJoin) { e.currentTarget.style.background = '#3B82F6'; e.currentTarget.style.boxShadow = 'none'; } }}
        >
          Join Room
        </button>
      </div>

      <p style={{ marginTop: 18, color: 'rgba(255,255,255,0.18)', fontSize: 11, textAlign: 'center' }}>
        By joining you agree to Link&apos;s Terms of Service &amp; Privacy Policy
      </p>
    </div>
  );
}
