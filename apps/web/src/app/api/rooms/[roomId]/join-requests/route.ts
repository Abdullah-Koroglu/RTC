import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { getServerEnv } from '@/lib/env';

export async function GET(_req: Request, { params }: { params: { roomId: string } }) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const { API_INTERNAL_URL, INTERNAL_API_SECRET } = getServerEnv();
  const res = await fetch(`${API_INTERNAL_URL}/v1/rooms/${params.roomId}/join-requests`, {
    headers: { Authorization: `Bearer ${INTERNAL_API_SECRET}`, 'x-user-id': session.user.id },
  });
  return NextResponse.json(await res.json(), { status: res.status });
}

export async function POST(req: Request, { params }: { params: { roomId: string } }) {
  const { API_INTERNAL_URL } = getServerEnv();
  const body = await req.json() as unknown;
  const res = await fetch(`${API_INTERNAL_URL}/v1/rooms/${params.roomId}/join-requests`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  return NextResponse.json(await res.json(), { status: res.status });
}
