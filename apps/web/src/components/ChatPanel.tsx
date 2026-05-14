'use client';

import type { FormEvent } from 'react';
import { useEffect, useRef, useState } from 'react';
import { SendHorizontal, X } from 'lucide-react';
import type { ChatMessage } from '@/hooks/useRoom';

interface ChatPanelProps {
  messages: ChatMessage[];
  peerId: string;
  onSend: (text: string) => void;
  onClose: () => void;
}

export function ChatPanel({ messages, onSend, onClose }: ChatPanelProps) {
  const [text, setText] = useState('');
  const bottomRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    const trimmed = text.trim();
    if (!trimmed) return;
    onSend(trimmed);
    setText('');
  };

  return (
    <div className="flex h-full flex-col rounded-2xl border border-slate-800 bg-slate-900/95 backdrop-blur">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-slate-800 px-4 py-3">
        <span className="text-sm font-semibold text-slate-200">Sohbet</span>
        <button
          type="button"
          onClick={onClose}
          className="text-slate-400 transition hover:text-slate-200"
          title="Kapat"
        >
          <X size={16} />
        </button>
      </div>

      {/* Messages */}
      <div className="flex flex-1 flex-col gap-3 overflow-y-auto p-3">
        {messages.length === 0 && (
          <p className="py-6 text-center text-xs text-slate-600">Henüz mesaj yok</p>
        )}
        {messages.map((msg) => (
          <div key={msg.id} className={`flex flex-col ${msg.isSelf ? 'items-end' : 'items-start'}`}>
            {!msg.isSelf && (
              <span className="mb-0.5 max-w-[85%] truncate text-xs text-slate-500">{msg.peerId}</span>
            )}
            <div
              className={`max-w-[85%] break-words rounded-2xl px-3 py-2 text-sm leading-relaxed ${
                msg.isSelf ? 'rounded-br-sm bg-cyan-600 text-white' : 'rounded-bl-sm bg-slate-800 text-slate-100'
              }`}
            >
              {msg.text}
            </div>
            <span className="mt-0.5 text-xs text-slate-600">
              {new Date(msg.ts).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
            </span>
          </div>
        ))}
        <div ref={bottomRef} />
      </div>

      {/* Input */}
      <form onSubmit={handleSubmit} className="flex items-center gap-2 border-t border-slate-800 p-3">
        <input
          className="min-w-0 flex-1 rounded-xl bg-slate-800 px-3 py-2 text-sm text-slate-100 outline-none placeholder:text-slate-500 focus:ring-1 focus:ring-cyan-500"
          placeholder="Mesaj yaz…"
          value={text}
          onChange={(e) => setText(e.target.value)}
          autoComplete="off"
        />
        <button
          type="submit"
          className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-cyan-600 text-white transition hover:bg-cyan-500"
          title="Gönder"
        >
          <SendHorizontal size={15} />
        </button>
      </form>
    </div>
  );
}
