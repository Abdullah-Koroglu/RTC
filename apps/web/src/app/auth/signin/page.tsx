'use client';

import { Suspense, useState } from 'react';
import { signIn } from 'next-auth/react';
import Image from 'next/image';
import { useRouter, useSearchParams } from 'next/navigation';

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

const PROVIDER_LABELS: Record<string, string> = {
  google: 'Google',
  github: 'GitHub',
  credentials: 'email ve şifre',
};

function SignInContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const next = searchParams.get('next') ?? '/';
  const [loading, setLoading] = useState<string | null>(null);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');

  // Provider conflict warning (redirected from OAuth flow)
  const providerConflict = searchParams.get('error') === 'provider_conflict';
  const existingProvider = searchParams.get('existing') ?? '';
  const conflictMessage = providerConflict
    ? `Bu email adresi ${PROVIDER_LABELS[existingProvider] ?? existingProvider} ile kayıtlı. Lütfen o yöntemle giriş yapın.`
    : '';

  const handleOAuth = async (provider: string) => {
    setLoading(provider);
    await signIn(provider, { callbackUrl: next });
  };

  const handleCredentials = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim() || !password) return;
    setLoading('credentials');
    setError('');
    const result = await signIn('credentials', {
      email: email.trim(),
      password,
      redirect: false,
    });
    setLoading(null);
    if (result?.error) {
      setError('Email veya şifre hatalı.');
    } else {
      router.push(next);
    }
  };

  const handleAnonymous = () => router.push(next);

  const inputStyle: React.CSSProperties = {
    width: '100%',
    boxSizing: 'border-box',
    background: 'rgba(255,255,255,0.05)',
    border: '1px solid rgba(255,255,255,0.1)',
    borderRadius: 11,
    padding: '12px 13px',
    color: 'white',
    fontSize: 14,
    outline: 'none',
    fontFamily: 'Inter, sans-serif',
  };

  return (
    <main style={{ minHeight: '100vh', background: '#0a0c14', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'Inter, sans-serif', padding: 24, position: 'relative', overflow: 'hidden' }}>
      <div style={{ position: 'absolute', inset: 0, pointerEvents: 'none', background: 'radial-gradient(ellipse 60% 40% at 50% 0%, rgba(59,130,246,0.1) 0%, transparent 70%)' }} />
      <div style={{ position: 'absolute', inset: 0, pointerEvents: 'none', opacity: 0.022, backgroundImage: 'linear-gradient(rgba(255,255,255,1) 1px,transparent 1px),linear-gradient(90deg,rgba(255,255,255,1) 1px,transparent 1px)', backgroundSize: '56px 56px' }} />

      <div style={{ background: 'rgba(22,27,42,0.82)', backdropFilter: 'blur(24px)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 22, padding: '36px 32px', width: '100%', maxWidth: 400, zIndex: 1, boxShadow: '0 32px 80px rgba(0,0,0,0.5)', position: 'relative' }}>
        <div style={{ textAlign: 'center', marginBottom: 28 }}>
          <Image src="/logo-only.png" width={52} height={52} alt="Link" style={{ objectFit: 'contain', marginBottom: 12 }} />
          <h2 style={{ color: 'white', fontSize: 22, fontWeight: 700, letterSpacing: '-0.02em', margin: 0 }}>Link&apos;e Giriş Yap</h2>
          <p style={{ color: 'rgba(255,255,255,0.38)', fontSize: 13, marginTop: 6 }}>Devam etmek için bir yöntem seçin</p>
        </div>

        {conflictMessage && (
          <div style={{ background: 'rgba(239,68,68,0.12)', border: '1px solid rgba(239,68,68,0.3)', borderRadius: 10, padding: '12px 14px', marginBottom: 20, color: '#fca5a5', fontSize: 13, textAlign: 'center', lineHeight: 1.5 }}>
            {conflictMessage}
          </div>
        )}

        {/* OAuth */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 9, marginBottom: 20 }}>
          <SocialBtn icon={<GoogleIcon />} label={loading === 'google' ? 'Yönlendiriliyor…' : 'Google ile devam et'} onClick={() => void handleOAuth('google')} disabled={loading !== null} />
          <SocialBtn icon={<GitHubIcon />} label={loading === 'github' ? 'Yönlendiriliyor…' : 'GitHub ile devam et'} onClick={() => void handleOAuth('github')} disabled={loading !== null} />
        </div>

        <Divider />

        {/* Email + Password */}
        <form onSubmit={(e) => void handleCredentials(e)} style={{ display: 'flex', flexDirection: 'column', gap: 9, marginBottom: 16 }}>
          <input
            type="email"
            placeholder="Email adresi"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            style={inputStyle}
            onFocus={(e) => (e.target.style.borderColor = 'rgba(59,130,246,0.6)')}
            onBlur={(e) => (e.target.style.borderColor = 'rgba(255,255,255,0.1)')}
          />
          <input
            type="password"
            placeholder="Şifre"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            style={inputStyle}
            onFocus={(e) => (e.target.style.borderColor = 'rgba(59,130,246,0.6)')}
            onBlur={(e) => (e.target.style.borderColor = 'rgba(255,255,255,0.1)')}
          />
          {error && (
            <p style={{ color: '#f87171', fontSize: 13, margin: 0, textAlign: 'center' }}>{error}</p>
          )}
          <button
            type="submit"
            disabled={loading !== null}
            style={{ width: '100%', padding: '13px', background: loading === 'credentials' ? '#1d4ed8' : '#3B82F6', border: 'none', borderRadius: 11, color: 'white', fontSize: 14, fontWeight: 600, cursor: loading !== null ? 'not-allowed' : 'pointer', fontFamily: 'Inter, sans-serif', opacity: loading !== null ? 0.7 : 1 }}
          >
            {loading === 'credentials' ? 'Giriş yapılıyor…' : 'Giriş yap'}
          </button>
        </form>

        <p style={{ textAlign: 'center', color: 'rgba(255,255,255,0.38)', fontSize: 13, marginBottom: 16 }}>
          Hesabın yok mu?{' '}
          <a href="/auth/register" style={{ color: '#60a5fa', textDecoration: 'none', fontWeight: 500 }}>Kayıt ol</a>
        </p>

        <button
          onClick={handleAnonymous}
          style={{ width: '100%', padding: '12px', background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.09)', borderRadius: 11, color: 'rgba(255,255,255,0.5)', fontSize: 13, fontWeight: 500, cursor: 'pointer', fontFamily: 'Inter, sans-serif' }}
          onMouseEnter={(e) => (e.currentTarget.style.background = 'rgba(255,255,255,0.08)')}
          onMouseLeave={(e) => (e.currentTarget.style.background = 'rgba(255,255,255,0.04)')}
        >
          Giriş yapmadan devam et
        </button>

        <p style={{ textAlign: 'center', color: 'rgba(255,255,255,0.22)', fontSize: 11, marginTop: 20, lineHeight: 1.6 }}>
          Devam ederek Link&apos;in{' '}
          <span style={{ color: 'rgba(255,255,255,0.45)', cursor: 'pointer' }}>Kullanım Şartları</span>
          {' '}&amp;{' '}
          <span style={{ color: 'rgba(255,255,255,0.45)', cursor: 'pointer' }}>Gizlilik Politikası</span>&apos;nı kabul etmiş olursunuz.
        </p>
      </div>
    </main>
  );
}

export default function SignInPage() {
  return (
    <Suspense>
      <SignInContent />
    </Suspense>
  );
}

function Divider() {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 20 }}>
      <div style={{ flex: 1, height: 1, background: 'rgba(255,255,255,0.07)' }} />
      <span style={{ color: 'rgba(255,255,255,0.3)', fontSize: 12, fontWeight: 500 }}>veya</span>
      <div style={{ flex: 1, height: 1, background: 'rgba(255,255,255,0.07)' }} />
    </div>
  );
}

function SocialBtn({ icon, label, onClick, disabled }: { icon: React.ReactNode; label: string; onClick: () => void; disabled?: boolean }) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      style={{ width: '100%', padding: '13px 16px', background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 11, display: 'flex', alignItems: 'center', gap: 12, cursor: disabled ? 'not-allowed' : 'pointer', fontFamily: 'Inter, sans-serif', opacity: disabled ? 0.6 : 1 }}
      onMouseEnter={(e) => { if (!disabled) e.currentTarget.style.background = 'rgba(255,255,255,0.1)'; }}
      onMouseLeave={(e) => { if (!disabled) e.currentTarget.style.background = 'rgba(255,255,255,0.06)'; }}
    >
      <span style={{ flexShrink: 0, width: 20, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>{icon}</span>
      <span style={{ color: 'rgba(255,255,255,0.88)', fontSize: 13, fontWeight: 500, flex: 1, textAlign: 'center' }}>{label}</span>
    </button>
  );
}
