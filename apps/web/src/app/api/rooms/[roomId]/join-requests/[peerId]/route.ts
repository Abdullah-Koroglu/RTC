import { NextResponse } from 'next/server';
import { getServerEnv } from '@/lib/env';

export async function GET(_req: Request, { params }: { params: { roomId: string; peerId: string } }) {
  const { API_INTERNAL_URL } = getServerEnv();
  const res = await fetch(
    `${API_INTERNAL_URL}/v1/rooms/${params.roomId}/join-requests/status?peerId=${encodeURIComponent(params.peerId)}`,
  );
  return NextResponse.json(await res.json(), { status: res.status });
}

export async function PATCH(req: Request, { params }: { params: { roomId: string; peerId: string } }) {
  const { API_INTERNAL_URL } = getServerEnv();
  const body = await req.json() as unknown;
  const res = await fetch(`${API_INTERNAL_URL}/v1/rooms/${params.roomId}/join-requests/${params.peerId}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  if (res.status === 204) return new NextResponse(null, { status: 204 });
  return NextResponse.json(await res.json(), { status: res.status });
}
