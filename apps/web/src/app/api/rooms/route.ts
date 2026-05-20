import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { getServerEnv } from '@/lib/env';

export async function POST(req: Request) {
  const session = await getServerSession(authOptions);
  const { API_INTERNAL_URL, INTERNAL_API_SECRET } = getServerEnv();

  const body = await req.json() as unknown;
  const res = await fetch(`${API_INTERNAL_URL}/v1/rooms`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${INTERNAL_API_SECRET}`,
      'x-user-id': session?.user?.id ?? 'anonymous',
    },
    body: JSON.stringify(body),
  });
  const data = await res.json() as unknown;
  return NextResponse.json(data, { status: res.status });
}
