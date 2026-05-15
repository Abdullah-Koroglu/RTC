
const { useState, useMemo } = React;

/* ── Logo (uses actual PNG — transparent background) ────── */
function LinkLogoMark({ size = 40 }) {
  return <img src="logo-only.png" width={size} height={size} alt="Link" style={{ objectFit: 'contain', display: 'block', flexShrink: 0 }} />;
}

/* ── Icons ──────────────────────────────────────────────── */
const sb2 = { fill: 'none', strokeLinecap: 'round', strokeLinejoin: 'round' };
const IcCam   = ({ s=18,c='currentColor' }) => <svg width={s} height={s} viewBox="0 0 24 24" stroke={c} strokeWidth="2" {...sb2}><path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"/><circle cx="12" cy="13" r="4"/></svg>;
const IcCamOff= ({ s=18,c='currentColor' }) => <svg width={s} height={s} viewBox="0 0 24 24" stroke={c} strokeWidth="2" {...sb2}><path d="M10.66 6H14a2 2 0 0 1 2 2v2.34l1 1L22 8v8"/><path d="M16 16a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h2l10 10z"/><line x1="2" y1="2" x2="22" y2="22"/></svg>;
const IcMic   = ({ s=18,c='currentColor' }) => <svg width={s} height={s} viewBox="0 0 24 24" stroke={c} strokeWidth="2" {...sb2}><path d="M12 2a3 3 0 0 0-3 3v7a3 3 0 0 0 6 0V5a3 3 0 0 0-3-3z"/><path d="M19 10v2a7 7 0 0 1-14 0v-2"/><line x1="12" y1="19" x2="12" y2="22"/><line x1="8" y1="22" x2="16" y2="22"/></svg>;
const IcMicOff= ({ s=18,c='currentColor' }) => <svg width={s} height={s} viewBox="0 0 24 24" stroke={c} strokeWidth="2" {...sb2}><line x1="2" y1="2" x2="22" y2="22"/><path d="M18.89 13.23A7.12 7.12 0 0 0 19 12v-2"/><path d="M5 10v2a7 7 0 0 0 12 5"/><path d="M15 9.34V5a3 3 0 0 0-5.68-1.33"/><path d="M9 9v3a3 3 0 0 0 5.12 2.12"/><line x1="12" y1="19" x2="12" y2="22"/></svg>;
const IcChev  = ({ s=14,c='currentColor' }) => <svg width={s} height={s} viewBox="0 0 24 24" stroke={c} strokeWidth="2" {...sb2}><polyline points="6 9 12 15 18 9"/></svg>;

function DeviceSelect({ label, options }) {
  return (
    <div>
      <label style={{ display:'block', color:'rgba(255,255,255,0.4)', fontSize:10, fontWeight:600, marginBottom:5, letterSpacing:'0.08em', textTransform:'uppercase' }}>
        {label}
      </label>
      <div style={{ position:'relative' }}>
        <select style={{ width:'100%', background:'rgba(255,255,255,0.05)', border:'1px solid rgba(255,255,255,0.08)', borderRadius:8, padding:'9px 28px 9px 11px', color:'rgba(255,255,255,0.75)', fontSize:12, outline:'none', appearance:'none', cursor:'pointer', fontFamily:'Inter,sans-serif' }}>
          {options.map(o=><option key={o} style={{background:'#1A1F2E'}}>{o}</option>)}
        </select>
        <div style={{ position:'absolute', right:9, top:'50%', transform:'translateY(-50%)', pointerEvents:'none' }}>
          <IcChev color="rgba(255,255,255,0.3)"/>
        </div>
      </div>
    </div>
  );
}

function PreviewToggle({ on, onToggle, iconOn, iconOff }) {
  const [hov, setHov] = useState(false);
  return (
    <button onClick={onToggle} onMouseEnter={()=>setHov(true)} onMouseLeave={()=>setHov(false)} style={{
      width:36, height:36, borderRadius:'50%', cursor:'pointer', backdropFilter:'blur(8px)',
      background: on ? (hov?'rgba(255,255,255,0.18)':'rgba(255,255,255,0.1)') : (hov?'rgba(239,68,68,0.85)':'rgba(239,68,68,0.7)'),
      border:'1px solid rgba(255,255,255,0.1)',
      display:'flex', alignItems:'center', justifyContent:'center',
      transition:'background 0.15s', flexShrink:0,
    }}>
      {on ? iconOn : iconOff}
    </button>
  );
}

/* ── Join Screen ─────────────────────────────────────────── */
function JoinScreen({ onJoin, roomId = 'room-k9p2m', user = null }) {
  const [name, setName] = useState(user?.name || '');
  const [camOn, setCamOn] = useState(true);
  const [micOn, setMicOn] = useState(true);

  const initials = name.trim()
    ? name.trim().split(' ').filter(Boolean).map(n=>n[0]).join('').toUpperCase().slice(0,2)
    : null;
  const canJoin = name.trim().length > 0;

  return (
    <div style={{ minHeight:'100vh', background:'#0a0c14', display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', fontFamily:'Inter,sans-serif', padding:'24px', position:'relative', overflow:'hidden' }}>
      {/* BG glow */}
      <div style={{ position:'absolute', inset:0, pointerEvents:'none', background:'radial-gradient(ellipse 70% 45% at 50% -5%, rgba(59,130,246,0.13) 0%, transparent 70%)' }}/>
      <div style={{ position:'absolute', inset:0, pointerEvents:'none', opacity:0.022, backgroundImage:'linear-gradient(rgba(255,255,255,1) 1px,transparent 1px),linear-gradient(90deg,rgba(255,255,255,1) 1px,transparent 1px)', backgroundSize:'56px 56px' }}/>

      {/* Room badge */}
      <div style={{ position:'absolute', top:22, left:'50%', transform:'translateX(-50%)', background:'rgba(255,255,255,0.04)', border:'1px solid rgba(255,255,255,0.08)', borderRadius:20, padding:'5px 14px', display:'flex', alignItems:'center', gap:7, backdropFilter:'blur(12px)', whiteSpace:'nowrap' }}>
        <span style={{ width:7, height:7, borderRadius:'50%', background:'#22C55E', display:'block', flexShrink:0 }}/>
        <span style={{ color:'rgba(255,255,255,0.4)', fontSize:11 }}>Room</span>
        <span style={{ color:'rgba(255,255,255,0.8)', fontSize:11, fontWeight:600, letterSpacing:'0.06em' }}>{roomId}</span>
      </div>

      {/* Auth user avatar (top-right) */}
      {user && (
        <div style={{ position:'absolute', top:18, right:20, display:'flex', alignItems:'center', gap:9, background:'rgba(255,255,255,0.05)', border:'1px solid rgba(255,255,255,0.08)', borderRadius:24, padding:'6px 12px 6px 6px', backdropFilter:'blur(12px)' }}>
          <div style={{ width:28, height:28, borderRadius:'50%', background:'linear-gradient(135deg,#3B82F6,#1E3FC4)', display:'flex', alignItems:'center', justifyContent:'center', fontSize:11, fontWeight:700, color:'white', flexShrink:0 }}>
            {user.name.split(' ').map(n=>n[0]).join('').toUpperCase().slice(0,2)}
          </div>
          <span style={{ color:'rgba(255,255,255,0.75)', fontSize:12, fontWeight:500 }}>{user.name}</span>
        </div>
      )}

      {/* Card */}
      <div className="screen-enter" style={{ background:'rgba(22,27,42,0.82)', backdropFilter:'blur(24px)', border:'1px solid rgba(255,255,255,0.08)', borderRadius:22, padding:'36px 32px 32px', width:'100%', maxWidth:460, position:'relative', zIndex:1, boxShadow:'0 32px 80px rgba(0,0,0,0.55)' }}>
        {/* Branding */}
        <div style={{ display:'flex', flexDirection:'column', alignItems:'center', marginBottom:22 }}>
          <LinkLogoMark size={54}/>
          <div style={{ marginTop:10, display:'flex', alignItems:'center', gap:8 }}>
            <span style={{ color:'white', fontSize:24, fontWeight:700, letterSpacing:'-0.03em' }}>Link</span>
          </div>
          <span style={{ color:'rgba(255,255,255,0.3)', fontSize:12, marginTop:3 }}>Video Conferencing</span>
        </div>

        {/* "Looks good?" label */}
        <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:8 }}>
          <span style={{ color:'rgba(255,255,255,0.6)', fontSize:12, fontWeight:500 }}>Looks good?</span>
          <span style={{ color:'rgba(255,255,255,0.3)', fontSize:11 }}>Your preview</span>
        </div>

        {/* Camera preview */}
        <div style={{ width:'100%', aspectRatio:'16/9', background:camOn?'radial-gradient(ellipse 80% 70% at 50% 30%, rgba(59,130,246,0.07), #080a10)':'#080a10', borderRadius:12, overflow:'hidden', marginBottom:16, position:'relative', border:'1px solid rgba(255,255,255,0.06)', display:'flex', alignItems:'center', justifyContent:'center', transition:'background 0.3s' }}>
          {camOn ? (
            <div style={{ textAlign:'center' }}>
              {initials ? (
                <div style={{ width:68, height:68, borderRadius:'50%', background:'linear-gradient(135deg,#3B82F6cc,#1E3FC4aa)', display:'flex', alignItems:'center', justifyContent:'center', margin:'0 auto 8px', fontSize:24, fontWeight:700, color:'white', boxShadow:'0 0 0 3px rgba(59,130,246,0.2)' }}>{initials}</div>
              ) : (
                <div style={{ width:68, height:68, borderRadius:'50%', background:'rgba(255,255,255,0.05)', border:'2px dashed rgba(255,255,255,0.12)', display:'flex', alignItems:'center', justifyContent:'center', margin:'0 auto 8px' }}>
                  <IcCam s={22} c="rgba(255,255,255,0.2)"/>
                </div>
              )}
              <span style={{ color:'rgba(255,255,255,0.2)', fontSize:10, letterSpacing:'0.06em', textTransform:'uppercase' }}>Camera Preview</span>
            </div>
          ) : (
            <div style={{ textAlign:'center' }}>
              <IcCamOff s={26} c="rgba(255,255,255,0.15)"/>
              <div style={{ color:'rgba(255,255,255,0.2)', fontSize:11, marginTop:6 }}>Camera off</div>
            </div>
          )}
          {/* Overlay controls */}
          <div style={{ position:'absolute', bottom:10, left:'50%', transform:'translateX(-50%)', display:'flex', gap:8 }}>
            <PreviewToggle on={micOn} onToggle={()=>setMicOn(v=>!v)} iconOn={<IcMic s={15} c="white"/>} iconOff={<IcMicOff s={15} c="white"/>}/>
            <PreviewToggle on={camOn} onToggle={()=>setCamOn(v=>!v)} iconOn={<IcCam s={15} c="white"/>} iconOff={<IcCamOff s={15} c="white"/>}/>
          </div>
        </div>

        {/* Name */}
        <div style={{ marginBottom:13 }}>
          <label style={{ display:'block', color:'rgba(255,255,255,0.4)', fontSize:10, fontWeight:600, marginBottom:5, letterSpacing:'0.08em', textTransform:'uppercase' }}>Display Name</label>
          <input type="text" placeholder="e.g. Alex Chen" value={name} onChange={e=>setName(e.target.value)}
            onKeyDown={e=>{ if(e.key==='Enter'&&canJoin) onJoin(name.trim(),{micOn,camOn}); }} autoFocus
            style={{ width:'100%', boxSizing:'border-box', background:'rgba(255,255,255,0.05)', border:'1px solid rgba(255,255,255,0.1)', borderRadius:10, padding:'12px 13px', color:'white', fontSize:14, outline:'none', fontFamily:'Inter,sans-serif', transition:'border-color 0.15s' }}
            onFocus={e=>e.target.style.borderColor='rgba(59,130,246,0.6)'}
            onBlur={e=>e.target.style.borderColor='rgba(255,255,255,0.1)'}
          />
        </div>

        {/* Device selectors */}
        <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:10, marginBottom:22 }}>
          <DeviceSelect label="Camera" options={['FaceTime HD Camera','USB Webcam','Virtual Camera']}/>
          <DeviceSelect label="Microphone" options={['Built-in Microphone','AirPods Pro','USB Headset']}/>
        </div>

        {/* Join button */}
        <JoinBtn canJoin={canJoin} onJoin={()=>onJoin(name.trim(),{micOn,camOn})}/>
      </div>

      <p style={{ marginTop:18, color:'rgba(255,255,255,0.18)', fontSize:11, textAlign:'center' }}>
        By joining you agree to Link's Terms of Service &amp; Privacy Policy
      </p>
    </div>
  );
}

function JoinBtn({ canJoin, onJoin }) {
  const [hov, setHov] = useState(false);
  return (
    <button onClick={onJoin} disabled={!canJoin}
      onMouseEnter={()=>setHov(true)} onMouseLeave={()=>setHov(false)}
      style={{ width:'100%', padding:'13px', background:canJoin?(hov?'#2563EB':'#3B82F6'):'rgba(59,130,246,0.22)', border:'none', borderRadius:11, color:canJoin?'white':'rgba(255,255,255,0.3)', fontSize:14, fontWeight:600, cursor:canJoin?'pointer':'not-allowed', transition:'all 0.15s', transform:hov&&canJoin?'translateY(-1px)':'none', fontFamily:'Inter,sans-serif', boxShadow:canJoin&&hov?'0 8px 24px rgba(59,130,246,0.35)':'none' }}>
      Join Room
    </button>
  );
}

Object.assign(window, { JoinScreen, LinkLogoMark });
