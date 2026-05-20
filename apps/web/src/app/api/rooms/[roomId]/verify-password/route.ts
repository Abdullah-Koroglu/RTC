import { NextResponse } from 'next/server';
import { getServerEnv } from '@/lib/env';

export async function POST(req: Request, { params }: { params: { roomId: string } }) {
  const { API_INTERNAL_URL } = getServerEnv();
  const body = await req.json() as unknown;
  const res = await fetch(`${API_INTERNAL_URL}/v1/rooms/${params.roomId}/verify-password`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  const data = await res.json() as unknown;
  return NextResponse.json(data, { status: res.status });
}
