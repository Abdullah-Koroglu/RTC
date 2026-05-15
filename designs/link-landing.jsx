
const { useState } = React;

/* ── Brand icons ─────────────────────────────────────────── */
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

/* ── Social button ───────────────────────────────────────── */
function SocialBtn({ icon, label, onClick, gradient }) {
  const [hov, setHov] = useState(false);
  return (
    <button
      onClick={onClick}
      onMouseEnter={() => setHov(true)}
      onMouseLeave={() => setHov(false)}
      style={{
        width: '100%', padding: '13px 16px',
        background: gradient
          ? 'linear-gradient(90deg,#f09433,#e6683c,#dc2743,#cc2366,#bc1888)'
          : (hov ? 'rgba(255,255,255,0.1)' : 'rgba(255,255,255,0.06)'),
        border: '1px solid rgba(255,255,255,0.1)',
        borderRadius: 11,
        display: 'flex', alignItems: 'center', gap: 12,
        cursor: 'pointer',
        transition: 'background 0.15s, transform 0.1s',
        transform: hov ? 'translateY(-1px)' : 'none',
        fontFamily: 'Inter, sans-serif',
      }}
    >
      <span style={{ flexShrink: 0, width: 20, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        {icon}
      </span>
      <span style={{ color: 'rgba(255,255,255,0.88)', fontSize: 13, fontWeight: 500, flex: 1, textAlign: 'center' }}>
        {label}
      </span>
    </button>
  );
}

/* ── Landing Page ────────────────────────────────────────── */
function LandingPage({ onStartMeeting, onJoinWithCode }) {
  const [showCode, setShowCode] = useState(false);
  const [code, setCode] = useState('');

  return (
    <div style={{
      minHeight: '100vh', background: '#0a0c14',
      display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
      fontFamily: 'Inter, sans-serif', padding: '24px', position: 'relative', overflow: 'hidden',
    }}>
      {/* Background glow */}
      <div style={{ position: 'absolute', inset: 0, pointerEvents: 'none',
        background: 'radial-gradient(ellipse 80% 60% at 50% 5%, rgba(59,130,246,0.13) 0%, transparent 70%)' }} />
      {/* Grid */}
      <div style={{ position: 'absolute', inset: 0, pointerEvents: 'none', opacity: 0.022,
        backgroundImage: 'linear-gradient(rgba(255,255,255,1) 1px,transparent 1px),linear-gradient(90deg,rgba(255,255,255,1) 1px,transparent 1px)',
        backgroundSize: '56px 56px' }} />

      {/* Nav */}
      <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 60,
        display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0 32px',
        borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <img src="logo-only.png" width="30" height="30" alt="Link" style={{ objectFit: 'contain' }} />
          <span style={{ color: 'white', fontWeight: 700, fontSize: 17, letterSpacing: '-0.02em' }}>Link</span>
        </div>
        <div style={{ display: 'flex', gap: 10 }}>
          <NavBtn label="Log in" onClick={onStartMeeting} outline />
          <NavBtn label="Sign up" onClick={onStartMeeting} />
        </div>
      </div>

      {/* Hero */}
      <div style={{ textAlign: 'center', zIndex: 1, maxWidth: 560 }} className="screen-enter">
        <div style={{ marginBottom: 28, position: 'relative', display: 'inline-block' }}>
          <div style={{ position: 'absolute', inset: -20, borderRadius: '50%',
            background: 'radial-gradient(circle, rgba(59,130,246,0.18) 0%, transparent 70%)',
            pointerEvents: 'none' }} />
          <img src="logo-only.png" width="96" height="96" alt="Link" style={{ objectFit: 'contain', position: 'relative', zIndex: 1 }} />
        </div>

        <div style={{ marginBottom: 10, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}>
          <span style={{ color: 'white', fontSize: 52, fontWeight: 800, letterSpacing: '-0.04em', lineHeight: 1 }}>Link</span>
        </div>

        <p style={{ color: 'rgba(255,255,255,0.48)', fontSize: 20, fontWeight: 400, letterSpacing: '-0.01em', marginBottom: 40, lineHeight: 1.4 }}>
          Crystal clear conversations.
        </p>

        {/* CTAs */}
        <div style={{ display: 'flex', gap: 12, justifyContent: 'center', flexWrap: 'wrap' }}>
          <HeroBtn primary onClick={onStartMeeting} label="Start a meeting" />
          <HeroBtn onClick={() => setShowCode(v => !v)} label={showCode ? 'Cancel' : 'Join with code'} />
        </div>

        {/* Inline code input */}
        {showCode && (
          <div style={{
            marginTop: 20, display: 'flex', gap: 10, maxWidth: 380, margin: '20px auto 0',
            animation: 'fadeUp 0.2s ease both',
          }}>
            <input
              placeholder="Enter room code (e.g. room-k9p2m)"
              value={code}
              onChange={e => setCode(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter' && code.trim()) onJoinWithCode(code.trim()); }}
              autoFocus
              style={{
                flex: 1, background: 'rgba(255,255,255,0.06)',
                border: '1px solid rgba(255,255,255,0.15)',
                borderRadius: 11, padding: '13px 14px',
                color: 'white', fontSize: 14, outline: 'none',
                fontFamily: 'Inter, sans-serif',
              }}
              onFocus={e => e.target.style.borderColor = 'rgba(59,130,246,0.6)'}
              onBlur={e => e.target.style.borderColor = 'rgba(255,255,255,0.15)'}
            />
            <button
              onClick={() => code.trim() && onJoinWithCode(code.trim())}
              style={{
                padding: '0 20px', background: '#3B82F6', border: 'none',
                borderRadius: 11, color: 'white', fontWeight: 600, fontSize: 14,
                cursor: 'pointer', fontFamily: 'Inter, sans-serif', whiteSpace: 'nowrap',
              }}
            >Join</button>
          </div>
        )}

        {/* Social proof */}
        <p style={{ marginTop: 44, color: 'rgba(255,255,255,0.2)', fontSize: 12 }}>
          Trusted by 50,000+ teams worldwide
        </p>
      </div>
    </div>
  );
}

function NavBtn({ label, onClick, outline }) {
  const [hov, setHov] = useState(false);
  return (
    <button onClick={onClick}
      onMouseEnter={() => setHov(true)} onMouseLeave={() => setHov(false)}
      style={{
        padding: '8px 18px', borderRadius: 8, fontFamily: 'Inter, sans-serif',
        fontSize: 13, fontWeight: 500, cursor: 'pointer',
        background: outline ? 'transparent' : (hov ? '#2563EB' : '#3B82F6'),
        border: outline ? '1px solid rgba(255,255,255,0.15)' : 'none',
        color: 'rgba(255,255,255,0.85)',
        transition: 'all 0.15s',
      }}>{label}</button>
  );
}

function HeroBtn({ label, onClick, primary }) {
  const [hov, setHov] = useState(false);
  return (
    <button onClick={onClick}
      onMouseEnter={() => setHov(true)} onMouseLeave={() => setHov(false)}
      style={{
        padding: '15px 32px', borderRadius: 13,
        fontFamily: 'Inter, sans-serif', fontSize: 15, fontWeight: 600, cursor: 'pointer',
        background: primary ? (hov ? '#2563EB' : '#3B82F6') : (hov ? 'rgba(255,255,255,0.1)' : 'rgba(255,255,255,0.07)'),
        border: primary ? 'none' : '1px solid rgba(255,255,255,0.14)',
        color: 'white',
        transition: 'all 0.15s',
        transform: hov ? 'translateY(-1px)' : 'none',
        boxShadow: primary && hov ? '0 8px 28px rgba(59,130,246,0.4)' : 'none',
      }}>{label}</button>
  );
}

/* ── Auth Screen ─────────────────────────────────────────── */
function AuthScreen({ onAuth }) {
  const [email, setEmail] = useState('');
  const [showEmail, setShowEmail] = useState(false);
  const [hov, setHov] = useState(false);

  const mock = (provider, name, mail) =>
    onAuth({ name, email: mail, provider });

  return (
    <div style={{
      minHeight: '100vh', background: '#0a0c14',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      fontFamily: 'Inter, sans-serif', padding: 24, position: 'relative', overflow: 'hidden',
    }}>
      <div style={{ position: 'absolute', inset: 0, pointerEvents: 'none',
        background: 'radial-gradient(ellipse 60% 40% at 50% 0%, rgba(59,130,246,0.1) 0%, transparent 70%)' }} />

      <div className="screen-enter" style={{
        background: 'rgba(22,27,42,0.82)', backdropFilter: 'blur(24px)',
        border: '1px solid rgba(255,255,255,0.08)', borderRadius: 22,
        padding: '36px 32px', width: '100%', maxWidth: 400,
        zIndex: 1, boxShadow: '0 32px 80px rgba(0,0,0,0.5)',
      }}>
        {/* Logo + heading */}
        <div style={{ textAlign: 'center', marginBottom: 28 }}>
          <img src="logo-only.png" width="52" height="52" alt="Link" style={{ objectFit: 'contain', marginBottom: 12 }} />
          <h2 style={{ color: 'white', fontSize: 22, fontWeight: 700, letterSpacing: '-0.02em', margin: 0 }}>
            Sign in to Link
          </h2>
          <p style={{ color: 'rgba(255,255,255,0.38)', fontSize: 13, marginTop: 6 }}>
            Choose how you'd like to continue
          </p>
        </div>

        {/* Social buttons */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 9, marginBottom: 20 }}>
          <SocialBtn icon={<GoogleIcon/>} label="Continue with Google"
            onClick={() => mock('google','Alex Chen','alex.chen@gmail.com')} />
          <SocialBtn icon={<GitHubIcon/>} label="Continue with GitHub"
            onClick={() => mock('github','dev_alex','alex@github.com')} />
          <SocialBtn icon={<InstaIcon/>} label="Continue with Instagram" gradient
            onClick={() => mock('instagram','alexchen.ig','alex@instagram.com')} />
        </div>

        {/* Divider */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 20 }}>
          <div style={{ flex: 1, height: 1, background: 'rgba(255,255,255,0.07)' }} />
          <span style={{ color: 'rgba(255,255,255,0.3)', fontSize: 12, fontWeight: 500 }}>or</span>
          <div style={{ flex: 1, height: 1, background: 'rgba(255,255,255,0.07)' }} />
        </div>

        {/* Email */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 9 }}>
          <input
            type="email"
            placeholder="Enter your email"
            value={email}
            onChange={e => setEmail(e.target.value)}
            style={{
              width: '100%', boxSizing: 'border-box',
              background: 'rgba(255,255,255,0.05)',
              border: '1px solid rgba(255,255,255,0.1)',
              borderRadius: 11, padding: '12px 13px',
              color: 'white', fontSize: 14, outline: 'none',
              fontFamily: 'Inter, sans-serif', transition: 'border-color 0.15s',
            }}
            onFocus={e => e.target.style.borderColor = 'rgba(59,130,246,0.6)'}
            onBlur={e => e.target.style.borderColor = 'rgba(255,255,255,0.1)'}
          />
          <button
            onClick={() => email.trim() && mock('email', email.split('@')[0], email)}
            onMouseEnter={() => setHov(true)} onMouseLeave={() => setHov(false)}
            style={{
              width: '100%', padding: '13px',
              background: hov ? '#2563EB' : '#3B82F6',
              border: 'none', borderRadius: 11,
              color: 'white', fontSize: 14, fontWeight: 600,
              cursor: 'pointer', fontFamily: 'Inter, sans-serif',
              transition: 'background 0.15s',
            }}
          >Continue with email</button>
        </div>

        <p style={{ textAlign: 'center', color: 'rgba(255,255,255,0.22)', fontSize: 11, marginTop: 20, lineHeight: 1.6 }}>
          By continuing you agree to Link's{' '}
          <span style={{ color: 'rgba(255,255,255,0.45)', cursor: 'pointer' }}>Terms</span>
          {' '}&amp;{' '}
          <span style={{ color: 'rgba(255,255,255,0.45)', cursor: 'pointer' }}>Privacy Policy</span>
        </p>
      </div>
    </div>
  );
}

Object.assign(window, { LandingPage, AuthScreen });
