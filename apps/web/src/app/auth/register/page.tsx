'use client';

import { Suspense, useState } from 'react';
import { signIn } from 'next-auth/react';
import Image from 'next/image';
import { useRouter, useSearchParams } from 'next/navigation';

function RegisterContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const next = searchParams.get('next') ?? '/';
  const [loading, setLoading] = useState(false);
  const [displayName, setDisplayName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!displayName.trim() || !email.trim() || !password) return;
    setLoading(true);
    setError('');

    try {
      const res = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: email.trim(), password, displayName: displayName.trim() }),
      });

      if (res.status === 409) {
        setError('Bu email adresi zaten kayıtlı.');
        setLoading(false);
        return;
      }
      if (!res.ok) {
        setError('Kayıt sırasında bir hata oluştu.');
        setLoading(false);
        return;
      }

      // Auto sign-in after registration
      const result = await signIn('credentials', {
        email: email.trim(),
        password,
        redirect: false,
      });

      if (result?.error) {
        router.push('/auth/signin');
      } else {
        router.push(next);
      }
    } catch {
      setError('Bağlantı hatası. Lütfen tekrar deneyin.');
      setLoading(false);
    }
  };

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
          <h2 style={{ color: 'white', fontSize: 22, fontWeight: 700, letterSpacing: '-0.02em', margin: 0 }}>Hesap oluştur</h2>
          <p style={{ color: 'rgba(255,255,255,0.38)', fontSize: 13, marginTop: 6 }}>Link&apos;e ücretsiz katıl</p>
        </div>

        <form onSubmit={(e) => void handleSubmit(e)} style={{ display: 'flex', flexDirection: 'column', gap: 9, marginBottom: 16 }}>
          <input
            type="text"
            placeholder="Ad Soyad"
            value={displayName}
            onChange={(e) => setDisplayName(e.target.value)}
            required
            minLength={2}
            maxLength={50}
            style={inputStyle}
            onFocus={(e) => (e.target.style.borderColor = 'rgba(59,130,246,0.6)')}
            onBlur={(e) => (e.target.style.borderColor = 'rgba(255,255,255,0.1)')}
          />
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
            placeholder="Şifre (en az 8 karakter)"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            minLength={8}
            style={inputStyle}
            onFocus={(e) => (e.target.style.borderColor = 'rgba(59,130,246,0.6)')}
            onBlur={(e) => (e.target.style.borderColor = 'rgba(255,255,255,0.1)')}
          />
          {error && (
            <p style={{ color: '#f87171', fontSize: 13, margin: 0, textAlign: 'center' }}>{error}</p>
          )}
          <button
            type="submit"
            disabled={loading}
            style={{ width: '100%', padding: '13px', background: loading ? '#1d4ed8' : '#3B82F6', border: 'none', borderRadius: 11, color: 'white', fontSize: 14, fontWeight: 600, cursor: loading ? 'not-allowed' : 'pointer', fontFamily: 'Inter, sans-serif', opacity: loading ? 0.7 : 1 }}
          >
            {loading ? 'Hesap oluşturuluyor…' : 'Kayıt ol'}
          </button>
        </form>

        <p style={{ textAlign: 'center', color: 'rgba(255,255,255,0.38)', fontSize: 13 }}>
          Zaten hesabın var mı?{' '}
          <a href="/auth/signin" style={{ color: '#60a5fa', textDecoration: 'none', fontWeight: 500 }}>Giriş yap</a>
        </p>

        <p style={{ textAlign: 'center', color: 'rgba(255,255,255,0.22)', fontSize: 11, marginTop: 16, lineHeight: 1.6 }}>
          Kayıt olarak Link&apos;in{' '}
          <span style={{ color: 'rgba(255,255,255,0.45)', cursor: 'pointer' }}>Kullanım Şartları</span>
          {' '}&amp;{' '}
          <span style={{ color: 'rgba(255,255,255,0.45)', cursor: 'pointer' }}>Gizlilik Politikası</span>&apos;nı kabul etmiş olursunuz.
        </p>
      </div>
    </main>
  );
}

export default function RegisterPage() {
  return (
    <Suspense>
      <RegisterContent />
    </Suspense>
  );
}
