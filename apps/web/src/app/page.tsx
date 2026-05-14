'use client';

import type { FormEvent } from 'react';
import { useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { RefreshCw, Video } from 'lucide-react';
import { useSignaling } from '@/hooks/useSignaling';
import { generateUUID } from '@/lib/uuid';

export const dynamic = 'force-dynamic';

export default function HomePage() {
  const router = useRouter();

  // Uncontrolled inputs — Playwright fill() writes directly to DOM
  // without conflicting with React state during hydration.
  const roomInputRef = useRef<HTMLInputElement>(null);
  const peerInputRef = useRef<HTMLInputElement>(null);
  const [initialRoomId] = useState(() => generateUUID());
  const [initialPeerId] = useState(() => `peer-${generateUUID().slice(0, 8)}`);

  // Needed only for the signaling status indicator.
  const signaling = useSignaling({ participantId: initialPeerId, autoConnect: true });
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
    const peerId = peerInputRef.current?.value.trim() ?? '';
    if (!roomId || !peerId) return;
    router.push(`/room/${encodeURIComponent(roomId)}?peerId=${encodeURIComponent(peerId)}`);
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
            <p className="text-xs text-slate-500">Start a video call in seconds</p>
          </div>
        </div>

        {/* Form card */}
        <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-6 backdrop-blur">
          <form className="space-y-5" onSubmit={onJoin}>
            <div className="space-y-1.5">
              <label className="text-xs font-medium uppercase tracking-wider text-slate-400" htmlFor="room-id">
                Room
              </label>
              <div className="flex gap-2">
                <input
                  ref={roomInputRef}
                  id="room-id"
                  defaultValue={initialRoomId}
                  className="min-w-0 flex-1 rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-slate-100 outline-none placeholder:text-slate-600 transition focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500"
                  placeholder="room-id"
                  spellCheck={false}
                />
                <button
                  type="button"
                  onClick={onGenerate}
                  title="Generate new room ID"
                  className="flex h-9 w-9 items-center justify-center rounded-lg border border-slate-700 text-slate-400 transition hover:border-slate-600 hover:bg-slate-800 hover:text-slate-200"
                >
                  <RefreshCw size={14} />
                </button>
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-medium uppercase tracking-wider text-slate-400" htmlFor="peer-id">
                Your name
              </label>
              <input
                ref={peerInputRef}
                id="peer-id"
                defaultValue={initialPeerId}
                className="w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-slate-100 outline-none placeholder:text-slate-600 transition focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500"
                placeholder="alice"
                spellCheck={false}
              />
            </div>

            <button
              type="submit"
              className="w-full rounded-lg bg-cyan-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-cyan-500"
            >
              Join Room
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
