
const { useState, useRef } = React;

/* ── Profile Page ────────────────────────────────────────── */
function ProfilePage({ user, onSave, onBack, accent = '#3B82F6' }) {
  const [name,     setName    ] = useState(user?.name  || '');
  const [photo,    setPhoto   ] = useState(user?.photo || null);
  const [saved,    setSaved   ] = useState(false);
  const [dragging, setDragging] = useState(false);
  const fileRef = useRef(null);

  const initials = name.trim().split(' ').filter(Boolean).map(n=>n[0]).join('').toUpperCase().slice(0,2) || '?';

  const loadFile = file => {
    if (!file || !file.type.startsWith('image/')) return;
    const r = new FileReader();
    r.onload = e => setPhoto(e.target.result);
    r.readAsDataURL(file);
  };

  const handleSave = () => {
    if (!name.trim()) return;
    onSave({ ...user, name: name.trim(), photo });
    setSaved(true);
    setTimeout(() => setSaved(false), 2400);
  };

  const providerColor = { google:'#4285F4', github:'rgba(255,255,255,0.6)', instagram:'#E1306C', email:'#6B7280' };
  const providerLabel = { google:'Google', github:'GitHub', instagram:'Instagram', email:'Email' };

  return (
    <div style={{ minHeight:'100vh', background:'#0a0c14', display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', fontFamily:'Inter,sans-serif', padding:24, position:'relative', overflow:'hidden' }}>
      {/* BG glow */}
      <div style={{ position:'absolute', inset:0, pointerEvents:'none', background:`radial-gradient(ellipse 60% 40% at 50% 0%, ${accent}12 0%, transparent 70%)` }}/>
      <div style={{ position:'absolute', inset:0, pointerEvents:'none', opacity:0.018, backgroundImage:'linear-gradient(rgba(255,255,255,1) 1px,transparent 1px),linear-gradient(90deg,rgba(255,255,255,1) 1px,transparent 1px)', backgroundSize:'56px 56px' }}/>

      {/* Back button */}
      <BackBtn onClick={onBack}/>

      {/* Card */}
      <div className="screen-enter" style={{ background:'rgba(22,27,42,0.82)', backdropFilter:'blur(24px)', border:'1px solid rgba(255,255,255,0.08)', borderRadius:22, padding:'36px 32px 30px', width:'100%', maxWidth:440, zIndex:1, boxShadow:'0 32px 80px rgba(0,0,0,0.55)' }}>

        {/* Heading */}
        <div style={{ textAlign:'center', marginBottom:28 }}>
          <h2 style={{ color:'white', fontSize:22, fontWeight:700, letterSpacing:'-0.02em', marginBottom:5 }}>Your Profile</h2>
          <p style={{ color:'rgba(255,255,255,0.35)', fontSize:13 }}>Update your name and photo</p>
        </div>

        {/* Avatar picker */}
        <div style={{ display:'flex', flexDirection:'column', alignItems:'center', marginBottom:28 }}>
          <div
            onClick={() => fileRef.current.click()}
            onDragOver={e => { e.preventDefault(); setDragging(true); }}
            onDragLeave={() => setDragging(false)}
            onDrop={e => { e.preventDefault(); setDragging(false); loadFile(e.dataTransfer.files[0]); }}
            style={{ position:'relative', cursor:'pointer' }}
          >
            <div style={{ width:104, height:104, borderRadius:'50%', overflow:'hidden', border:`2.5px solid ${dragging ? accent : `${accent}60`}`, boxShadow:`0 0 0 5px ${accent}${dragging?'30':'18'}`, transition:'border-color 0.2s,box-shadow 0.2s' }}>
              {photo ? (
                <img src={photo} alt="avatar" style={{ width:'100%', height:'100%', objectFit:'cover' }}/>
              ) : (
                <div style={{ width:'100%', height:'100%', background:`linear-gradient(135deg,${accent}dd,${accent}77)`, display:'flex', alignItems:'center', justifyContent:'center', fontSize:34, fontWeight:700, color:'white' }}>
                  {initials}
                </div>
              )}
            </div>
            {/* Camera badge */}
            <div style={{ position:'absolute', bottom:2, right:2, width:30, height:30, borderRadius:'50%', background:accent, border:'2.5px solid #0a0c14', display:'flex', alignItems:'center', justifyContent:'center', boxShadow:`0 2px 8px ${accent}60` }}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"/>
                <circle cx="12" cy="13" r="4"/>
              </svg>
            </div>
          </div>

          <input ref={fileRef} type="file" accept="image/*" onChange={e=>loadFile(e.target.files[0])} style={{ display:'none' }}/>
          <p style={{ color:'rgba(255,255,255,0.28)', fontSize:11, marginTop:10, textAlign:'center' }}>
            Click or drag &amp; drop an image
          </p>
          {photo && (
            <button onClick={()=>setPhoto(null)} style={{ background:'none', border:'none', color:'rgba(239,68,68,0.65)', fontSize:11, cursor:'pointer', fontFamily:'Inter,sans-serif', marginTop:4, padding:'2px 6px', transition:'color 0.15s' }} onMouseEnter={e=>e.currentTarget.style.color='rgba(239,68,68,0.9)'} onMouseLeave={e=>e.currentTarget.style.color='rgba(239,68,68,0.65)'}>
              Remove photo
            </button>
          )}
        </div>

        {/* Name field */}
        <div style={{ marginBottom:14 }}>
          <label style={{ display:'block', color:'rgba(255,255,255,0.4)', fontSize:10, fontWeight:600, marginBottom:5, letterSpacing:'0.08em', textTransform:'uppercase' }}>Display Name</label>
          <input
            type="text" value={name} onChange={e=>setName(e.target.value)}
            onKeyDown={e=>{ if(e.key==='Enter') handleSave(); }}
            placeholder="Your name"
            style={{ width:'100%', boxSizing:'border-box', background:'rgba(255,255,255,0.05)', border:'1px solid rgba(255,255,255,0.1)', borderRadius:10, padding:'12px 13px', color:'white', fontSize:14, outline:'none', fontFamily:'Inter,sans-serif', transition:'border-color 0.15s' }}
            onFocus={e=>e.target.style.borderColor=`${accent}70`}
            onBlur={e=>e.target.style.borderColor='rgba(255,255,255,0.1)'}
          />
        </div>

        {/* Email / provider (read-only) */}
        {user?.email && (
          <div style={{ marginBottom:24, background:'rgba(255,255,255,0.03)', border:'1px solid rgba(255,255,255,0.07)', borderRadius:10, padding:'11px 13px', display:'flex', alignItems:'center', justifyContent:'space-between' }}>
            <div>
              <div style={{ color:'rgba(255,255,255,0.36)', fontSize:10, fontWeight:600, letterSpacing:'0.08em', textTransform:'uppercase', marginBottom:3 }}>Email</div>
              <div style={{ color:'rgba(255,255,255,0.65)', fontSize:13 }}>{user.email}</div>
            </div>
            {user.provider && (
              <span style={{ background:'rgba(255,255,255,0.06)', border:'1px solid rgba(255,255,255,0.09)', borderRadius:20, padding:'4px 11px', fontSize:11, color:providerColor[user.provider]||'rgba(255,255,255,0.5)', fontWeight:500 }}>
                via {providerLabel[user.provider]||user.provider}
              </span>
            )}
          </div>
        )}

        {/* Save */}
        <SaveChangesBtn onSave={handleSave} saved={saved} accent={accent} disabled={!name.trim()}/>

        {/* Sign out */}
        <button
          onClick={onBack}
          style={{ width:'100%', padding:'12px', background:'transparent', border:'1px solid rgba(239,68,68,0.18)', borderRadius:11, color:'rgba(239,68,68,0.55)', fontSize:13, fontWeight:500, cursor:'pointer', fontFamily:'Inter,sans-serif', marginTop:10, transition:'all 0.15s' }}
          onMouseEnter={e=>{ e.currentTarget.style.background='rgba(239,68,68,0.07)'; e.currentTarget.style.color='rgba(239,68,68,0.85)'; }}
          onMouseLeave={e=>{ e.currentTarget.style.background='transparent'; e.currentTarget.style.color='rgba(239,68,68,0.55)'; }}
        >
          Sign out
        </button>
      </div>
    </div>
  );
}

function BackBtn({ onClick }) {
  const [h,setH] = useState(false);
  return (
    <button onClick={onClick} onMouseEnter={()=>setH(true)} onMouseLeave={()=>setH(false)} style={{ position:'absolute', top:20, left:20, display:'flex', alignItems:'center', gap:7, background:h?'rgba(255,255,255,0.1)':'rgba(255,255,255,0.05)', border:'1px solid rgba(255,255,255,0.09)', borderRadius:10, padding:'8px 14px', cursor:'pointer', color:'rgba(255,255,255,0.65)', fontSize:13, fontWeight:500, fontFamily:'Inter,sans-serif', transition:'all 0.15s' }}>
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="19" y1="12" x2="5" y2="12"/><polyline points="12 19 5 12 12 5"/></svg>
      Back
    </button>
  );
}

function SaveChangesBtn({ onSave, saved, accent, disabled }) {
  const [h,setH]=useState(false);
  return (
    <button onClick={onSave} disabled={disabled}
      onMouseEnter={()=>setH(true)} onMouseLeave={()=>setH(false)}
      style={{ width:'100%', padding:'13px', background:saved?'rgba(34,197,94,0.18)':disabled?`${accent}28`:(h?'#2563EB':accent), border:saved?'1px solid rgba(34,197,94,0.35)':'none', borderRadius:11, color:saved?'#4ADE80':disabled?'rgba(255,255,255,0.3)':'white', fontSize:14, fontWeight:600, cursor:disabled?'not-allowed':'pointer', fontFamily:'Inter,sans-serif', transition:'all 0.2s', transform:h&&!disabled?'translateY(-1px)':'none', boxShadow:h&&!disabled?`0 8px 24px ${accent}40`:undefined }}>
      {saved ? '✓ Changes saved!' : 'Save changes'}
    </button>
  );
}

Object.assign(window, { ProfilePage });
