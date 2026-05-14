'use client';

import type { FormEvent } from 'react';
import { useRef } from 'react';
import { UserCircle2 } from 'lucide-react';

interface NameModalProps {
  onConfirm: (displayName: string) => void;
}

export function NameModal({ onConfirm }: NameModalProps) {
  const inputRef = useRef<HTMLInputElement>(null);

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    const name = inputRef.current?.value.trim() ?? '';
    if (!name) return;
    onConfirm(name);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 px-4 backdrop-blur-sm">
      <div className="w-full max-w-sm rounded-2xl border border-slate-800 bg-slate-900 p-6 shadow-2xl">
        <div className="mb-5 flex flex-col items-center gap-2 text-center">
          <div className="flex h-12 w-12 items-center justify-center rounded-full bg-cyan-500/10 ring-1 ring-cyan-500/30">
            <UserCircle2 size={24} className="text-cyan-400" />
          </div>
          <h2 className="text-base font-semibold text-slate-100">Adınız nedir?</h2>
          <p className="text-xs text-slate-500">Görüşme boyunca bu isim görünecek</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <input
            ref={inputRef}
            id="name-modal-input"
            className="w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2.5 text-sm text-slate-100 outline-none placeholder:text-slate-600 focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500"
            placeholder="örn. Abdullah"
            autoFocus
            spellCheck={false}
            autoComplete="nickname"
          />
          <button
            type="submit"
            className="w-full rounded-lg bg-cyan-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-cyan-500"
          >
            Devam Et
          </button>
        </form>
      </div>
    </div>
  );
}
