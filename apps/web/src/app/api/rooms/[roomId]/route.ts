import { NextResponse } from 'next/server';
import { getServerEnv } from '@/lib/env';

export async function GET(_req: Request, { params }: { params: { roomId: string } }) {
  const { API_INTERNAL_URL } = getServerEnv();
  const res = await fetch(`${API_INTERNAL_URL}/v1/rooms/${params.roomId}`);
  const data = await res.json() as unknown;
  return NextResponse.json(data, { status: res.status });
}
