'use client';

import { useEffect, useRef, useState } from 'react';
import type { ChatMessage } from '@/hooks/useRoom';

interface ChatPanelProps {
  open: boolean;
  messages: ChatMessage[];
  onClose: () => void;
  onSend: (text: string) => void;
  isMobile?: boolean;
}

const IcX = ({ s = 14, c = 'currentColor' }: { s?: number; c?: string }) => (
  <svg width={s} height={s} viewBox="0 0 24 24" stroke={c} strokeWidth="2" fill="none" strokeLinecap="round" strokeLinejoin="round">
    <line x1="18" y1="6" x2="6" y2="18"/>
    <line x1="6" y1="6" x2="18" y2="18"/>
  </svg>
);

const IcSend = ({ s = 16, c = 'currentColor' }: { s?: number; c?: string }) => (
  <svg width={s} height={s} viewBox="0 0 24 24" stroke={c} strokeWidth="2" fill="none" strokeLinecap="round" strokeLinejoin="round">
    <line x1="22" y1="2" x2="11" y2="13"/>
    <polygon points="22 2 15 22 11 13 2 9 22 2" fill={c} stroke="none"/>
  </svg>
);

export function ChatPanel({ open, messages, onClose, onSend, isMobile = false }: ChatPanelProps) {
  const [text, setText] = useState('');
  const listRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (open && listRef.current) {
      listRef.current.scrollTop = listRef.current.scrollHeight;
    }
  }, [open, messages.length]);

  const send = () => {
    const trimmed = text.trim();
    if (!trimmed) return;
    onSend(trimmed);
    setText('');
  };

  const width = isMobile ? '100%' : 320;

  return (
    <div style={{
      position: 'fixed',
      top: 0,
      right: 0,
      bottom: 0,
      width,
      background: 'rgba(11,13,20,0.95)',
      backdropFilter: 'blur(28px)',
      borderLeft: isMobile ? 'none' : '1px solid rgba(255,255,255,0.07)',
      display: 'flex',
      flexDirection: 'column',
      zIndex: 200,
      transform: open ? 'translateX(0)' : 'translateX(100%)',
      transition: 'transform 0.26s cubic-bezier(0.4,0,0.2,1)',
      fontFamily: 'Inter, sans-serif',
    }}>
      {/* Header */}
      <div style={{ padding: '18px 18px 16px', borderBottom: '1px solid rgba(255,255,255,0.07)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexShrink: 0 }}>
        <span style={{ color: 'white', fontSize: 14, fontWeight: 600 }}>In-call chat</span>
        <button
          onClick={onClose}
          style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 8, width: 30, height: 30, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', color: 'rgba(255,255,255,0.55)', transition: 'background 0.15s' }}
          onMouseEnter={(e) => (e.currentTarget.style.background = 'rgba(255,255,255,0.1)')}
          onMouseLeave={(e) => (e.currentTarget.style.background = 'rgba(255,255,255,0.06)')}
        >
          <IcX />
        </button>
      </div>

      {/* Messages */}
      <div ref={listRef} style={{ flex: 1, overflowY: 'auto', padding: '14px 14px 8px', display: 'flex', flexDirection: 'column', gap: 14 }}>
        {messages.length === 0 && (
          <p style={{ textAlign: 'center', color: 'rgba(255,255,255,0.25)', fontSize: 12, paddingTop: 40 }}>Henüz mesaj yok</p>
        )}
        {messages.map((msg) => (
          <div key={msg.id} style={{ display: 'flex', flexDirection: 'column', alignItems: msg.isSelf ? 'flex-end' : 'flex-start' }}>
            {!msg.isSelf && (
              <span style={{ color: 'rgba(255,255,255,0.38)', fontSize: 11, marginBottom: 3, paddingLeft: 3 }}>{msg.peerId}</span>
            )}
            <div style={{ background: msg.isSelf ? '#3B82F6' : 'rgba(255,255,255,0.07)', color: 'rgba(255,255,255,0.92)', borderRadius: msg.isSelf ? '14px 14px 3px 14px' : '14px 14px 14px 3px', padding: '9px 12px', maxWidth: '82%', fontSize: 13, lineHeight: 1.55, border: msg.isSelf ? 'none' : '1px solid rgba(255,255,255,0.07)', boxShadow: msg.isSelf ? '0 4px 16px rgba(59,130,246,0.3)' : undefined, wordBreak: 'break-word' }}>
              {msg.text}
            </div>
            <span style={{ color: 'rgba(255,255,255,0.22)', fontSize: 10, marginTop: 3 }}>
              {new Date(msg.ts).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
            </span>
          </div>
        ))}
      </div>

      {/* Input */}
      <div style={{ padding: '12px 14px', borderTop: '1px solid rgba(255,255,255,0.07)', flexShrink: 0, display: 'flex', gap: 8, alignItems: 'center' }}>
        <input
          placeholder="Mesaj yaz…"
          value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={(e) => { if (e.key === 'Enter') send(); }}
          style={{ flex: 1, background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 10, padding: '10px 12px', color: 'white', fontSize: 13, outline: 'none', fontFamily: 'Inter, sans-serif', transition: 'border-color 0.15s' }}
          onFocus={(e) => (e.target.style.borderColor = 'rgba(59,130,246,0.5)')}
          onBlur={(e) => (e.target.style.borderColor = 'rgba(255,255,255,0.1)')}
        />
        <button
          onClick={send}
          style={{ width: 38, height: 38, borderRadius: 10, background: '#3B82F6', border: 'none', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', flexShrink: 0, transition: 'background 0.15s' }}
          onMouseEnter={(e) => (e.currentTarget.style.background = '#2563EB')}
          onMouseLeave={(e) => (e.currentTarget.style.background = '#3B82F6')}
        >
          <IcSend c="white" />
        </button>
      </div>
    </div>
  );
}
