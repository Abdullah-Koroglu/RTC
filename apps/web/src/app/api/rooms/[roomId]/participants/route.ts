import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { getServerEnv } from '@/lib/env';

export async function GET(
  _req: Request,
  { params }: { params: { roomId: string } },
) {
  const session = await getServerSession(authOptions);
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { SIGNALING_INTERNAL_URL } = getServerEnv();
  const res = await fetch(`${SIGNALING_INTERNAL_URL}/rooms/${params.roomId}/participants`);
  const data = await res.json() as unknown;
  return NextResponse.json(data);
}
