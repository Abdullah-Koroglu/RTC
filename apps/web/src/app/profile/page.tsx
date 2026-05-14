'use client';

import { useEffect, useRef, useState } from 'react';
import { useSession, signOut } from 'next-auth/react';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { ArrowLeft, Camera, Check } from 'lucide-react';

const SS_DISPLAY_NAME = 'rtc:displayName';

const PROVIDER_COLOR: Record<string, string> = {
  google: '#4285F4',
  github: 'rgba(255,255,255,0.6)',
  instagram: '#E1306C',
};
const PROVIDER_LABEL: Record<string, string> = {
  google: 'Google',
  github: 'GitHub',
  instagram: 'Instagram',
};

export default function ProfilePage() {
  const { data: session, update: updateSession } = useSession();
  const router = useRouter();
  const fileRef = useRef<HTMLInputElement>(null);

  const [name, setName] = useState('');
  const [photo, setPhoto] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);
  const [dragging, setDragging] = useState(false);

  useEffect(() => {
    if (session?.user) {
      setName(session.user.name ?? sessionStorage.getItem(SS_DISPLAY_NAME) ?? '');
      setPhoto(session.user.image ?? null);
    }
  }, [session]);

  const initials = name.trim()
    ? name.trim().split(' ').filter(Boolean).map((n) => n[0]).join('').toUpperCase().slice(0, 2)
    : '?';

  const loadFile = (file: File | null | undefined) => {
    if (!file?.type.startsWith('image/')) return;
    const reader = new FileReader();
    reader.onload = (e) => setPhoto(e.target?.result as string);
    reader.readAsDataURL(file);
  };

  const handleSave = async () => {
    if (!name.trim()) return;
    sessionStorage.setItem(SS_DISPLAY_NAME, name.trim());
    await updateSession({ user: { ...session?.user, name: name.trim(), image: photo } });
    setSaved(true);
    setTimeout(() => setSaved(false), 2400);
  };

  const provider = session?.user?.provider;

  return (
    <main
      className="relative flex min-h-screen items-center justify-center overflow-hidden px-4 py-8"
      style={{ background: '#0a0c14' }}
    >
      {/* BG */}
      <div className="pointer-events-none absolute inset-0"
        style={{ background: 'radial-gradient(ellipse 60% 40% at 50% 0%, rgba(59,130,246,0.1) 0%, transparent 70%)' }} />
      <div className="pointer-events-none absolute inset-0 opacity-[0.018]"
        style={{ backgroundImage: 'linear-gradient(rgba(255,255,255,1) 1px,transparent 1px),linear-gradient(90deg,rgba(255,255,255,1) 1px,transparent 1px)', backgroundSize: '56px 56px' }} />

      {/* Back */}
      <button
        onClick={() => router.push('/')}
        className="absolute left-5 top-5 flex items-center gap-2 rounded-xl px-3.5 py-2 text-sm font-medium transition"
        style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.09)', color: 'rgba(255,255,255,0.65)', cursor: 'pointer', fontFamily: 'inherit' }}
        onMouseEnter={(e) => ((e.currentTarget as HTMLButtonElement).style.background = 'rgba(255,255,255,0.1)')}
        onMouseLeave={(e) => ((e.currentTarget as HTMLButtonElement).style.background = 'rgba(255,255,255,0.05)')}
      >
        <ArrowLeft size={14} /> Geri
      </button>

      <div
        className="relative z-10 w-full max-w-sm rounded-[22px] px-8 py-9 shadow-2xl"
        style={{ background: 'rgba(22,27,42,0.82)', backdropFilter: 'blur(24px)', border: '1px solid rgba(255,255,255,0.08)' }}
      >
        {/* Heading */}
        <div className="mb-7 text-center">
          <h1 className="text-xl font-bold tracking-tight text-white">Profilin</h1>
          <p className="mt-1 text-sm" style={{ color: 'rgba(255,255,255,0.35)' }}>Adını ve fotoğrafını güncelle</p>
        </div>

        {/* Avatar picker */}
        <div className="mb-7 flex flex-col items-center">
          <div
            role="button"
            tabIndex={0}
            onClick={() => fileRef.current?.click()}
            onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
            onDragLeave={() => setDragging(false)}
            onDrop={(e) => { e.preventDefault(); setDragging(false); loadFile(e.dataTransfer.files[0]); }}
            onKeyDown={(e) => e.key === 'Enter' && fileRef.current?.click()}
            className="relative cursor-pointer"
          >
            <div
              className="h-[104px] w-[104px] overflow-hidden rounded-full transition"
              style={{
                border: `2.5px solid ${dragging ? '#3B82F6' : 'rgba(59,130,246,0.38)'}`,
                boxShadow: `0 0 0 5px rgba(59,130,246,${dragging ? '0.18' : '0.1'})`,
              }}
            >
              {photo ? (
                <Image src={photo} width={104} height={104} alt="avatar" className="h-full w-full object-cover" />
              ) : (
                <div
                  className="flex h-full w-full items-center justify-center text-3xl font-bold text-white"
                  style={{ background: 'linear-gradient(135deg,#3B82F6dd,#3B82F677)' }}
                >
                  {initials}
                </div>
              )}
            </div>
            <div
              className="absolute bottom-0.5 right-0.5 flex h-8 w-8 items-center justify-center rounded-full shadow-lg"
              style={{ background: '#3B82F6', border: '2.5px solid #0a0c14' }}
            >
              <Camera size={13} className="text-white" />
            </div>
          </div>

          <input
            ref={fileRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={(e) => loadFile(e.target.files?.[0])}
          />
          <p className="mt-2.5 text-center text-xs" style={{ color: 'rgba(255,255,255,0.28)' }}>
            Tıkla veya fotoğraf sürükle
          </p>
          {photo && (
            <button
              onClick={() => setPhoto(null)}
              className="mt-1 text-xs transition"
              style={{ background: 'none', border: 'none', color: 'rgba(239,68,68,0.65)', cursor: 'pointer', fontFamily: 'inherit' }}
              onMouseEnter={(e) => ((e.currentTarget as HTMLButtonElement).style.color = 'rgba(239,68,68,0.9)')}
              onMouseLeave={(e) => ((e.currentTarget as HTMLButtonElement).style.color = 'rgba(239,68,68,0.65)')}
            >
              Fotoğrafı kaldır
            </button>
          )}
        </div>

        {/* Name field */}
        <div className="mb-3.5">
          <label className="mb-1.5 block text-[10px] font-semibold uppercase tracking-widest" style={{ color: 'rgba(255,255,255,0.4)' }}>
            Görünen Ad
          </label>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && void handleSave()}
            placeholder="Adın"
            className="w-full rounded-xl px-3.5 py-3 text-sm text-white outline-none transition placeholder:text-white/30"
            style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)' }}
            onFocus={(e) => (e.target.style.borderColor = 'rgba(59,130,246,0.6)')}
            onBlur={(e) => (e.target.style.borderColor = 'rgba(255,255,255,0.1)')}
          />
        </div>

        {/* Email + provider (read-only) */}
        {session?.user?.email && (
          <div
            className="mb-6 flex items-center justify-between rounded-xl px-3.5 py-3"
            style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.07)' }}
          >
            <div>
              <div className="mb-0.5 text-[10px] font-semibold uppercase tracking-widest" style={{ color: 'rgba(255,255,255,0.36)' }}>E-posta</div>
              <div className="text-sm" style={{ color: 'rgba(255,255,255,0.65)' }}>{session.user.email}</div>
            </div>
            {provider && (
              <span
                className="rounded-full px-3 py-1 text-[11px] font-medium"
                style={{
                  background: 'rgba(255,255,255,0.06)',
                  border: '1px solid rgba(255,255,255,0.09)',
                  color: PROVIDER_COLOR[provider] ?? 'rgba(255,255,255,0.5)',
                }}
              >
                {PROVIDER_LABEL[provider] ?? provider}
              </span>
            )}
          </div>
        )}

        {/* Save */}
        <button
          onClick={() => void handleSave()}
          disabled={!name.trim()}
          className="mb-2.5 flex w-full items-center justify-center gap-2 rounded-xl py-3 text-sm font-semibold transition disabled:cursor-not-allowed"
          style={{
            background: saved ? 'rgba(34,197,94,0.18)' : name.trim() ? '#3B82F6' : 'rgba(59,130,246,0.22)',
            border: saved ? '1px solid rgba(34,197,94,0.35)' : 'none',
            color: saved ? '#4ADE80' : name.trim() ? 'white' : 'rgba(255,255,255,0.3)',
            cursor: name.trim() ? 'pointer' : 'not-allowed',
            fontFamily: 'inherit',
          }}
          onMouseEnter={(e) => { if (name.trim() && !saved) (e.currentTarget as HTMLButtonElement).style.background = '#2563EB'; }}
          onMouseLeave={(e) => { if (name.trim() && !saved) (e.currentTarget as HTMLButtonElement).style.background = '#3B82F6'; }}
        >
          {saved ? <><Check size={15} /> Kaydedildi!</> : 'Kaydet'}
        </button>

        {/* Sign out */}
        {session && (
          <button
            onClick={() => void signOut({ callbackUrl: '/' })}
            className="w-full rounded-xl py-3 text-sm font-medium transition"
            style={{ background: 'transparent', border: '1px solid rgba(239,68,68,0.18)', color: 'rgba(239,68,68,0.55)', cursor: 'pointer', fontFamily: 'inherit' }}
            onMouseEnter={(e) => { (e.currentTarget as HTMLButtonElement).style.background = 'rgba(239,68,68,0.07)'; (e.currentTarget as HTMLButtonElement).style.color = 'rgba(239,68,68,0.85)'; }}
            onMouseLeave={(e) => { (e.currentTarget as HTMLButtonElement).style.background = 'transparent'; (e.currentTarget as HTMLButtonElement).style.color = 'rgba(239,68,68,0.55)'; }}
          >
            Çıkış Yap
          </button>
        )}
      </div>
    </main>
  );
}
