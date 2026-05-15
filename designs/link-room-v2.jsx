
const { useState, useEffect, useRef } = React;
const LinkLogoMark = window.LinkLogoMark;

/* ── Mock data ───────────────────────────────────────────── */
const MOCK_P = [
  { id:'self',  name:'',           color:'#3B82F6', isSelf:true,  remoteMuted:false, conn:'good'  },
  { id:'p2',   name:'Sarah Kim',   color:'#8B5CF6', isSelf:false, remoteMuted:false, conn:'good'  },
  { id:'p3',   name:'Marcus J.',   color:'#EC4899', isSelf:false, remoteMuted:true,  conn:'fair'  },
  { id:'p4',   name:'Priya Patel', color:'#10B981', isSelf:false, remoteMuted:false, conn:'good'  },
  { id:'p5',   name:'Tom Wilson',  color:'#F59E0B', isSelf:false, remoteMuted:true,  conn:'poor'  },
  { id:'p6',   name:'Aisha Brown', color:'#EF4444', isSelf:false, remoteMuted:false, conn:'good'  },
];
const INIT_MSGS = [
  { id:1, sender:'Sarah Kim',   text:"Hey everyone! Can you hear me ok?",                           time:'2:01 PM', isSelf:false },
  { id:2, sender:'Marcus J.',   text:"Crystal clear — ready to dive in.",                           time:'2:02 PM', isSelf:false },
  { id:3, sender:'You',         text:"Same here. Let's get started! 🎯",                            time:'2:02 PM', isSelf:true  },
  { id:4, sender:'Priya Patel', text:"I'll share my screen once we get to the mockups section.",    time:'2:03 PM', isSelf:false },
];

/* ── Icons ──────────────────────────────────────────────── */
const sb = { fill:'none', strokeLinecap:'round', strokeLinejoin:'round' };
const IcMic     = ({s=20,c='currentColor'}) => <svg width={s} height={s} viewBox="0 0 24 24" stroke={c} strokeWidth="2" {...sb}><path d="M12 2a3 3 0 0 0-3 3v7a3 3 0 0 0 6 0V5a3 3 0 0 0-3-3z"/><path d="M19 10v2a7 7 0 0 1-14 0v-2"/><line x1="12" y1="19" x2="12" y2="22"/><line x1="8" y1="22" x2="16" y2="22"/></svg>;
const IcMicOff  = ({s=20,c='currentColor'}) => <svg width={s} height={s} viewBox="0 0 24 24" stroke={c} strokeWidth="2" {...sb}><line x1="2" y1="2" x2="22" y2="22"/><path d="M18.89 13.23A7.12 7.12 0 0 0 19 12v-2"/><path d="M5 10v2a7 7 0 0 0 12 5"/><path d="M15 9.34V5a3 3 0 0 0-5.68-1.33"/><path d="M9 9v3a3 3 0 0 0 5.12 2.12"/><line x1="12" y1="19" x2="12" y2="22"/></svg>;
const IcVideo   = ({s=20,c='currentColor'}) => <svg width={s} height={s} viewBox="0 0 24 24" stroke={c} strokeWidth="2" {...sb}><path d="m22 8-6 4 6 4V8z"/><rect x="2" y="6" width="14" height="12" rx="2"/></svg>;
const IcVideoOff= ({s=20,c='currentColor'}) => <svg width={s} height={s} viewBox="0 0 24 24" stroke={c} strokeWidth="2" {...sb}><path d="M10.66 6H14a2 2 0 0 1 2 2v2.34l1 1L22 8v8"/><path d="M16 16a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h2l10 10z"/><line x1="2" y1="2" x2="22" y2="22"/></svg>;
const IcMonitor = ({s=20,c='currentColor'}) => <svg width={s} height={s} viewBox="0 0 24 24" stroke={c} strokeWidth="2" {...sb}><rect x="2" y="3" width="20" height="14" rx="2"/><line x1="8" y1="21" x2="16" y2="21"/><line x1="12" y1="17" x2="12" y2="21"/></svg>;
const IcChat    = ({s=20,c='currentColor'}) => <svg width={s} height={s} viewBox="0 0 24 24" stroke={c} strokeWidth="2" {...sb}><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>;
const IcPhone   = ({s=20,c='currentColor'}) => <svg width={s} height={s} viewBox="0 0 24 24" stroke={c} strokeWidth="2" {...sb}><path d="M10.68 13.31a16 16 0 0 0 3.41 2.6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7 2 2 0 0 1 1.72 2v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07A19.42 19.42 0 0 1 4.26 9.6a2 2 0 0 1 1.99-2.18h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L10.68 13.31z"/><line x1="23" y1="1" x2="1" y2="23"/></svg>;
const IcSend    = ({s=16,c='currentColor'}) => <svg width={s} height={s} viewBox="0 0 24 24" stroke={c} strokeWidth="2" {...sb}><line x1="22" y1="2" x2="11" y2="13"/><polygon points="22 2 15 22 11 13 2 9 22 2" fill={c} stroke="none"/></svg>;
const IcX       = ({s=14,c='currentColor'}) => <svg width={s} height={s} viewBox="0 0 24 24" stroke={c} strokeWidth="2" {...sb}><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>;
const IcUsers   = ({s=15,c='currentColor'}) => <svg width={s} height={s} viewBox="0 0 24 24" stroke={c} strokeWidth="2" {...sb}><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>;
const IcGear    = ({s=17,c='currentColor'}) => <svg width={s} height={s} viewBox="0 0 24 24" stroke={c} strokeWidth="2" {...sb}><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/></svg>;
const IcHelp    = ({s=17,c='currentColor'}) => <svg width={s} height={s} viewBox="0 0 24 24" stroke={c} strokeWidth="2" {...sb}><circle cx="12" cy="12" r="10"/><path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>;
const IcLink    = ({s=17,c='currentColor'}) => <svg width={s} height={s} viewBox="0 0 24 24" stroke={c} strokeWidth="2" {...sb}><path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"/><path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"/></svg>;
const IcMax     = ({s=17,c='currentColor'}) => <svg width={s} height={s} viewBox="0 0 24 24" stroke={c} strokeWidth="2" {...sb}><path d="M8 3H5a2 2 0 0 0-2 2v3m18 0V5a2 2 0 0 0-2-2h-3m0 18h3a2 2 0 0 0 2-2v-3M3 16v3a2 2 0 0 0 2 2h3"/></svg>;

/* ── Signal bars ─────────────────────────────────────────── */
function SignalBars({ quality = 'good' }) {
  const C = { good:['#22C55E','#22C55E','#22C55E'], fair:['#F59E0B','#F59E0B','rgba(255,255,255,0.15)'], poor:['#EF4444','rgba(255,255,255,0.15)','rgba(255,255,255,0.15)'] };
  const cols = C[quality] || C.good;
  return <div style={{ display:'flex', alignItems:'flex-end', gap:1.5 }}>{[8,12,16].map((h,i)=><div key={i} style={{ width:3, height:h, background:cols[i], borderRadius:1.5 }}/>)}</div>;
}

/* ── Mini toggle ─────────────────────────────────────────── */
function MiniToggle({ value, onChange, accent }) {
  return (
    <div onClick={()=>onChange(!value)} style={{ width:40, height:22, borderRadius:11, background:value?accent:'rgba(255,255,255,0.12)', cursor:'pointer', position:'relative', transition:'background 0.2s', flexShrink:0 }}>
      <div style={{ width:18, height:18, borderRadius:'50%', background:'white', position:'absolute', top:2, left:value?20:2, transition:'left 0.2s', boxShadow:'0 1px 4px rgba(0,0,0,0.3)' }}/>
    </div>
  );
}

/* ── Control button ──────────────────────────────────────── */
function CtrlBtn({ onClick, icon, label, danger, forceRed, lit, badge, accent='#3B82F6' }) {
  const [hov, setHov] = useState(false);
  let bg = forceRed ? (hov?'#DC2626':'#EF4444') : danger ? (hov?'rgba(239,68,68,0.22)':'rgba(239,68,68,0.13)') : lit ? (hov?`${accent}2a`:`${accent}18`) : (hov?'rgba(255,255,255,0.12)':'rgba(255,255,255,0.07)');
  let ic = forceRed ? 'white' : danger ? '#F87171' : lit ? accent : 'rgba(255,255,255,0.82)';
  return (
    <button onClick={onClick} onMouseEnter={()=>setHov(true)} onMouseLeave={()=>setHov(false)} style={{ position:'relative', background:bg, border:`1px solid ${lit?`${accent}30`:'rgba(255,255,255,0.07)'}`, borderRadius:label?12:'50%', padding:label?'10px 16px':0, minWidth:label?'auto':50, width:label?'auto':50, height:50, display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', gap:4, cursor:'pointer', color:ic, transition:'background 0.15s,transform 0.1s', transform:hov?'translateY(-1px)':'none', boxShadow:forceRed&&hov?'0 6px 20px rgba(239,68,68,0.35)':'none', fontFamily:'Inter,sans-serif' }}>
      {icon}
      {label && <span style={{ fontSize:10, fontWeight:500, color:ic, whiteSpace:'nowrap' }}>{label}</span>}
      {badge>0 && <span style={{ position:'absolute', top:-4, right:-4, minWidth:18, height:18, borderRadius:9, background:'#EF4444', display:'flex', alignItems:'center', justifyContent:'center', fontSize:10, fontWeight:700, color:'white', padding:'0 4px' }}>{badge}</span>}
    </button>
  );
}

/* ── Video tile ──────────────────────────────────────────── */
function VideoTile({ p, muted, videoOff, glow, isSpeaking, isPresenting, accent='#3B82F6', small }) {
  const ini = p.name.split(' ').filter(Boolean).map(n=>n[0]).join('').toUpperCase().slice(0,2)||'??';
  const sz = small ? 44 : 72;
  return (
    <div className={isSpeaking ? 'speaking-tile' : ''} style={{ background:'#141820', borderRadius:14, overflow:'hidden', position:'relative', width:'100%', height:'100%', border:glow?`2px solid ${accent}`:'2px solid rgba(255,255,255,0.04)', boxShadow:glow&&!isSpeaking?`0 0 0 4px ${accent}20`:undefined, transition:'border-color 0.2s,box-shadow 0.2s' }}>
      <div style={{ width:'100%', height:'100%', background:videoOff?'#0c0e14':`radial-gradient(ellipse 90% 80% at 50% 25%, ${p.color}14, #090b12)`, display:'flex', alignItems:'center', justifyContent:'center' }}>
        <div style={{ width:sz, height:sz, borderRadius:'50%', background:videoOff?'rgba(255,255,255,0.05)':`linear-gradient(140deg,${p.color}ee,${p.color}77)`, display:'flex', alignItems:'center', justifyContent:'center', fontSize:sz*0.33, fontWeight:700, color:videoOff?'rgba(255,255,255,0.18)':'white', fontFamily:'Inter,sans-serif', letterSpacing:'-0.02em', flexShrink:0, boxShadow:!videoOff?`0 0 30px ${p.color}33`:undefined }}>{ini}</div>
      </div>
      {/* Name label */}
      <div style={{ position:'absolute', bottom:8, left:8, display:'flex', alignItems:'center', gap:5 }}>
        <span style={{ background:'rgba(0,0,0,0.58)', backdropFilter:'blur(10px)', padding:'3px 9px', borderRadius:7, fontSize:12, color:'rgba(255,255,255,0.9)', fontWeight:500, fontFamily:'Inter,sans-serif', whiteSpace:'nowrap', border:'1px solid rgba(255,255,255,0.06)' }}>{p.isSelf?`${p.name} (You)`:p.name}</span>
        {muted && <span style={{ width:22, height:22, borderRadius:'50%', background:'rgba(239,68,68,0.78)', backdropFilter:'blur(8px)', display:'flex', alignItems:'center', justifyContent:'center' }}><IcMicOff s={10} c="white"/></span>}
      </div>
      {/* Presenting badge */}
      {isPresenting && <div style={{ position:'absolute', top:8, left:8, background:`${accent}dd`, backdropFilter:'blur(8px)', borderRadius:6, padding:'3px 9px', fontSize:11, color:'white', fontWeight:600 }}>● Presenting</div>}
      {/* Signal bars */}
      {!small && <div style={{ position:'absolute', top:8, right:8 }}><SignalBars quality={p.conn}/></div>}
      {/* Video-off badge */}
      {videoOff && <div style={{ position:'absolute', top:8, right:small?8:36, width:24, height:24, borderRadius:'50%', background:'rgba(239,68,68,0.7)', backdropFilter:'blur(8px)', display:'flex', alignItems:'center', justifyContent:'center' }}><IcVideoOff s={11} c="white"/></div>}
    </div>
  );
}

/* ── Screen share view ───────────────────────────────────── */
function ScreenShareView({ participants, localMuted, localVideoOff, accent }) {
  return (
    <div style={{ flex:1, display:'flex', gap:8, padding:'10px 10px 10px 10px', minHeight:0 }}>
      {/* Main shared screen */}
      <div style={{ flex:4, background:'#141820', borderRadius:14, position:'relative', display:'flex', alignItems:'center', justifyContent:'center', border:`1.5px solid ${accent}40`, overflow:'hidden', minWidth:0 }}>
        <div style={{ position:'absolute', inset:0, opacity:0.04, backgroundImage:'linear-gradient(rgba(255,255,255,0.6) 1px,transparent 1px),linear-gradient(90deg,rgba(255,255,255,0.6) 1px,transparent 1px)', backgroundSize:'28px 28px' }}/>
        <div style={{ textAlign:'center', zIndex:1, display:'flex', flexDirection:'column', alignItems:'center', gap:10 }}>
          <div style={{ width:60, height:60, borderRadius:14, background:`${accent}18`, border:`1px solid ${accent}30`, display:'flex', alignItems:'center', justifyContent:'center' }}><IcMonitor s={28} c={accent}/></div>
          <div style={{ color:'rgba(255,255,255,0.7)', fontSize:15, fontWeight:500, fontFamily:'Inter,sans-serif' }}>You are sharing your screen</div>
          <div style={{ color:'rgba(255,255,255,0.35)', fontSize:12, fontFamily:'Inter,sans-serif' }}>Visible to all participants</div>
        </div>
        <div style={{ position:'absolute', top:10, left:10, background:`${accent}20`, border:`1px solid ${accent}40`, borderRadius:20, padding:'4px 10px', fontSize:11, color:accent, fontWeight:500, fontFamily:'Inter,sans-serif' }}>● Sharing screen</div>
        <button style={{ position:'absolute', top:10, right:10, background:'rgba(255,255,255,0.08)', border:'1px solid rgba(255,255,255,0.12)', borderRadius:8, width:32, height:32, display:'flex', alignItems:'center', justifyContent:'center', cursor:'pointer', color:'rgba(255,255,255,0.7)' }}>
          <IcMax s={15}/>
        </button>
      </div>
      {/* Participant strip */}
      <div style={{ width:176, display:'flex', flexDirection:'column', gap:8, overflowY:'auto', flexShrink:0 }}>
        {participants.map(p => (
          <div key={p.id} style={{ aspectRatio:'16/9', flexShrink:0, borderRadius:10, overflow:'hidden' }}>
            <VideoTile p={p} muted={p.isSelf?localMuted:p.remoteMuted} videoOff={p.isSelf?localVideoOff:false} glow={p.isSelf} isPresenting={p.isSelf} accent={accent} small/>
          </div>
        ))}
      </div>
    </div>
  );
}

/* ── Waiting room ────────────────────────────────────────── */
function WaitingRoom({ roomId, accent, localMuted, localVideoOff, selfP }) {
  const [copied, setCopied] = useState(false);
  const link = `link.app/${roomId}`;
  const copy = () => { try { navigator.clipboard.writeText(link); } catch(e){} setCopied(true); setTimeout(()=>setCopied(false),2000); };
  return (
    <div style={{ flex:1, display:'flex', alignItems:'center', justifyContent:'center', position:'relative' }}>
      <div style={{ textAlign:'center', display:'flex', flexDirection:'column', alignItems:'center', gap:20 }}>
        <div style={{ position:'relative', marginBottom:8 }}>
          <div style={{ position:'absolute', inset:-24, borderRadius:'50%', border:`2px solid ${accent}30`, animation:'pulseRing 2.2s ease-out infinite' }}/>
          <div style={{ position:'absolute', inset:-10, borderRadius:'50%', border:`2px solid ${accent}18`, animation:'pulseRing 2.2s ease-out 0.6s infinite' }}/>
          <img src="logo-only.png" width="76" height="76" alt="Link" style={{ objectFit:'contain', position:'relative', zIndex:1 }}/>
        </div>
        <div>
          <h3 style={{ color:'white', fontSize:21, fontWeight:600, letterSpacing:'-0.02em', margin:'0 0 8px', fontFamily:'Inter,sans-serif' }}>Waiting for others to join…</h3>
          <p style={{ color:'rgba(255,255,255,0.38)', fontSize:14, fontFamily:'Inter,sans-serif' }}>Share the link below to invite people</p>
        </div>
        <div style={{ background:'rgba(22,27,42,0.8)', backdropFilter:'blur(16px)', border:'1px solid rgba(255,255,255,0.08)', borderRadius:14, padding:'14px 18px', display:'flex', alignItems:'center', gap:14 }}>
          <IcLink s={15} c="rgba(255,255,255,0.4)"/>
          <span style={{ color:'rgba(255,255,255,0.55)', fontSize:13, fontFamily:'Inter,sans-serif' }}>{link}</span>
          <button onClick={copy} style={{ background:copied?'rgba(34,197,94,0.15)':(`${accent}18`), border:`1px solid ${copied?'rgba(34,197,94,0.3)':`${accent}30`}`, borderRadius:8, padding:'7px 14px', color:copied?'#22C55E':accent, fontSize:12, fontWeight:600, cursor:'pointer', fontFamily:'Inter,sans-serif', transition:'all 0.2s', whiteSpace:'nowrap' }}>
            {copied ? '✓ Copied!' : 'Copy link'}
          </button>
        </div>
      </div>
      {/* Self PiP preview */}
      {selfP && <div style={{ position:'absolute', bottom:16, right:16, width:180, aspectRatio:'16/9', borderRadius:10, overflow:'hidden', border:`2px solid ${accent}50`, boxShadow:`0 0 0 3px ${accent}20` }}>
        <VideoTile p={selfP} muted={localMuted} videoOff={localVideoOff} glow accent={accent}/>
      </div>}
    </div>
  );
}

/* ── Video grid ──────────────────────────────────────────── */
function VideoGrid({ participants, localMuted, localVideoOff, isMobile, screenShare, activeSpeaker, accent }) {
  const count = participants.length;
  if (screenShare) return <ScreenShareView participants={participants} localMuted={localMuted} localVideoOff={localVideoOff} accent={accent}/>;
  const cols = isMobile ? 1 : count<=1?1 : count<=2?2 : count<=4?2 : 3;
  const rows = Math.ceil(count / cols);
  if (count === 1 && !isMobile) {
    return (
      <div style={{ flex:1, display:'flex', alignItems:'center', justifyContent:'center', padding:24 }}>
        <div style={{ width:'100%', maxWidth:820, aspectRatio:'16/9' }}>
          <VideoTile p={participants[0]} muted={localMuted} videoOff={localVideoOff} glow isSpeaking={false} accent={accent}/>
        </div>
      </div>
    );
  }
  return (
    <div style={{ flex:1, display:'grid', gridTemplateColumns:`repeat(${cols},1fr)`, gridTemplateRows:`repeat(${rows},1fr)`, gap:10, padding:isMobile?'8px':'12px', minHeight:0 }}>
      {participants.map(p => (
        <VideoTile key={p.id} p={p} muted={p.isSelf?localMuted:p.remoteMuted} videoOff={p.isSelf?localVideoOff:false} glow={p.isSelf} isSpeaking={p.id===activeSpeaker} isPresenting={p.isSelf&&screenShare} accent={accent} small={count>=6}/>
      ))}
    </div>
  );
}

/* ── Chat panel ──────────────────────────────────────────── */
function ChatPanel({ open, messages, onClose, onSend, isMobile, accent }) {
  const [inp, setInp] = useState('');
  const listRef = useRef(null);
  useEffect(() => { if (open && listRef.current) listRef.current.scrollTop = listRef.current.scrollHeight; }, [open, messages.length]);
  const send = () => { const t=inp.trim(); if(!t) return; onSend(t); setInp(''); };
  return (
    <div style={{ position:'fixed', top:0, right:0, bottom:0, width:isMobile?'100%':320, background:'rgba(11,13,20,0.95)', backdropFilter:'blur(28px)', borderLeft:isMobile?'none':'1px solid rgba(255,255,255,0.07)', display:'flex', flexDirection:'column', zIndex:200, transform:open?'translateX(0)':'translateX(100%)', transition:'transform 0.26s cubic-bezier(0.4,0,0.2,1)', fontFamily:'Inter,sans-serif' }}>
      <div style={{ padding:'18px 18px 16px', borderBottom:'1px solid rgba(255,255,255,0.07)', display:'flex', alignItems:'center', justifyContent:'space-between', flexShrink:0 }}>
        <span style={{ color:'white', fontSize:14, fontWeight:600 }}>In-call chat</span>
        <button onClick={onClose} style={{ background:'rgba(255,255,255,0.06)', border:'1px solid rgba(255,255,255,0.08)', borderRadius:8, width:30, height:30, display:'flex', alignItems:'center', justifyContent:'center', cursor:'pointer', color:'rgba(255,255,255,0.55)', transition:'background 0.15s' }} onMouseEnter={e=>e.currentTarget.style.background='rgba(255,255,255,0.1)'} onMouseLeave={e=>e.currentTarget.style.background='rgba(255,255,255,0.06)'}><IcX/></button>
      </div>
      <div ref={listRef} style={{ flex:1, overflowY:'auto', padding:'14px 14px 100px', display:'flex', flexDirection:'column', gap:14 }}>
        {messages.map(msg => (
          <div key={msg.id} style={{ display:'flex', flexDirection:'column', alignItems:msg.isSelf?'flex-end':'flex-start' }}>
            {!msg.isSelf && <span style={{ color:'rgba(255,255,255,0.38)', fontSize:11, marginBottom:3, paddingLeft:3 }}>{msg.sender}</span>}
            <div style={{ background:msg.isSelf?accent:'rgba(255,255,255,0.07)', color:'rgba(255,255,255,0.92)', borderRadius:msg.isSelf?'14px 14px 3px 14px':'14px 14px 14px 3px', padding:'9px 12px', maxWidth:'82%', fontSize:13, lineHeight:1.55, border:msg.isSelf?'none':'1px solid rgba(255,255,255,0.07)', boxShadow:msg.isSelf?`0 4px 16px ${accent}30`:undefined }}>{msg.text}</div>
            <span style={{ color:'rgba(255,255,255,0.22)', fontSize:10, marginTop:3 }}>{msg.time}</span>
          </div>
        ))}
      </div>
      <div style={{ padding:'12px 14px', borderTop:'1px solid rgba(255,255,255,0.07)', flexShrink:0, display:'flex', gap:8, alignItems:'center', position:'absolute', bottom:82, left:0, right:0, background:'rgba(11,13,20,0.95)' }}>
        <input placeholder="Message…" value={inp} onChange={e=>setInp(e.target.value)} onKeyDown={e=>{ if(e.key==='Enter') send(); }} style={{ flex:1, background:'rgba(255,255,255,0.06)', border:'1px solid rgba(255,255,255,0.1)', borderRadius:10, padding:'10px 12px', color:'white', fontSize:13, outline:'none', fontFamily:'Inter,sans-serif', transition:'border-color 0.15s' }} onFocus={e=>e.target.style.borderColor=`${accent}80`} onBlur={e=>e.target.style.borderColor='rgba(255,255,255,0.1)'}/>
        <button onClick={send} style={{ width:38, height:38, borderRadius:10, background:accent, border:'none', display:'flex', alignItems:'center', justifyContent:'center', cursor:'pointer', flexShrink:0, transition:'background 0.15s' }} onMouseEnter={e=>e.currentTarget.style.background='#2563EB'} onMouseLeave={e=>e.currentTarget.style.background=accent}><IcSend c="white"/></button>
      </div>
    </div>
  );
}

/* ── Top bar ─────────────────────────────────────────────── */
function TopBar({ roomName, count, screenSharing, onSettings, onShortcuts, onProfile, userName, userPhoto, accent }) {
  const [elapsed, setElapsed] = useState(0);
  useEffect(() => { const t=setInterval(()=>setElapsed(s=>s+1),1000); return()=>clearInterval(t); }, []);
  const fmt = s => `${Math.floor(s/60)}:${String(s%60).padStart(2,'0')}`;
  return (
    <div style={{ position:'fixed', top:0, left:0, right:0, height:56, display:'flex', alignItems:'center', justifyContent:'space-between', padding:'0 16px', background:'rgba(10,12,18,0.9)', backdropFilter:'blur(20px)', borderBottom:'1px solid rgba(255,255,255,0.06)', zIndex:100, fontFamily:'Inter,sans-serif' }}>
      <div style={{ display:'flex', alignItems:'center', gap:10 }}>
        <LinkLogoMark size={28}/>
        <span style={{ color:'rgba(255,255,255,0.88)', fontSize:14, fontWeight:600, letterSpacing:'-0.01em' }}>{roomName}</span>
        {screenSharing && <span style={{ background:`${accent}18`, border:`1px solid ${accent}40`, color:accent, padding:'3px 9px', borderRadius:20, fontSize:11, fontWeight:500 }}>● Sharing screen</span>}
      </div>
      <div style={{ display:'flex', alignItems:'center', gap:12 }}>
        <div style={{ display:'flex', alignItems:'center', gap:6 }}>
          <span style={{ width:7, height:7, borderRadius:'50%', background:'#22C55E', display:'block', boxShadow:'0 0 0 2px rgba(34,197,94,0.25)' }}/>
          <span style={{ color:'rgba(255,255,255,0.38)', fontSize:12 }}>{fmt(elapsed)}</span>
        </div>
        <div style={{ display:'flex', alignItems:'center', gap:5 }}>
          <IcUsers c="rgba(255,255,255,0.38)"/>
          <span style={{ color:'rgba(255,255,255,0.38)', fontSize:13 }}>{count}</span>
        </div>
        <div style={{ width:1, height:20, background:'rgba(255,255,255,0.08)' }}/>
        <TopBarBtn onClick={onSettings}  icon={<IcGear/>}/>
        <TopBarBtn onClick={onShortcuts} icon={<IcHelp/>}/>
        <div style={{ width:1, height:20, background:'rgba(255,255,255,0.08)' }}/>
        <ProfileAvatar name={userName} photo={userPhoto} accent={accent} onClick={onProfile}/>
      </div>
    </div>
  );
}
function TopBarBtn({ onClick, icon }) {
  const [h,setH]=useState(false);
  return <button onClick={onClick} onMouseEnter={()=>setH(true)} onMouseLeave={()=>setH(false)} style={{ width:32, height:32, borderRadius:8, background:h?'rgba(255,255,255,0.1)':'transparent', border:'1px solid transparent', display:'flex', alignItems:'center', justifyContent:'center', cursor:'pointer', color:'rgba(255,255,255,0.5)', transition:'all 0.15s' }}>{icon}</button>;
}

/* ── Control bar ─────────────────────────────────────────── */
function ControlBar({ micOn, camOn, screenShare, chatOpen, unread, onMic, onCam, onScreen, onChat, onLeave, isMobile, accent }) {
  const L = s => isMobile ? null : s;
  return (
    <div style={{ position:'fixed', bottom:0, left:0, right:0, height:isMobile?72:82, display:'flex', alignItems:'center', justifyContent:'center', gap:10, background:'rgba(10,12,18,0.9)', backdropFilter:'blur(20px)', borderTop:'1px solid rgba(255,255,255,0.06)', zIndex:100, padding:'0 20px' }}>
      <CtrlBtn onClick={onMic}    icon={micOn?<IcMic s={20}/>:<IcMicOff s={20}/>}    label={L(micOn?'Mute':'Unmute')}         danger={!micOn}    accent={accent}/>
      <CtrlBtn onClick={onCam}    icon={camOn?<IcVideo s={20}/>:<IcVideoOff s={20}/>} label={L(camOn?'Stop Video':'Start Video')} danger={!camOn}    accent={accent}/>
      <CtrlBtn onClick={onScreen} icon={<IcMonitor s={20}/>}                           label={L('Share')}   lit={screenShare}  accent={accent}/>
      <CtrlBtn onClick={onChat}   icon={<IcChat s={20}/>}                              label={L('Chat')}    lit={chatOpen}     badge={unread} accent={accent}/>
      <div style={{ width:1, height:30, background:'rgba(255,255,255,0.08)', margin:'0 4px' }}/>
      <CtrlBtn onClick={onLeave} icon={<IcPhone s={20}/>} label={L('Leave')} forceRed accent={accent}/>
    </div>
  );
}

/* ── Settings modal ──────────────────────────────────────── */
function SettingsModal({ onClose, accent }) {
  const [blur,setBlur]=useState(false);
  const [noise,setNoise]=useState(true);
  return (
    <div style={{ position:'fixed', inset:0, background:'rgba(0,0,0,0.65)', backdropFilter:'blur(4px)', zIndex:500, display:'flex', alignItems:'center', justifyContent:'center', padding:20 }} onClick={onClose}>
      <div onClick={e=>e.stopPropagation()} className="screen-enter" style={{ background:'rgba(18,22,34,0.98)', border:'1px solid rgba(255,255,255,0.1)', borderRadius:20, width:'100%', maxWidth:440, boxShadow:'0 32px 80px rgba(0,0,0,0.6)', fontFamily:'Inter,sans-serif', overflow:'hidden' }}>
        <div style={{ padding:'18px 20px', borderBottom:'1px solid rgba(255,255,255,0.07)', display:'flex', alignItems:'center', justifyContent:'space-between' }}>
          <div style={{ display:'flex', alignItems:'center', gap:9 }}><IcGear s={16} c={accent}/><span style={{ color:'white', fontSize:15, fontWeight:600 }}>Settings</span></div>
          <button onClick={onClose} style={{ background:'rgba(255,255,255,0.06)', border:'none', borderRadius:7, width:28, height:28, display:'flex', alignItems:'center', justifyContent:'center', cursor:'pointer', color:'rgba(255,255,255,0.5)' }}><IcX/></button>
        </div>
        {[
          { title:'Audio', rows:[{label:'Microphone',opts:['Built-in Microphone','AirPods Pro','USB Headset']},{label:'Speaker',opts:['Built-in Speakers','AirPods Pro']}] },
          { title:'Video', rows:[{label:'Camera',opts:['FaceTime HD Camera','USB Webcam','Virtual Camera']}] },
        ].map(sec=>(
          <div key={sec.title} style={{ padding:'16px 20px', borderBottom:'1px solid rgba(255,255,255,0.05)' }}>
            <div style={{ color:'rgba(255,255,255,0.38)', fontSize:10, fontWeight:700, letterSpacing:'0.08em', textTransform:'uppercase', marginBottom:14 }}>{sec.title}</div>
            {sec.rows.map(r=>(
              <div key={r.label} style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:12 }}>
                <span style={{ color:'rgba(255,255,255,0.7)', fontSize:13 }}>{r.label}</span>
                <div style={{ position:'relative', minWidth:180 }}>
                  <select style={{ width:'100%', background:'rgba(255,255,255,0.06)', border:'1px solid rgba(255,255,255,0.1)', borderRadius:8, padding:'8px 28px 8px 10px', color:'rgba(255,255,255,0.75)', fontSize:12, outline:'none', appearance:'none', cursor:'pointer', fontFamily:'Inter,sans-serif' }}>
                    {r.opts.map(o=><option key={o} style={{background:'#1A1F2E'}}>{o}</option>)}
                  </select>
                </div>
              </div>
            ))}
          </div>
        ))}
        <div style={{ padding:'16px 20px' }}>
          <div style={{ color:'rgba(255,255,255,0.38)', fontSize:10, fontWeight:700, letterSpacing:'0.08em', textTransform:'uppercase', marginBottom:14 }}>Effects</div>
          {[{label:'Background blur',val:blur,set:setBlur},{label:'Noise cancellation',val:noise,set:setNoise}].map(r=>(
            <div key={r.label} style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:14 }}>
              <div><div style={{ color:'rgba(255,255,255,0.75)', fontSize:13 }}>{r.label}</div></div>
              <MiniToggle value={r.val} onChange={r.set} accent={accent}/>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

/* ── Shortcuts modal ─────────────────────────────────────── */
function ShortcutsModal({ onClose, accent }) {
  const keys = [['Space','Mute / Unmute'],['V','Toggle camera'],['S','Screen share'],['C','Toggle chat'],['Esc','Close panels'],['?','Keyboard shortcuts']];
  return (
    <div style={{ position:'fixed', inset:0, background:'rgba(0,0,0,0.65)', backdropFilter:'blur(4px)', zIndex:500, display:'flex', alignItems:'center', justifyContent:'center', padding:20 }} onClick={onClose}>
      <div onClick={e=>e.stopPropagation()} className="screen-enter" style={{ background:'rgba(18,22,34,0.98)', border:'1px solid rgba(255,255,255,0.1)', borderRadius:20, width:'100%', maxWidth:360, boxShadow:'0 32px 80px rgba(0,0,0,0.6)', fontFamily:'Inter,sans-serif', overflow:'hidden' }}>
        <div style={{ padding:'18px 20px', borderBottom:'1px solid rgba(255,255,255,0.07)', display:'flex', alignItems:'center', justifyContent:'space-between' }}>
          <div style={{ display:'flex', alignItems:'center', gap:9 }}><IcHelp s={16} c={accent}/><span style={{ color:'white', fontSize:15, fontWeight:600 }}>Keyboard shortcuts</span></div>
          <button onClick={onClose} style={{ background:'rgba(255,255,255,0.06)', border:'none', borderRadius:7, width:28, height:28, display:'flex', alignItems:'center', justifyContent:'center', cursor:'pointer', color:'rgba(255,255,255,0.5)' }}><IcX/></button>
        </div>
        <div style={{ padding:'8px 0 16px' }}>
          {keys.map(([k,l])=>(
            <div key={k} style={{ display:'flex', alignItems:'center', justifyContent:'space-between', padding:'10px 20px' }}>
              <span style={{ color:'rgba(255,255,255,0.65)', fontSize:13 }}>{l}</span>
              <kbd style={{ background:'rgba(255,255,255,0.08)', border:'1px solid rgba(255,255,255,0.12)', borderRadius:6, padding:'3px 9px', fontSize:12, color:'rgba(255,255,255,0.7)', fontFamily:'Inter,sans-serif', fontWeight:500 }}>{k}</kbd>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

/* ── Toasts ──────────────────────────────────────────────── */
function Toast({ message, ini, color }) {
  return (
    <div className="toast-enter" style={{ background:'rgba(22,27,42,0.95)', backdropFilter:'blur(20px)', border:'1px solid rgba(255,255,255,0.08)', borderRadius:10, padding:'10px 14px', display:'flex', alignItems:'center', gap:10, boxShadow:'0 8px 32px rgba(0,0,0,0.4)', whiteSpace:'nowrap', fontFamily:'Inter,sans-serif' }}>
      <div style={{ width:26, height:26, borderRadius:'50%', background:color, display:'flex', alignItems:'center', justifyContent:'center', fontSize:10, fontWeight:700, color:'white', flexShrink:0 }}>{ini}</div>
      <span style={{ color:'rgba(255,255,255,0.88)', fontSize:13 }}>{message}</span>
    </div>
  );
}
function ToastStack({ toasts }) {
  return <div style={{ position:'fixed', bottom:92, right:16, display:'flex', flexDirection:'column-reverse', gap:8, zIndex:300, pointerEvents:'none' }}>{toasts.map(t=><Toast key={t.id} {...t}/>)}</div>;
}

/* ── Room Screen ─────────────────────────────────────────── */
function RoomScreen({ userName, onLeave, onProfile, userPhoto, participantCount=4, isMobile=false, accent='#3B82F6' }) {
  const [micOn,setMicOn]=useState(true);
  const [camOn,setCamOn]=useState(true);
  const [screenShare,setScreenShare]=useState(false);
  const [chatOpen,setChatOpen]=useState(false);
  const [unread,setUnread]=useState(0);
  const [messages,setMessages]=useState(INIT_MSGS);
  const [settingsOpen,setSettingsOpen]=useState(false);
  const [shortcutsOpen,setShortcutsOpen]=useState(false);
  const [activeSpeaker,setActiveSpeaker]=useState(null);
  const [toasts,setToasts]=useState([]);

  const count = Math.max(1, Math.min(6, participantCount));
  const participants = MOCK_P.slice(0,count).map(p=>p.isSelf?{...p,name:userName||'You',photo:userPhoto||null}:p);
  const selfP = participants.find(p=>p.isSelf);
  const isWaiting = count === 1;

  const addToast = (message, ini, color) => {
    const id = Date.now() + Math.random();
    setToasts(prev=>[...prev,{id,message,ini,color}]);
    setTimeout(()=>setToasts(prev=>prev.filter(t=>t.id!==id)), 3800);
  };

  const toggleChat = () => { setChatOpen(v=>{ if(!v) setUnread(0); return !v; }); };
  const sendMsg = text => { const time=new Date().toLocaleTimeString([],{hour:'2-digit',minute:'2-digit'}); setMessages(prev=>[...prev,{id:Date.now(),sender:userName||'You',text,time,isSelf:true}]); };

  // Keyboard shortcuts
  useEffect(() => {
    const fn = e => {
      if(['input','textarea'].includes(e.target.tagName.toLowerCase())) return;
      if(e.code==='Space'){e.preventDefault();setMicOn(v=>!v);}
      else if(e.key==='v') setCamOn(v=>!v);
      else if(e.key==='s') setScreenShare(v=>!v);
      else if(e.key==='c') setChatOpen(v=>!v);
      else if(e.key==='?') setShortcutsOpen(v=>!v);
      else if(e.key==='Escape'){setSettingsOpen(false);setShortcutsOpen(false);}
    };
    window.addEventListener('keydown',fn);
    return ()=>window.removeEventListener('keydown',fn);
  }, []);

  // Simulate speaking
  useEffect(() => {
    const nonSelf = participants.filter(p=>!p.isSelf);
    if(!nonSelf.length) return;
    let i=0;
    const t=setInterval(()=>{ setActiveSpeaker(nonSelf[i%nonSelf.length].id); setTimeout(()=>setActiveSpeaker(null),2200); i++; },4000);
    return ()=>clearInterval(t);
  }, [count]);

  // Simulate join toasts
  useEffect(() => {
    const evts=[{d:4000,msg:'Sarah Kim joined',ini:'SK',col:'#8B5CF6'},{d:7500,msg:'Marcus J. joined',ini:'MJ',col:'#EC4899'},{d:11000,msg:'Priya is sharing screen',ini:'PP',col:'#10B981'}];
    const ts=evts.map(({d,msg,ini,col})=>setTimeout(()=>addToast(msg,ini,col),d));
    return ()=>ts.forEach(clearTimeout);
  }, []);

  // Simulate incoming chat message
  useEffect(()=>{
    const t=setTimeout(()=>{ const time=new Date().toLocaleTimeString([],{hour:'2-digit',minute:'2-digit'}); setMessages(prev=>[...prev,{id:Date.now(),sender:'Sarah Kim',text:"Ready to look at the mockups? I can share my screen.",time,isSelf:false}]); setChatOpen(prev=>{ if(!prev) setUnread(u=>u+1); return prev; }); },9000);
    return ()=>clearTimeout(t);
  },[]);

  const chatW = chatOpen && !isMobile ? 320 : 0;

  return (
    <div style={{ width:'100vw', height:'100vh', background:'#0a0c14', display:'flex', flexDirection:'column', fontFamily:'Inter,sans-serif', overflow:'hidden' }}>
      <TopBar roomName="Design Sprint · Q3" count={count} screenSharing={screenShare} onSettings={()=>setSettingsOpen(true)} onShortcuts={()=>setShortcutsOpen(true)} onProfile={onProfile} userName={userName} userPhoto={userPhoto} accent={accent}/>
      <div style={{ flex:1, display:'flex', paddingTop:56, paddingBottom:82, transition:'padding-right 0.26s cubic-bezier(0.4,0,0.2,1)', paddingRight:chatW, minHeight:0, overflow:'hidden' }}>
        {isWaiting
          ? <WaitingRoom roomId="room-k9p2m" accent={accent} localMuted={!micOn} localVideoOff={!camOn} selfP={selfP}/>
          : <VideoGrid participants={participants} localMuted={!micOn} localVideoOff={!camOn} isMobile={isMobile} screenShare={screenShare} activeSpeaker={activeSpeaker} accent={accent}/>
        }
      </div>
      <ControlBar micOn={micOn} camOn={camOn} screenShare={screenShare} chatOpen={chatOpen} unread={unread} onMic={()=>setMicOn(v=>!v)} onCam={()=>setCamOn(v=>!v)} onScreen={()=>setScreenShare(v=>!v)} onChat={toggleChat} onLeave={onLeave} isMobile={isMobile} accent={accent}/>
      <ChatPanel open={chatOpen} messages={messages} onClose={()=>setChatOpen(false)} onSend={sendMsg} isMobile={isMobile} accent={accent}/>
      <ToastStack toasts={toasts}/>
      {settingsOpen  && <SettingsModal  onClose={()=>setSettingsOpen(false)}  accent={accent}/>}
      {shortcutsOpen && <ShortcutsModal onClose={()=>setShortcutsOpen(false)} accent={accent}/>}
    </div>
  );
}

function ProfileAvatar({ name, photo, accent, onClick }) {
  const [h,setH]=useState(false);
  const ini = (name||'?').split(' ').filter(Boolean).map(n=>n[0]).join('').toUpperCase().slice(0,2);
  return (
    <button onClick={onClick} onMouseEnter={()=>setH(true)} onMouseLeave={()=>setH(false)}
      title="My profile"
      style={{ width:32, height:32, borderRadius:'50%', overflow:'hidden', cursor:'pointer', border:`1.5px solid ${h?accent:`${accent}55`}`, padding:0, background:'transparent', flexShrink:0, transition:'border-color 0.2s,box-shadow 0.2s', boxShadow:h?`0 0 0 3px ${accent}25`:undefined }}>
      {photo
        ? <img src={photo} style={{ width:'100%', height:'100%', objectFit:'cover' }}/>
        : <div style={{ width:'100%', height:'100%', background:`linear-gradient(135deg,${accent}cc,${accent}66)`, display:'flex', alignItems:'center', justifyContent:'center', fontSize:11, fontWeight:700, color:'white' }}>{ini}</div>
      }
    </button>
  );
}

Object.assign(window, { RoomScreen });
