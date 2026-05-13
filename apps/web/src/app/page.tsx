"use client";

import type { FormEvent } from 'react';
import { useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { getClientEnv } from '@/lib/env';
import { useSignaling } from '@/hooks/useSignaling';
import { generateUUID } from '@/lib/uuid';

export const dynamic = 'force-dynamic';

export default function HomePage() {
  const env = getClientEnv();
  const router = useRouter();
  const [roomId, setRoomId] = useState(() => generateUUID());
  const [peerId, setPeerId] = useState(() => `peer-${generateUUID().slice(0, 8)}`);

  const signaling = useSignaling({ participantId: peerId, autoConnect: true });
  const connectionStatus = useMemo(() => {
    if (signaling.isConnecting) {
      return 'Connecting';
    }
    return signaling.isConnected ? 'Connected' : 'Disconnected';
  }, [signaling.isConnected, signaling.isConnecting]);

  const onJoin = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const trimmedRoomId = roomId.trim();
    const trimmedPeerId = peerId.trim();
    if (!trimmedRoomId || !trimmedPeerId) {
      return;
    }

    router.push(`/room/${encodeURIComponent(trimmedRoomId)}?peerId=${encodeURIComponent(trimmedPeerId)}`);
  };

  return (
    <main className="min-h-screen bg-slate-950 text-slate-100">
      <div className="mx-auto flex w-full max-w-3xl flex-col gap-8 px-6 py-12">
        <header className="space-y-3">
          <h1 className="text-3xl font-bold tracking-tight">Realtime Communication Platform</h1>
          <p className="text-sm text-slate-300">Join a room to start local/remote media streaming.</p>
        </header>

        <section className="rounded-xl border border-slate-800 bg-slate-900/70 p-5">
          <form className="space-y-4" onSubmit={onJoin}>
            <div className="space-y-2">
              <label className="block text-sm font-medium" htmlFor="room-id">
                Room ID
              </label>
              <div className="flex gap-2">
                <input
                  className="w-full rounded-md border border-slate-700 bg-slate-950 px-3 py-2 text-sm outline-none ring-cyan-500 transition focus:ring-2"
                  id="room-id"
                  value={roomId}
                  onChange={(event) => setRoomId(event.target.value)}
                  placeholder="room-123"
                />
                <button
                  type="button"
                  onClick={() => setRoomId(generateUUID())}
                  className="rounded-md border border-slate-700 px-3 py-2 text-sm hover:bg-slate-800"
                >
                  Generate
                </button>
              </div>
            </div>

            <div className="space-y-2">
              <label className="block text-sm font-medium" htmlFor="peer-id">
                Display Name / Peer ID
              </label>
              <input
                className="w-full rounded-md border border-slate-700 bg-slate-950 px-3 py-2 text-sm outline-none ring-cyan-500 transition focus:ring-2"
                id="peer-id"
                value={peerId}
                onChange={(event) => setPeerId(event.target.value)}
                placeholder="alice"
              />
            </div>

            <button
              type="submit"
              className="w-full rounded-md bg-cyan-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-cyan-500"
            >
              Join Room
            </button>
          </form>
        </section>

        <section className="rounded-xl border border-slate-800 bg-slate-900/70 p-5 text-sm text-slate-300">
          <p>
            Signaling status:{' '}
            <span className={signaling.isConnected ? 'text-emerald-400' : 'text-amber-300'}>{connectionStatus}</span>
          </p>
          {signaling.error ? <p className="mt-2 text-rose-300">Error: {signaling.error.message}</p> : null}
          <div className="mt-4 space-y-1 text-xs text-slate-400">
            <p>API: {env.NEXT_PUBLIC_API_URL}</p>
            <p>Signaling: {env.NEXT_PUBLIC_SIGNALING_URL}</p>
            <p>Mediasoup: {env.NEXT_PUBLIC_MEDIASOUP_URL}</p>
          </div>
        </section>
      </div>
    </main>
  );
}
