'use client';

import { useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useSession } from 'next-auth/react';
import Image from 'next/image';

export const dynamic = 'force-dynamic';

type RoomType = 'public' | 'password' | 'invite_only';

export default function LandingPage() {
  const router = useRouter();
  const { data: session } = useSession();
  const [showCode, setShowCode] = useState(false);
  const [showCreate, setShowCreate] = useState(false);
  const [roomType, setRoomType] = useState<RoomType>('public');
  const [roomPassword, setRoomPassword] = useState('');
  const [creating, setCreating] = useState(false);
  const [createError, setCreateError] = useState('');
  const codeRef = useRef<HTMLInputElement>(null);

  const goToJoin = (roomCode: string) => router.push(`/join/${encodeURIComponent(roomCode)}`);

  const startMeeting = async () => {
    if (roomType === 'password' && !roomPassword.trim()) {
      setCreateError('Şifre giriniz');
      return;
    }
    setCreating(true);
    setCreateError('');
    try {
      const res = await fetch('/api/rooms', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: roomType,
          ...(roomType === 'password' ? { password: roomPassword } : {}),
        }),
      });
      if (!res.ok) throw new Error('create failed');
      const room = await res.json() as { roomCode: string };
      goToJoin(room.roomCode);
    } catch {
      setCreateError('Oda oluşturulamadı, tekrar deneyin.');
      setCreating(false);
    }
  };

  const joinWithCode = () => {
    const code = codeRef.current?.value.trim() ?? '';
    if (!code) { codeRef.current?.focus(); return; }
    goToJoin(code);
  };

  const displayName = session?.user?.name ?? '';
  const avatar = session?.user?.image;
  const initials = displayName
    ? displayName.trim().split(' ').map((n) => n[0]).join('').toUpperCase().slice(0, 2)
    : null;

  return (
    <main style={{ minHeight: '100vh', background: '#0a0c14', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', fontFamily: 'Inter, sans-serif', padding: '24px', position: 'relative', overflow: 'hidden' }}>
      {/* Background glow */}
      <div style={{ position: 'absolute', inset: 0, pointerEvents: 'none', background: 'radial-gradient(ellipse 80% 60% at 50% 5%, rgba(59,130,246,0.13) 0%, transparent 70%)' }} />
      {/* Grid overlay */}
      <div style={{ position: 'absolute', inset: 0, pointerEvents: 'none', opacity: 0.022, backgroundImage: 'linear-gradient(rgba(255,255,255,1) 1px,transparent 1px),linear-gradient(90deg,rgba(255,255,255,1) 1px,transparent 1px)', backgroundSize: '56px 56px' }} />

      {/* Nav */}
      <nav style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 60, display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0 32px', borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <Image src="/logo-only.png" width={30} height={30} alt="Link" style={{ objectFit: 'contain' }} />
          <span style={{ color: 'white', fontWeight: 700, fontSize: 17, letterSpacing: '-0.02em' }}>Link</span>
        </div>
        <div style={{ display: 'flex', gap: 10 }}>
          {session ? (
            <button
              onClick={() => router.push('/profile')}
              style={{ display: 'flex', alignItems: 'center', gap: 8, background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 24, padding: '6px 12px 6px 6px', cursor: 'pointer', fontFamily: 'inherit' }}
            >
              {avatar ? (
                <Image src={avatar} width={24} height={24} alt={displayName} style={{ borderRadius: '50%' }} />
              ) : (
                <div style={{ width: 24, height: 24, borderRadius: '50%', background: 'linear-gradient(135deg,#3B82F6,#1E3FC4)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 10, fontWeight: 700, color: 'white', flexShrink: 0 }}>
                  {initials ?? '?'}
                </div>
              )}
              <span style={{ color: 'rgba(255,255,255,0.75)', fontSize: 12, fontWeight: 500 }}>{displayName}</span>
            </button>
          ) : (
            <>
              <NavBtn label="Log in" onClick={() => router.push('/auth/signin')} outline />
              <NavBtn label="Sign up" onClick={() => router.push('/auth/signin')} />
            </>
          )}
        </div>
      </nav>

      {/* Hero */}
      <div style={{ textAlign: 'center', zIndex: 1, maxWidth: 560 }}>
        <div style={{ marginBottom: 28, position: 'relative', display: 'inline-block' }}>
          <div style={{ position: 'absolute', inset: -20, borderRadius: '50%', background: 'radial-gradient(circle, rgba(59,130,246,0.18) 0%, transparent 70%)', pointerEvents: 'none' }} />
          <Image src="/logo-only.png" width={96} height={96} alt="Link" style={{ objectFit: 'contain', position: 'relative', zIndex: 1 }} />
        </div>
        <h1 style={{ color: 'white', fontSize: 52, fontWeight: 800, letterSpacing: '-0.04em', lineHeight: 1, marginBottom: 10 }}>Link</h1>
        <p style={{ color: 'rgba(255,255,255,0.48)', fontSize: 20, fontWeight: 400, letterSpacing: '-0.01em', marginBottom: 40, lineHeight: 1.4 }}>
          Crystal clear conversations.
        </p>

        {/* CTAs */}
        <div style={{ display: 'flex', gap: 12, justifyContent: 'center', flexWrap: 'wrap' }}>
          <HeroBtn primary onClick={() => { setShowCreate((v) => !v); setShowCode(false); }} label={showCreate ? 'İptal' : 'Toplantı Başlat'} />
          <HeroBtn onClick={() => { setShowCode((v) => !v); setShowCreate(false); }} label={showCode ? 'İptal' : 'Kodla Katıl'} />
        </div>

        {/* Create meeting panel */}
        {showCreate && (
          <div style={{ marginTop: 20, maxWidth: 380, margin: '20px auto 0', background: 'rgba(22,27,42,0.9)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 14, padding: '20px', animation: 'fadeUp 0.2s ease both' }}>
            <p style={{ color: 'rgba(255,255,255,0.5)', fontSize: 11, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.08em', margin: '0 0 10px' }}>Toplantı Tipi</p>
            <div style={{ display: 'flex', gap: 8, marginBottom: 16 }}>
              {(['public', 'password', 'invite_only'] as RoomType[]).map((t) => (
                <button key={t} onClick={() => setRoomType(t)}
                  style={{ flex: 1, padding: '9px 6px', borderRadius: 9, border: `1px solid ${roomType === t ? 'rgba(59,130,246,0.7)' : 'rgba(255,255,255,0.08)'}`, background: roomType === t ? 'rgba(59,130,246,0.18)' : 'transparent', color: roomType === t ? '#93c5fd' : 'rgba(255,255,255,0.45)', fontSize: 11, fontWeight: 600, cursor: 'pointer', fontFamily: 'Inter,sans-serif' }}>
                  {t === 'public' ? 'Herkese Açık' : t === 'password' ? 'Şifreli' : 'Sadece Davetli'}
                </button>
              ))}
            </div>
            {roomType === 'password' && (
              <input type="password" placeholder="Toplantı şifresi (min 4 karakter)" value={roomPassword} onChange={(e) => setRoomPassword(e.target.value)}
                style={{ width: '100%', boxSizing: 'border-box', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 9, padding: '10px 12px', color: 'white', fontSize: 13, outline: 'none', fontFamily: 'Inter,sans-serif', marginBottom: 12 }}
                onFocus={(e) => (e.target.style.borderColor = 'rgba(59,130,246,0.6)')}
                onBlur={(e) => (e.target.style.borderColor = 'rgba(255,255,255,0.1)')}
              />
            )}
            {createError && <p style={{ color: '#f87171', fontSize: 12, margin: '0 0 10px', textAlign: 'center' }}>{createError}</p>}
            <button onClick={() => void startMeeting()} disabled={creating}
              style={{ width: '100%', padding: '12px', background: creating ? '#1d4ed8' : '#3B82F6', border: 'none', borderRadius: 9, color: 'white', fontSize: 14, fontWeight: 600, cursor: creating ? 'not-allowed' : 'pointer', fontFamily: 'Inter,sans-serif', opacity: creating ? 0.7 : 1 }}>
              {creating ? 'Oluşturuluyor…' : 'Toplantıyı Başlat'}
            </button>
          </div>
        )}

        {/* Inline code input */}
        {showCode && (
          <div style={{ marginTop: 20, display: 'flex', gap: 10, maxWidth: 380, margin: '20px auto 0', animation: 'fadeUp 0.2s ease both' }}>
            <input
              ref={codeRef}
              id="room-id"
              placeholder="Oda kodu girin"
              spellCheck={false}
              autoFocus
              onKeyDown={(e) => e.key === 'Enter' && joinWithCode()}
              style={{ flex: 1, background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.15)', borderRadius: 11, padding: '13px 14px', color: 'white', fontSize: 14, outline: 'none', fontFamily: 'Inter, sans-serif' }}
              onFocus={(e) => (e.currentTarget.style.borderColor = 'rgba(59,130,246,0.6)')}
              onBlur={(e) => (e.currentTarget.style.borderColor = 'rgba(255,255,255,0.15)')}
            />
            <button
              onClick={joinWithCode}
              style={{ padding: '0 20px', background: '#3B82F6', border: 'none', borderRadius: 11, color: 'white', fontWeight: 600, fontSize: 14, cursor: 'pointer', fontFamily: 'Inter, sans-serif', whiteSpace: 'nowrap' }}
            >
              Katıl
            </button>
          </div>
        )}

        <p style={{ marginTop: 44, color: 'rgba(255,255,255,0.2)', fontSize: 12 }}>
          Trusted by 50,000+ teams worldwide
        </p>
      </div>
    </main>
  );
}

function NavBtn({ label, onClick, outline }: { label: string; onClick: () => void; outline?: boolean }) {
  return (
    <button
      onClick={onClick}
      style={{ padding: '8px 18px', borderRadius: 8, fontFamily: 'Inter, sans-serif', fontSize: 13, fontWeight: 500, cursor: 'pointer', background: outline ? 'transparent' : '#3B82F6', border: outline ? '1px solid rgba(255,255,255,0.15)' : 'none', color: 'rgba(255,255,255,0.85)', transition: 'all 0.15s' }}
      onMouseEnter={(e) => { if (!outline) e.currentTarget.style.background = '#2563EB'; }}
      onMouseLeave={(e) => { if (!outline) e.currentTarget.style.background = '#3B82F6'; }}
    >
      {label}
    </button>
  );
}

function HeroBtn({ label, onClick, primary }: { label: string; onClick: () => void; primary?: boolean }) {
  return (
    <button
      onClick={onClick}
      style={{ padding: '15px 32px', borderRadius: 13, fontFamily: 'Inter, sans-serif', fontSize: 15, fontWeight: 600, cursor: 'pointer', background: primary ? '#3B82F6' : 'rgba(255,255,255,0.07)', border: primary ? 'none' : '1px solid rgba(255,255,255,0.14)', color: 'white', transition: 'all 0.15s' }}
      onMouseEnter={(e) => { e.currentTarget.style.background = primary ? '#2563EB' : 'rgba(255,255,255,0.12)'; if (primary) e.currentTarget.style.boxShadow = '0 8px 28px rgba(59,130,246,0.4)'; }}
      onMouseLeave={(e) => { e.currentTarget.style.background = primary ? '#3B82F6' : 'rgba(255,255,255,0.07)'; e.currentTarget.style.boxShadow = 'none'; }}
    >
      {label}
    </button>
  );
}
