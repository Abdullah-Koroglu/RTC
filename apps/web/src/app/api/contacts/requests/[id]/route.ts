import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { getServerEnv } from '@/lib/env';

// PATCH /api/contacts/requests/[id] — accept or reject
export async function PATCH(
  req: Request,
  { params }: { params: { id: string } },
) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const body = await req.json() as unknown;
  const { API_INTERNAL_URL, INTERNAL_API_SECRET } = getServerEnv();
  const res = await fetch(`${API_INTERNAL_URL}/v1/contacts/requests/${params.id}`, {
    method: 'PATCH',
    headers: {
      Authorization: `Bearer ${INTERNAL_API_SECRET}`,
      'x-user-id': session.user.id,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(body),
  });

  if (res.status === 204) return new NextResponse(null, { status: 204 });
  const data = await res.json() as unknown;
  return NextResponse.json(data, { status: res.status });
}
