import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { getServerEnv } from '@/lib/env';

export async function GET(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  const email = searchParams.get('email');
  if (!email) {
    return NextResponse.json({ error: 'email query param required' }, { status: 400 });
  }

  const { API_INTERNAL_URL, INTERNAL_API_SECRET } = getServerEnv();
  const res = await fetch(
    `${API_INTERNAL_URL}/v1/users/search?email=${encodeURIComponent(email)}`,
    {
      headers: {
        Authorization: `Bearer ${INTERNAL_API_SECRET}`,
        'x-user-id': session.user.id,
      },
    },
  );

  const data = await res.json() as unknown;
  return NextResponse.json(data, { status: res.status });
}
