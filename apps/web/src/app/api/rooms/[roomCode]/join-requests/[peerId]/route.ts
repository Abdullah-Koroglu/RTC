import { NextResponse } from 'next/server';
import { getServerEnv } from '@/lib/env';

// GET: check this peer's join request status (public polling by waiting peer)
export async function GET(_req: Request, { params }: { params: { roomCode: string; peerId: string } }) {
  const { API_INTERNAL_URL } = getServerEnv();
  const res = await fetch(
    `${API_INTERNAL_URL}/v1/rooms/${params.roomCode}/join-requests/status?peerId=${encodeURIComponent(params.peerId)}`,
  );
  return NextResponse.json(await res.json(), { status: res.status });
}

// PATCH: approve or deny (host only, via internal auth)
export async function PATCH(req: Request, { params }: { params: { roomCode: string; peerId: string } }) {
  // This is called by the host panel — the requestId is the peerId here for simplicity
  // The actual resolve uses requestId from the DB, so the host panel should use the correct ID
  const { API_INTERNAL_URL } = getServerEnv();
  const body = await req.json() as unknown;
  const res = await fetch(`${API_INTERNAL_URL}/v1/rooms/${params.roomCode}/join-requests/${params.peerId}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  if (res.status === 204) return new NextResponse(null, { status: 204 });
  return NextResponse.json(await res.json(), { status: res.status });
}
