'use client';

import type { FormEvent } from 'react';
import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { RefreshCw, Video } from 'lucide-react';
import { useSignaling } from '@/hooks/useSignaling';
import { generateUUID } from '@/lib/uuid';

export const dynamic = 'force-dynamic';

const SS_DISPLAY_NAME = 'rtc:displayName';
const SS_PEER_ID = 'rtc:peerId';

function getOrCreatePeerId(): string {
  const stored = sessionStorage.getItem(SS_PEER_ID);
  if (stored) return stored;
  const id = `usr-${generateUUID().slice(0, 8)}`;
  sessionStorage.setItem(SS_PEER_ID, id);
  return id;
}

export default function HomePage() {
  const router = useRouter();

  const roomInputRef = useRef<HTMLInputElement>(null);
  const nameInputRef = useRef<HTMLInputElement>(null);
  const [initialRoomId] = useState(() => generateUUID());
  const [savedName, setSavedName] = useState('');

  // Pre-fill name from sessionStorage after mount (SSR-safe)
  useEffect(() => {
    const name = sessionStorage.getItem(SS_DISPLAY_NAME) ?? '';
    setSavedName(name);
    // Sync to uncontrolled input
    if (nameInputRef.current && name) {
      nameInputRef.current.value = name;
    }
  }, []);

  const [peerId] = useState(() =>
    typeof window !== 'undefined' ? getOrCreatePeerId() : `usr-${generateUUID().slice(0, 8)}`,
  );

  const signaling = useSignaling({ participantId: peerId, autoConnect: true });
  const statusColor = signaling.isConnecting
    ? 'bg-amber-400'
    : signaling.isConnected
      ? 'bg-emerald-400'
      : 'bg-rose-400';
  const statusLabel = signaling.isConnecting ? 'connecting…' : signaling.isConnected ? 'connected' : 'disconnected';

  const onGenerate = () => {
    if (roomInputRef.current) roomInputRef.current.value = generateUUID();
  };

  const onJoin = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const roomId = roomInputRef.current?.value.trim() ?? '';
    const displayName = nameInputRef.current?.value.trim() ?? '';
    if (!roomId || !displayName) return;

    sessionStorage.setItem(SS_DISPLAY_NAME, displayName);
    sessionStorage.setItem(SS_PEER_ID, peerId); // ensure peerId is persisted

    router.push(`/room/${encodeURIComponent(roomId)}`);
  };

  return (
    <main className="flex min-h-screen items-center justify-center px-4 py-12">
      <div className="w-full max-w-md space-y-6">
        {/* Brand */}
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-cyan-500/10 ring-1 ring-cyan-500/30">
            <Video size={20} className="text-cyan-400" />
          </div>
          <div>
            <h1 className="text-xl font-semibold tracking-tight text-slate-100">RTC Platform</h1>
            <p className="text-xs text-slate-500">Saniyeler içinde görüntülü arama başlat</p>
          </div>
        </div>

        {/* Form card */}
        <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-6 backdrop-blur">
          <form className="space-y-5" onSubmit={onJoin}>
            <div className="space-y-1.5">
              <label className="text-xs font-medium uppercase tracking-wider text-slate-400" htmlFor="room-id">
                Oda
              </label>
              <div className="flex gap-2">
                <input
                  ref={roomInputRef}
                  id="room-id"
                  defaultValue={initialRoomId}
                  className="min-w-0 flex-1 rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-slate-100 outline-none placeholder:text-slate-600 transition focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500"
                  placeholder="oda-id"
                  spellCheck={false}
                />
                <button
                  type="button"
                  onClick={onGenerate}
                  title="Yeni oda ID üret"
                  className="flex h-9 w-9 items-center justify-center rounded-lg border border-slate-700 text-slate-400 transition hover:border-slate-600 hover:bg-slate-800 hover:text-slate-200"
                >
                  <RefreshCw size={14} />
                </button>
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-medium uppercase tracking-wider text-slate-400" htmlFor="peer-id">
                Adınız
              </label>
              <input
                ref={nameInputRef}
                id="peer-id"
                defaultValue={savedName}
                className="w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-slate-100 outline-none placeholder:text-slate-600 transition focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500"
                placeholder="örn. Abdullah"
                autoComplete="nickname"
                spellCheck={false}
              />
            </div>

            <button
              type="submit"
              className="w-full rounded-lg bg-cyan-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-cyan-500"
            >
              Odaya Katıl
            </button>
          </form>
        </div>

        {/* Signaling status */}
        <div className="flex items-center gap-2 px-1 text-xs text-slate-500">
          <span className={`h-1.5 w-1.5 rounded-full ${statusColor}`} />
          <span>Signaling {statusLabel}</span>
          {signaling.error ? <span className="ml-auto text-rose-400">{signaling.error.message}</span> : null}
        </div>
      </div>
    </main>
  );
}
