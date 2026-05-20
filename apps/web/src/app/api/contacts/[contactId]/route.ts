import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { getServerEnv } from '@/lib/env';

// DELETE /api/contacts/[contactId]
export async function DELETE(
  _req: Request,
  { params }: { params: { contactId: string } },
) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { API_INTERNAL_URL, INTERNAL_API_SECRET } = getServerEnv();
  const res = await fetch(`${API_INTERNAL_URL}/v1/contacts/${params.contactId}`, {
    method: 'DELETE',
    headers: {
      Authorization: `Bearer ${INTERNAL_API_SECRET}`,
      'x-user-id': session.user.id,
    },
  });

  return new NextResponse(null, { status: res.status });
}
