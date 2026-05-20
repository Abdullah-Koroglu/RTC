import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { getServerEnv } from '@/lib/env';

function internalHeaders(secret: string, userId: string) {
  return { Authorization: `Bearer ${secret}`, 'x-user-id': userId, 'Content-Type': 'application/json' };
}

// GET /api/contacts — list accepted contacts
export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { API_INTERNAL_URL, INTERNAL_API_SECRET } = getServerEnv();
  const res = await fetch(`${API_INTERNAL_URL}/v1/contacts`, {
    headers: internalHeaders(INTERNAL_API_SECRET, session.user.id),
  });
  const data = await res.json() as unknown;
  return NextResponse.json(data, { status: res.status });
}

// POST /api/contacts — send a contact request
export async function POST(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const body = await req.json() as unknown;
  const { API_INTERNAL_URL, INTERNAL_API_SECRET } = getServerEnv();
  const res = await fetch(`${API_INTERNAL_URL}/v1/contacts/request`, {
    method: 'POST',
    headers: internalHeaders(INTERNAL_API_SECRET, session.user.id),
    body: JSON.stringify(body),
  });
  const data = await res.json() as unknown;
  return NextResponse.json(data, { status: res.status });
}
