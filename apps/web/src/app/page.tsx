'use client';

import type { FormEvent } from 'react';
import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useSession, signIn } from 'next-auth/react';
import Image from 'next/image';
import { generateUUID } from '@/lib/uuid';

const SS_DISPLAY_NAME = 'rtc:displayName';
const SS_PEER_ID = 'rtc:peerId';

export const dynamic = 'force-dynamic';

function getOrCreatePeerId(): string {
  const stored = sessionStorage.getItem(SS_PEER_ID);
  if (stored) return stored;
  const id = `usr-${generateUUID().slice(0, 8)}`;
  sessionStorage.setItem(SS_PEER_ID, id);
  return id;
}

export default function LandingPage() {
  const router = useRouter();
  const { data: session } = useSession();

  const [showCode, setShowCode] = useState(false);
  const codeRef = useRef<HTMLInputElement>(null);
  const nameRef = useRef<HTMLInputElement>(null);
  const [savedName, setSavedName] = useState('');

  useEffect(() => {
    // Pre-fill name from session or sessionStorage
    const name = session?.user?.name ?? sessionStorage.getItem(SS_DISPLAY_NAME) ?? '';
    setSavedName(name);
    if (nameRef.current) nameRef.current.value = name;
    if (session?.user?.name) {
      sessionStorage.setItem(SS_DISPLAY_NAME, session.user.name);
    }
  }, [session]);

  const startMeeting = () => {
    const name = nameRef.current?.value.trim() ?? '';
    if (!name) { nameRef.current?.focus(); return; }
    const peerId = session?.user?.id ?? getOrCreatePeerId();
    sessionStorage.setItem(SS_DISPLAY_NAME, name);
    sessionStorage.setItem(SS_PEER_ID, peerId);
    router.push(`/room/${generateUUID()}`);
  };

  const joinWithCode = (e: FormEvent) => {
    e.preventDefault();
    const code = codeRef.current?.value.trim() ?? '';
    const name = nameRef.current?.value.trim() ?? '';
    if (!code || !name) return;
    const peerId = session?.user?.id ?? getOrCreatePeerId();
    sessionStorage.setItem(SS_DISPLAY_NAME, name);
    sessionStorage.setItem(SS_PEER_ID, peerId);
    router.push(`/room/${encodeURIComponent(code)}`);
  };

  const displayName = session?.user?.name ?? savedName;
  const avatar = session?.user?.image;
  const initials = displayName
    ? displayName.trim().split(' ').map((n) => n[0]).join('').toUpperCase().slice(0, 2)
    : null;

  return (
    <main
      className="relative flex min-h-screen flex-col items-center justify-center overflow-hidden px-4 py-6 font-sans"
      style={{ background: '#0a0c14' }}
    >
      {/* Background glow */}
      <div
        className="pointer-events-none absolute inset-0"
        style={{ background: 'radial-gradient(ellipse 80% 55% at 50% 0%, rgba(59,130,246,0.13) 0%, transparent 70%)' }}
      />
      {/* Grid */}
      <div
        className="pointer-events-none absolute inset-0 opacity-[0.022]"
        style={{
          backgroundImage:
            'linear-gradient(rgba(255,255,255,1) 1px,transparent 1px),linear-gradient(90deg,rgba(255,255,255,1) 1px,transparent 1px)',
          backgroundSize: '56px 56px',
        }}
      />

      {/* Nav */}
      <nav
        className="absolute inset-x-0 top-0 flex items-center justify-between px-6 py-4"
        style={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}
      >
        <div className="flex items-center gap-2.5">
          <Image src="/logo-only.png" width={28} height={28} alt="Link" className="object-contain" />
          <span className="text-[17px] font-bold tracking-tight text-white">Link</span>
        </div>

        <div className="flex items-center gap-2">
          {session ? (
            <>
              {avatar ? (
                <Image
                  src={avatar}
                  width={32}
                  height={32}
                  alt={session.user.name ?? ''}
                  className="rounded-full"
                />
              ) : (
                <div
                  className="flex h-8 w-8 items-center justify-center rounded-full text-xs font-bold text-white"
                  style={{ background: 'linear-gradient(135deg,#3B82F6,#1E3FC4)' }}
                >
                  {initials}
                </div>
              )}
              <button
                onClick={() => router.push('/profile')}
                className="rounded-lg px-3 py-1.5 text-sm font-medium transition"
                style={{ color: 'rgba(255,255,255,0.7)', border: '1px solid rgba(255,255,255,0.1)' }}
              >
                Profil
              </button>
            </>
          ) : (
            <>
              <NavButton label="Giriş Yap" onClick={() => void signIn()} outline />
              <NavButton label="Kayıt Ol" onClick={() => router.push('/auth/signin')} />
            </>
          )}
        </div>
      </nav>

      {/* Hero */}
      <div className="relative z-10 flex flex-col items-center text-center" style={{ maxWidth: 560 }}>
        <div className="relative mb-7 inline-block">
          <div
            className="pointer-events-none absolute inset-[-20px] rounded-full"
            style={{ background: 'radial-gradient(circle, rgba(59,130,246,0.18) 0%, transparent 70%)' }}
          />
          <Image src="/logo-only.png" width={92} height={92} alt="Link" className="relative z-10 object-contain" />
        </div>

        <h1
          className="mb-3 text-[52px] font-extrabold leading-none tracking-tight text-white"
          style={{ letterSpacing: '-0.04em' }}
        >
          Link
        </h1>
        <p className="mb-10 text-lg" style={{ color: 'rgba(255,255,255,0.45)' }}>
          Crystal clear conversations.
        </p>

        {/* Name field */}
        <div className="mb-5 w-full max-w-xs">
          <input
            ref={nameRef}
            id="peer-id"
            defaultValue={savedName}
            placeholder="Adınız"
            autoComplete="nickname"
            spellCheck={false}
            className="w-full rounded-xl px-4 py-3 text-sm text-white outline-none transition placeholder:text-white/30"
            style={{
              background: 'rgba(255,255,255,0.06)',
              border: '1px solid rgba(255,255,255,0.12)',
            }}
            onFocus={(e) => (e.target.style.borderColor = 'rgba(59,130,246,0.6)')}
            onBlur={(e) => (e.target.style.borderColor = 'rgba(255,255,255,0.12)')}
          />
        </div>

        {/* CTAs */}
        <div className="flex flex-wrap justify-center gap-3">
          <HeroButton primary onClick={startMeeting} label="Toplantı Başlat" />
          <HeroButton onClick={() => setShowCode((v) => !v)} label={showCode ? 'İptal' : 'Kodla Katıl'} />
        </div>

        {/* Join with code */}
        {showCode && (
          <form
            onSubmit={joinWithCode}
            className="mt-5 flex w-full max-w-sm gap-2"
            style={{ animation: 'fadeUp 0.2s ease both' }}
          >
            <input
              ref={codeRef}
              id="room-id"
              placeholder="Oda kodu (örn. room-k9p2m)"
              spellCheck={false}
              autoFocus
              className="min-w-0 flex-1 rounded-xl px-4 py-3 text-sm text-white outline-none placeholder:text-white/30"
              style={{
                background: 'rgba(255,255,255,0.06)',
                border: '1px solid rgba(255,255,255,0.15)',
              }}
              onFocus={(e) => (e.target.style.borderColor = 'rgba(59,130,246,0.6)')}
              onBlur={(e) => (e.target.style.borderColor = 'rgba(255,255,255,0.15)')}
            />
            <button
              type="submit"
              className="rounded-xl px-5 py-3 text-sm font-semibold text-white transition hover:bg-blue-500"
              style={{ background: '#3B82F6', border: 'none', cursor: 'pointer' }}
            >
              Katıl
            </button>
          </form>
        )}

        <p className="mt-12 text-xs" style={{ color: 'rgba(255,255,255,0.18)' }}>
          Dünyanın dört bir yanındaki 50.000+ ekip tarafından güvenilir
        </p>
      </div>

      <style>{`
        @keyframes fadeUp {
          from { opacity: 0; transform: translateY(8px); }
          to   { opacity: 1; transform: translateY(0); }
        }
      `}</style>
    </main>
  );
}

function NavButton({ label, onClick, outline }: { label: string; onClick: () => void; outline?: boolean }) {
  return (
    <button
      onClick={onClick}
      className="rounded-lg px-4 py-2 text-sm font-medium transition"
      style={{
        background: outline ? 'transparent' : '#3B82F6',
        border: outline ? '1px solid rgba(255,255,255,0.15)' : 'none',
        color: 'rgba(255,255,255,0.85)',
        cursor: 'pointer',
        fontFamily: 'inherit',
      }}
    >
      {label}
    </button>
  );
}

function HeroButton({ label, onClick, primary }: { label: string; onClick: () => void; primary?: boolean }) {
  return (
    <button
      onClick={onClick}
      className="rounded-[13px] px-8 py-[15px] text-[15px] font-semibold text-white transition"
      style={{
        background: primary ? '#3B82F6' : 'rgba(255,255,255,0.07)',
        border: primary ? 'none' : '1px solid rgba(255,255,255,0.14)',
        cursor: 'pointer',
        fontFamily: 'inherit',
      }}
      onMouseEnter={(e) => {
        (e.currentTarget as HTMLButtonElement).style.background = primary
          ? '#2563EB'
          : 'rgba(255,255,255,0.12)';
      }}
      onMouseLeave={(e) => {
        (e.currentTarget as HTMLButtonElement).style.background = primary
          ? '#3B82F6'
          : 'rgba(255,255,255,0.07)';
      }}
    >
      {label}
    </button>
  );
}
