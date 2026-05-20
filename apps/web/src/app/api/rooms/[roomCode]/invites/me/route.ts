import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { getServerEnv } from '@/lib/env';

export async function GET(_req: Request, { params }: { params: { roomCode: string } }) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return NextResponse.json({ invited: false });
  const { API_INTERNAL_URL, INTERNAL_API_SECRET } = getServerEnv();
  const res = await fetch(`${API_INTERNAL_URL}/v1/rooms/${params.roomCode}/invites/me`, {
    headers: { Authorization: `Bearer ${INTERNAL_API_SECRET}`, 'x-user-id': session.user.id },
  });
  const data = await res.json() as unknown;
  return NextResponse.json(data, { status: res.status });
}
