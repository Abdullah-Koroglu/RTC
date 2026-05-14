'use client';

import { useState } from 'react';
import { signIn } from 'next-auth/react';
import Image from 'next/image';
import { useRouter } from 'next/navigation';

const GoogleIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24">
    <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
    <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
    <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
    <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
  </svg>
);

const GitHubIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="rgba(255,255,255,0.9)">
    <path d="M12 0C5.37 0 0 5.37 0 12c0 5.31 3.435 9.795 8.205 11.385.6.105.825-.255.825-.57 0-.285-.015-1.23-.015-2.235-3.015.555-3.795-.735-4.035-1.41-.135-.345-.72-1.41-1.23-1.695-.42-.225-1.02-.78-.015-.795.945-.015 1.62.87 1.845 1.23 1.08 1.815 2.805 1.305 3.495.99.105-.78.42-1.305.765-1.605-2.67-.3-5.46-1.335-5.46-5.925 0-1.305.465-2.385 1.23-3.225-.12-.3-.54-1.53.12-3.18 0 0 1.005-.315 3.3 1.23.96-.27 1.98-.405 3-.405s2.04.135 3 .405c2.295-1.56 3.3-1.23 3.3-1.23.66 1.65.24 2.88.12 3.18.765.84 1.23 1.905 1.23 3.225 0 4.605-2.805 5.625-5.475 5.925.435.375.81 1.095.81 2.22 0 1.605-.015 2.895-.015 3.3 0 .315.225.69.825.57A12.02 12.02 0 0 0 24 12c0-6.63-5.37-12-12-12z"/>
  </svg>
);

const InstaIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
    <rect x="2" y="2" width="20" height="20" rx="5"/>
    <circle cx="12" cy="12" r="5"/>
    <circle cx="17.5" cy="6.5" r="1.2" fill="white" stroke="none"/>
  </svg>
);

export default function SignInPage() {
  const router = useRouter();
  const [loading, setLoading] = useState<string | null>(null);

  const handleSignIn = async (provider: string) => {
    if (provider === 'instagram') return; // coming soon
    setLoading(provider);
    await signIn(provider, { callbackUrl: '/' });
  };

  return (
    <main
      className="relative flex min-h-screen items-center justify-center overflow-hidden px-4"
      style={{ background: '#0a0c14' }}
    >
      {/* BG glow */}
      <div
        className="pointer-events-none absolute inset-0"
        style={{ background: 'radial-gradient(ellipse 60% 40% at 50% 0%, rgba(59,130,246,0.1) 0%, transparent 70%)' }}
      />
      {/* Grid */}
      <div
        className="pointer-events-none absolute inset-0 opacity-[0.02]"
        style={{
          backgroundImage:
            'linear-gradient(rgba(255,255,255,1) 1px,transparent 1px),linear-gradient(90deg,rgba(255,255,255,1) 1px,transparent 1px)',
          backgroundSize: '56px 56px',
        }}
      />

      <div
        className="relative z-10 w-full max-w-sm rounded-[22px] px-8 py-9 shadow-2xl"
        style={{
          background: 'rgba(22,27,42,0.82)',
          backdropFilter: 'blur(24px)',
          border: '1px solid rgba(255,255,255,0.08)',
        }}
      >
        {/* Logo + heading */}
        <div className="mb-7 flex flex-col items-center text-center">
          <Image src="/logo-only.png" width={52} height={52} alt="Link" className="mb-3 object-contain" />
          <h1 className="text-xl font-bold tracking-tight text-white">Link'e Giriş Yap</h1>
          <p className="mt-1.5 text-sm" style={{ color: 'rgba(255,255,255,0.38)' }}>
            Nasıl devam etmek istersin?
          </p>
        </div>

        {/* Social buttons */}
        <div className="flex flex-col gap-2.5 mb-5">
          <SocialButton
            icon={<GoogleIcon />}
            label={loading === 'google' ? 'Yönlendiriliyor…' : 'Google ile devam et'}
            onClick={() => void handleSignIn('google')}
            disabled={loading !== null}
          />
          <SocialButton
            icon={<GitHubIcon />}
            label={loading === 'github' ? 'Yönlendiriliyor…' : 'GitHub ile devam et'}
            onClick={() => void handleSignIn('github')}
            disabled={loading !== null}
          />
          <SocialButton
            icon={<InstaIcon />}
            label="Instagram ile devam et (Yakında)"
            gradient
            disabled
            onClick={() => {}}
          />
        </div>

        {/* Divider */}
        <div className="my-5 flex items-center gap-3">
          <div className="h-px flex-1" style={{ background: 'rgba(255,255,255,0.07)' }} />
          <span className="text-xs font-medium" style={{ color: 'rgba(255,255,255,0.3)' }}>veya</span>
          <div className="h-px flex-1" style={{ background: 'rgba(255,255,255,0.07)' }} />
        </div>

        {/* Anonymous continue */}
        <button
          onClick={() => router.push('/')}
          className="w-full rounded-xl py-3 text-sm font-medium transition"
          style={{
            background: 'rgba(255,255,255,0.05)',
            border: '1px solid rgba(255,255,255,0.1)',
            color: 'rgba(255,255,255,0.65)',
            cursor: 'pointer',
            fontFamily: 'inherit',
          }}
          onMouseEnter={(e) => ((e.currentTarget as HTMLButtonElement).style.background = 'rgba(255,255,255,0.1)')}
          onMouseLeave={(e) => ((e.currentTarget as HTMLButtonElement).style.background = 'rgba(255,255,255,0.05)')}
        >
          Giriş yapmadan devam et
        </button>

        <p className="mt-5 text-center text-[11px] leading-relaxed" style={{ color: 'rgba(255,255,255,0.2)' }}>
          Devam ederek Link&apos;in{' '}
          <span className="cursor-pointer" style={{ color: 'rgba(255,255,255,0.45)' }}>Kullanım Koşulları</span>
          {' '}ve{' '}
          <span className="cursor-pointer" style={{ color: 'rgba(255,255,255,0.45)' }}>Gizlilik Politikası</span>&apos;nı kabul etmiş olursun.
        </p>
      </div>
    </main>
  );
}

function SocialButton({
  icon, label, onClick, gradient, disabled,
}: {
  icon: React.ReactNode;
  label: string;
  onClick: () => void;
  gradient?: boolean;
  disabled?: boolean;
}) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className="flex w-full items-center gap-3 rounded-xl px-4 py-3 text-sm font-medium transition disabled:cursor-not-allowed disabled:opacity-50"
      style={{
        background: gradient
          ? 'linear-gradient(90deg,#f09433,#e6683c,#dc2743,#cc2366,#bc1888)'
          : 'rgba(255,255,255,0.06)',
        border: '1px solid rgba(255,255,255,0.1)',
        color: 'rgba(255,255,255,0.88)',
        cursor: disabled ? 'not-allowed' : 'pointer',
        fontFamily: 'inherit',
        textAlign: 'left',
      }}
      onMouseEnter={(e) => {
        if (!disabled && !gradient)
          (e.currentTarget as HTMLButtonElement).style.background = 'rgba(255,255,255,0.1)';
      }}
      onMouseLeave={(e) => {
        if (!disabled && !gradient)
          (e.currentTarget as HTMLButtonElement).style.background = 'rgba(255,255,255,0.06)';
      }}
    >
      <span className="flex h-5 w-5 shrink-0 items-center justify-center">{icon}</span>
      <span className="flex-1 text-center">{label}</span>
    </button>
  );
}
