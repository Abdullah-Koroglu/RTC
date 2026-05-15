
const { useState, useEffect, useRef } = React;
const LinkLogoMark = window.LinkLogoMark;

/* ── Mock data ───────────────────────────────────────────── */
const MOCK_PARTICIPANTS = [
  { id: 'self',  name: '',           color: '#3B82F6', isSelf: true,  remoteMuted: false },
  { id: 'p2',   name: 'Sarah Kim',   color: '#8B5CF6', isSelf: false, remoteMuted: false },
  { id: 'p3',   name: 'Marcus J.',   color: '#EC4899', isSelf: false, remoteMuted: true  },
  { id: 'p4',   name: 'Priya Patel', color: '#10B981', isSelf: false, remoteMuted: false },
  { id: 'p5',   name: 'Tom Wilson',  color: '#F59E0B', isSelf: false, remoteMuted: true  },
  { id: 'p6',   name: 'Aisha Brown', color: '#EF4444', isSelf: false, remoteMuted: false },
];

const INIT_MESSAGES = [
  { id: 1, sender: 'Sarah Kim',   text: 'Hey everyone! Can you hear me ok?',                                   time: '2:01 PM', isSelf: false },
  { id: 2, sender: 'Marcus J.',   text: 'Crystal clear. Ready to dive in.',                                   time: '2:02 PM', isSelf: false },
  { id: 3, sender: 'You',         text: "Same here — let's get started! 🎯",                                  time: '2:02 PM', isSelf: true  },
  { id: 4, sender: 'Priya Patel', text: "I'll share my screen once we get to the mockups section.",          time: '2:03 PM', isSelf: false },
];

/* ── SVG icon helpers ────────────────────────────────────── */
const sb = { fill: 'none', strokeLinecap: 'round', strokeLinejoin: 'round' };

const IcMic     = ({ s = 20, c = 'currentColor' }) => <svg width={s} height={s} viewBox="0 0 24 24" stroke={c} strokeWidth="2" {...sb}><path d="M12 2a3 3 0 0 0-3 3v7a3 3 0 0 0 6 0V5a3 3 0 0 0-3-3z"/><path d="M19 10v2a7 7 0 0 1-14 0v-2"/><line x1="12" y1="19" x2="12" y2="22"/><line x1="8" y1="22" x2="16" y2="22"/></svg>;
const IcMicOff  = ({ s = 20, c = 'currentColor' }) => <svg width={s} height={s} viewBox="0 0 24 24" stroke={c} strokeWidth="2" {...sb}><line x1="2" y1="2" x2="22" y2="22"/><path d="M18.89 13.23A7.12 7.12 0 0 0 19 12v-2"/><path d="M5 10v2a7 7 0 0 0 12 5"/><path d="M15 9.34V5a3 3 0 0 0-5.68-1.33"/><path d="M9 9v3a3 3 0 0 0 5.12 2.12"/><line x1="12" y1="19" x2="12" y2="22"/></svg>;
const IcVideo   = ({ s = 20, c = 'currentColor' }) => <svg width={s} height={s} viewBox="0 0 24 24" stroke={c} strokeWidth="2" {...sb}><path d="m22 8-6 4 6 4V8z"/><rect x="2" y="6" width="14" height="12" rx="2"/></svg>;
const IcVideoOff= ({ s = 20, c = 'currentColor' }) => <svg width={s} height={s} viewBox="0 0 24 24" stroke={c} strokeWidth="2" {...sb}><path d="M10.66 6H14a2 2 0 0 1 2 2v2.34l1 1L22 8v8"/><path d="M16 16a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h2l10 10z"/><line x1="2" y1="2" x2="22" y2="22"/></svg>;
const IcMonitor = ({ s = 20, c = 'currentColor' }) => <svg width={s} height={s} viewBox="0 0 24 24" stroke={c} strokeWidth="2" {...sb}><rect x="2" y="3" width="20" height="14" rx="2"/><line x1="8" y1="21" x2="16" y2="21"/><line x1="12" y1="17" x2="12" y2="21"/></svg>;
const IcChat    = ({ s = 20, c = 'currentColor' }) => <svg width={s} height={s} viewBox="0 0 24 24" stroke={c} strokeWidth="2" {...sb}><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>;
const IcPhoneOff= ({ s = 20, c = 'currentColor' }) => <svg width={s} height={s} viewBox="0 0 24 24" stroke={c} strokeWidth="2" {...sb}><path d="M10.68 13.31a16 16 0 0 0 3.41 2.6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7 2 2 0 0 1 1.72 2v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07A19.42 19.42 0 0 1 4.26 9.6a2 2 0 0 1 1.99-2.18h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L10.68 13.31z"/><line x1="23" y1="1" x2="1" y2="23"/></svg>;
const IcSend    = ({ s = 16, c = 'currentColor' }) => <svg width={s} height={s} viewBox="0 0 24 24" stroke={c} strokeWidth="2" {...sb}><line x1="22" y1="2" x2="11" y2="13"/><polygon points="22 2 15 22 11 13 2 9 22 2" fill={c} stroke="none"/></svg>;
const IcX       = ({ s = 14, c = 'currentColor' }) => <svg width={s} height={s} viewBox="0 0 24 24" stroke={c} strokeWidth="2" {...sb}><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>;
const IcUsers   = ({ s = 15, c = 'currentColor' }) => <svg width={s} height={s} viewBox="0 0 24 24" stroke={c} strokeWidth="2" {...sb}><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>;

/* ── Control button ──────────────────────────────────────── */
function CtrlBtn({ onClick, icon, label, danger, forceRed, lit, badge, accent = '#3B82F6' }) {
  const [hov, setHov] = useState(false);
  let bg, ic;
  if (forceRed) { bg = hov ? '#DC2626' : '#EF4444'; ic = 'white'; }
  else if (danger) { bg = hov ? 'rgba(239,68,68,0.22)' : 'rgba(239,68,68,0.13)'; ic = '#F87171'; }
  else if (lit) { bg = hov ? `${accent}2a` : `${accent}18`; ic = accent; }
  else { bg = hov ? 'rgba(255,255,255,0.12)' : 'rgba(255,255,255,0.07)'; ic = 'rgba(255,255,255,0.82)'; }

  return (
    <button
      onClick={onClick}
      onMouseEnter={() => setHov(true)}
      onMouseLeave={() => setHov(false)}
      style={{
        position: 'relative',
        background: bg,
        border: `1px solid ${lit ? `${accent}30` : 'rgba(255,255,255,0.07)'}`,
        borderRadius: label ? 12 : '50%',
        padding: label ? '10px 16px' : 0,
        minWidth: label ? 'auto' : 50,
        width: label ? 'auto' : 50,
        height: 50,
        display: 'flex', flexDirection: 'column',
        alignItems: 'center', justifyContent: 'center', gap: 4,
        cursor: 'pointer', color: ic,
        transition: 'background 0.15s, transform 0.1s, box-shadow 0.15s',
        transform: hov ? 'translateY(-1px)' : 'none',
        boxShadow: forceRed && hov ? '0 6px 20px rgba(239,68,68,0.35)' : 'none',
        fontFamily: 'Inter, sans-serif',
      }}
    >
      {icon}
      {label && (
        <span style={{ fontSize: 10, fontWeight: 500, color: ic, letterSpacing: '0.01em', whiteSpace: 'nowrap' }}>
          {label}
        </span>
      )}
      {badge > 0 && (
        <span style={{
          position: 'absolute', top: -4, right: -4,
          minWidth: 18, height: 18, borderRadius: 9,
          background: '#EF4444', display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: 10, fontWeight: 700, color: 'white', padding: '0 4px',
        }}>{badge}</span>
      )}
    </button>
  );
}

/* ── Video tile ──────────────────────────────────────────── */
function VideoTile({ p, muted, videoOff, glow, accent = '#3B82F6' }) {
  const initials = p.name.split(' ').filter(Boolean).map(n => n[0]).join('').toUpperCase().slice(0, 2) || '??';
  return (
    <div style={{
      background: '#141820',
      borderRadius: 14,
      overflow: 'hidden',
      position: 'relative',
      width: '100%', height: '100%',
      border: glow ? `2px solid ${accent}` : '2px solid rgba(255,255,255,0.04)',
      boxShadow: glow ? `0 0 0 4px ${accent}20, inset 0 0 40px ${accent}08` : 'none',
      transition: 'border-color 0.2s, box-shadow 0.2s',
    }}>
      {/* Simulated video */}
      <div style={{
        width: '100%', height: '100%',
        background: videoOff
          ? '#0c0e14'
          : `radial-gradient(ellipse 90% 80% at 50% 25%, ${p.color}14, #090b12)`,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
      }}>
        <div style={{
          width: 72, height: 72, borderRadius: '50%',
          background: videoOff
            ? 'rgba(255,255,255,0.05)'
            : `linear-gradient(140deg, ${p.color}ee, ${p.color}77)`,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: 24, fontWeight: 700, color: videoOff ? 'rgba(255,255,255,0.18)' : 'white',
          fontFamily: 'Inter, sans-serif', letterSpacing: '-0.02em',
          flexShrink: 0,
          boxShadow: !videoOff ? `0 0 30px ${p.color}33` : 'none',
        }}>{initials}</div>
      </div>

      {/* Name + mute chip */}
      <div style={{
        position: 'absolute', bottom: 10, left: 10,
        display: 'flex', alignItems: 'center', gap: 5,
      }}>
        <span style={{
          background: 'rgba(0,0,0,0.58)', backdropFilter: 'blur(10px)',
          padding: '3px 9px', borderRadius: 7,
          fontSize: 12, color: 'rgba(255,255,255,0.9)', fontWeight: 500,
          fontFamily: 'Inter, sans-serif', whiteSpace: 'nowrap',
          border: '1px solid rgba(255,255,255,0.06)',
        }}>{p.isSelf ? `${p.name} (You)` : p.name}</span>
        {muted && (
          <span style={{
            width: 24, height: 24, borderRadius: '50%',
            background: 'rgba(239,68,68,0.78)', backdropFilter: 'blur(8px)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            <IcMicOff s={11} c="white" />
          </span>
        )}
      </div>

      {/* Video-off overlay */}
      {videoOff && (
        <div style={{
          position: 'absolute', top: 10, right: 10,
          width: 26, height: 26, borderRadius: '50%',
          background: 'rgba(239,68,68,0.7)', backdropFilter: 'blur(8px)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}>
          <IcVideoOff s={12} c="white" />
        </div>
      )}
    </div>
  );
}

/* ── Video grid ──────────────────────────────────────────── */
function VideoGrid({ participants, localMuted, localVideoOff, isMobile, chatOpen, accent }) {
  const count = participants.length;
  const cols = isMobile ? 1 : count <= 1 ? 1 : count <= 2 ? 2 : count <= 4 ? 2 : 3;
  const rows = Math.ceil(count / cols);

  if (count === 1 && !isMobile) {
    return (
      <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24 }}>
        <div style={{ width: '100%', maxWidth: 820, aspectRatio: '16/9' }}>
          <VideoTile p={participants[0]} muted={localMuted} videoOff={localVideoOff} glow accent={accent} />
        </div>
      </div>
    );
  }

  return (
    <div style={{
      flex: 1, display: 'grid',
      gridTemplateColumns: `repeat(${cols}, 1fr)`,
      gridTemplateRows: `repeat(${rows}, 1fr)`,
      gap: 10, padding: isMobile ? '8px' : '12px',
      minHeight: 0,
    }}>
      {participants.map(p => (
        <VideoTile
          key={p.id}
          p={p}
          muted={p.isSelf ? localMuted : p.remoteMuted}
          videoOff={p.isSelf ? localVideoOff : false}
          glow={p.isSelf}
          accent={accent}
        />
      ))}
    </div>
  );
}

/* ── Chat panel ──────────────────────────────────────────── */
function ChatPanel({ open, messages, onClose, onSend, isMobile, accent }) {
  const [input, setInput] = useState('');
  const listRef = useRef(null);

  useEffect(() => {
    if (open && listRef.current) {
      listRef.current.scrollTop = listRef.current.scrollHeight;
    }
  }, [open, messages.length]);

  const send = () => {
    const t = input.trim();
    if (!t) return;
    onSend(t);
    setInput('');
  };

  return (
    <div style={{
      position: 'fixed', top: 0, right: 0, bottom: 0,
      width: isMobile ? '100%' : 320,
      background: 'rgba(11,13,20,0.95)', backdropFilter: 'blur(28px)',
      borderLeft: isMobile ? 'none' : '1px solid rgba(255,255,255,0.07)',
      display: 'flex', flexDirection: 'column',
      zIndex: 200,
      transform: open ? 'translateX(0)' : 'translateX(100%)',
      transition: 'transform 0.26s cubic-bezier(0.4,0,0.2,1)',
      fontFamily: 'Inter, sans-serif',
    }}>
      {/* Header */}
      <div style={{
        padding: '18px 18px 16px',
        borderBottom: '1px solid rgba(255,255,255,0.07)',
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        flexShrink: 0,
      }}>
        <span style={{ color: 'white', fontSize: 14, fontWeight: 600, letterSpacing: '-0.01em' }}>In-call chat</span>
        <button
          onClick={onClose}
          style={{
            background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.08)',
            borderRadius: 8, width: 30, height: 30,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            cursor: 'pointer', color: 'rgba(255,255,255,0.55)',
            transition: 'background 0.15s',
          }}
          onMouseEnter={e => e.currentTarget.style.background = 'rgba(255,255,255,0.1)'}
          onMouseLeave={e => e.currentTarget.style.background = 'rgba(255,255,255,0.06)'}
        >
          <IcX />
        </button>
      </div>

      {/* Messages */}
      <div ref={listRef} style={{
        flex: 1, overflowY: 'auto', padding: '14px 14px 0',
        display: 'flex', flexDirection: 'column', gap: 14,
        paddingBottom: 100,
      }}>
        {messages.map(msg => (
          <div key={msg.id} style={{
            display: 'flex', flexDirection: 'column',
            alignItems: msg.isSelf ? 'flex-end' : 'flex-start',
          }}>
            {!msg.isSelf && (
              <span style={{ color: 'rgba(255,255,255,0.38)', fontSize: 11, marginBottom: 3, paddingLeft: 3 }}>
                {msg.sender}
              </span>
            )}
            <div style={{
              background: msg.isSelf ? accent : 'rgba(255,255,255,0.07)',
              color: 'rgba(255,255,255,0.92)',
              borderRadius: msg.isSelf ? '14px 14px 3px 14px' : '14px 14px 14px 3px',
              padding: '9px 12px',
              maxWidth: '82%',
              fontSize: 13, lineHeight: 1.55,
              border: msg.isSelf ? 'none' : '1px solid rgba(255,255,255,0.07)',
              boxShadow: msg.isSelf ? `0 4px 16px ${accent}30` : 'none',
            }}>{msg.text}</div>
            <span style={{ color: 'rgba(255,255,255,0.22)', fontSize: 10, marginTop: 3 }}>
              {msg.time}
            </span>
          </div>
        ))}
      </div>

      {/* Input */}
      <div style={{
        padding: '12px 14px',
        borderTop: '1px solid rgba(255,255,255,0.07)',
        flexShrink: 0,
        display: 'flex', gap: 8, alignItems: 'center',
        position: 'absolute', bottom: 80, left: 0, right: 0,
        background: 'rgba(11,13,20,0.95)',
      }}>
        <input
          placeholder="Send a message..."
          value={input}
          onChange={e => setInput(e.target.value)}
          onKeyDown={e => { if (e.key === 'Enter') send(); }}
          style={{
            flex: 1, background: 'rgba(255,255,255,0.06)',
            border: '1px solid rgba(255,255,255,0.1)',
            borderRadius: 10, padding: '10px 12px',
            color: 'white', fontSize: 13, outline: 'none',
            fontFamily: 'Inter, sans-serif',
            transition: 'border-color 0.15s',
          }}
          onFocus={e => e.target.style.borderColor = `${accent}80`}
          onBlur={e => e.target.style.borderColor = 'rgba(255,255,255,0.1)'}
        />
        <button
          onClick={send}
          style={{
            width: 38, height: 38, borderRadius: 10,
            background: accent, border: 'none',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            cursor: 'pointer', flexShrink: 0,
            transition: 'background 0.15s, transform 0.1s',
          }}
          onMouseEnter={e => { e.currentTarget.style.background = '#2563EB'; e.currentTarget.style.transform = 'scale(1.05)'; }}
          onMouseLeave={e => { e.currentTarget.style.background = accent; e.currentTarget.style.transform = 'scale(1)'; }}
        >
          <IcSend c="white" />
        </button>
      </div>
    </div>
  );
}

/* ── Top bar ──────────────────────────────────────────────── */
function TopBar({ roomName, count, screenSharing, onLeaveEarly, accent }) {
  const [elapsed, setElapsed] = useState(0);
  useEffect(() => {
    const t = setInterval(() => setElapsed(s => s + 1), 1000);
    return () => clearInterval(t);
  }, []);
  const fmt = s => `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;

  return (
    <div style={{
      position: 'fixed', top: 0, left: 0, right: 0, height: 56,
      display: 'flex', alignItems: 'center', justifyContent: 'space-between',
      padding: '0 18px',
      background: 'rgba(10,12,18,0.88)', backdropFilter: 'blur(20px)',
      borderBottom: '1px solid rgba(255,255,255,0.06)',
      zIndex: 100, fontFamily: 'Inter, sans-serif',
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
        <LinkLogoMark size={30} />
        <span style={{ color: 'rgba(255,255,255,0.88)', fontSize: 14, fontWeight: 600, letterSpacing: '-0.01em' }}>
          {roomName}
        </span>
        {screenSharing && (
          <span style={{
            background: `${accent}18`, border: `1px solid ${accent}40`,
            color: accent, padding: '3px 9px', borderRadius: 20, fontSize: 11, fontWeight: 500,
          }}>
            ● Sharing screen
          </span>
        )}
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: 18 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <span style={{
            width: 7, height: 7, borderRadius: '50%', background: '#22C55E',
            display: 'block', boxShadow: '0 0 0 2px rgba(34,197,94,0.25)',
          }} />
          <span style={{ color: 'rgba(255,255,255,0.38)', fontSize: 12 }}>{fmt(elapsed)}</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
          <IcUsers c="rgba(255,255,255,0.38)" />
          <span style={{ color: 'rgba(255,255,255,0.38)', fontSize: 13 }}>{count}</span>
        </div>
      </div>
    </div>
  );
}

/* ── Control bar ─────────────────────────────────────────── */
function ControlBar({ micOn, camOn, screenShare, chatOpen, unread, onMic, onCam, onScreen, onChat, onLeave, isMobile, accent }) {
  const lbl = s => isMobile ? null : s;
  return (
    <div style={{
      position: 'fixed', bottom: 0, left: 0, right: 0, height: isMobile ? 72 : 82,
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      gap: isMobile ? 10 : 10,
      background: 'rgba(10,12,18,0.88)', backdropFilter: 'blur(20px)',
      borderTop: '1px solid rgba(255,255,255,0.06)',
      zIndex: 100, padding: '0 20px',
    }}>
      <CtrlBtn onClick={onMic}    icon={micOn    ? <IcMic s={20}/>     : <IcMicOff s={20}/>}    label={lbl(micOn ? 'Mute' : 'Unmute')}        danger={!micOn}    accent={accent} />
      <CtrlBtn onClick={onCam}    icon={camOn    ? <IcVideo s={20}/>   : <IcVideoOff s={20}/>}  label={lbl(camOn ? 'Stop Video' : 'Start Video')} danger={!camOn} accent={accent} />
      <CtrlBtn onClick={onScreen} icon={<IcMonitor s={20}/>}                                     label={lbl('Share')}   lit={screenShare} accent={accent} />
      <CtrlBtn onClick={onChat}   icon={<IcChat s={20}/>}                                        label={lbl('Chat')}    lit={chatOpen}    badge={unread}  accent={accent} />
      <div style={{ width: 1, height: 30, background: 'rgba(255,255,255,0.08)', margin: '0 4px' }} />
      <CtrlBtn onClick={onLeave}  icon={<IcPhoneOff s={20}/>}                                    label={lbl('Leave')}   forceRed accent={accent} />
    </div>
  );
}

/* ── Room Screen ─────────────────────────────────────────── */
function RoomScreen({ userName, onLeave, participantCount = 4, isMobile = false, accent = '#3B82F6' }) {
  const [micOn, setMicOn] = useState(true);
  const [camOn, setCamOn] = useState(true);
  const [screenShare, setScreenShare] = useState(false);
  const [chatOpen, setChatOpen] = useState(false);
  const [unread, setUnread] = useState(0);
  const [messages, setMessages] = useState(INIT_MESSAGES);

  const count = Math.max(1, Math.min(6, participantCount));
  const participants = MOCK_PARTICIPANTS.slice(0, count).map(p =>
    p.isSelf ? { ...p, name: userName || 'You' } : p
  );

  const toggleChat = () => {
    setChatOpen(v => {
      if (!v) setUnread(0);
      return !v;
    });
  };

  const sendMessage = text => {
    const time = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    setMessages(prev => [...prev, { id: Date.now(), sender: userName || 'You', text, time, isSelf: true }]);
  };

  // Simulate an incoming chat message after 9 s
  useEffect(() => {
    const t = setTimeout(() => {
      const time = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
      setMessages(prev => [...prev, {
        id: Date.now(),
        sender: 'Sarah Kim',
        text: "Ready to look at the mockups? I can share my screen.",
        time, isSelf: false,
      }]);
      setChatOpen(prev => {
        if (!prev) setUnread(u => u + 1);
        return prev;
      });
    }, 9000);
    return () => clearTimeout(t);
  }, []);

  const chatWidth = chatOpen && !isMobile ? 320 : 0;

  return (
    <div style={{
      width: '100vw', height: '100vh', background: '#0a0c14',
      display: 'flex', flexDirection: 'column',
      fontFamily: 'Inter, sans-serif', overflow: 'hidden',
    }}>
      <TopBar
        roomName="Design Sprint · Q3"
        count={count}
        screenSharing={screenShare}
        accent={accent}
      />

      {/* Grid area — padded for fixed top/bottom bars */}
      <div style={{
        flex: 1, display: 'flex',
        paddingTop: 56, paddingBottom: 82,
        transition: 'padding-right 0.26s cubic-bezier(0.4,0,0.2,1)',
        paddingRight: chatWidth,
        minHeight: 0,
        overflow: 'hidden',
      }}>
        <VideoGrid
          participants={participants}
          localMuted={!micOn}
          localVideoOff={!camOn}
          isMobile={isMobile}
          chatOpen={chatOpen}
          accent={accent}
        />
      </div>

      <ControlBar
        micOn={micOn} camOn={camOn} screenShare={screenShare}
        chatOpen={chatOpen} unread={unread}
        onMic={() => setMicOn(v => !v)}
        onCam={() => setCamOn(v => !v)}
        onScreen={() => setScreenShare(v => !v)}
        onChat={toggleChat}
        onLeave={onLeave}
        isMobile={isMobile}
        accent={accent}
      />

      <ChatPanel
        open={chatOpen}
        messages={messages}
        onClose={() => setChatOpen(false)}
        onSend={sendMessage}
        isMobile={isMobile}
        accent={accent}
      />
    </div>
  );
}

Object.assign(window, { RoomScreen });
