import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { getServerEnv } from '@/lib/env';

function headers(secret: string, userId: string) {
  return { Authorization: `Bearer ${secret}`, 'x-user-id': userId, 'Content-Type': 'application/json' };
}

export async function GET(_req: Request, { params }: { params: { roomCode: string } }) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const { API_INTERNAL_URL, INTERNAL_API_SECRET } = getServerEnv();
  const res = await fetch(`${API_INTERNAL_URL}/v1/rooms/${params.roomCode}/invites`, {
    headers: headers(INTERNAL_API_SECRET, session.user.id),
  });
  return NextResponse.json(await res.json(), { status: res.status });
}

export async function POST(req: Request, { params }: { params: { roomCode: string } }) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const { API_INTERNAL_URL, INTERNAL_API_SECRET } = getServerEnv();
  const body = await req.json() as unknown;
  const res = await fetch(`${API_INTERNAL_URL}/v1/rooms/${params.roomCode}/invites`, {
    method: 'POST',
    headers: headers(INTERNAL_API_SECRET, session.user.id),
    body: JSON.stringify(body),
  });
  return NextResponse.json(await res.json(), { status: res.status });
}
