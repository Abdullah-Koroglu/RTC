import { jwtVerify } from 'jose';
import { env } from '@/config/env';
import type { AuthContext } from '@/types/connection';

const secret = new TextEncoder().encode(env.JWT_SECRET);

export async function authenticateToken(token: string): Promise<AuthContext> {
  const { payload } = await jwtVerify(token, secret, {
    algorithms: ['HS256'],
  });

  const participantId = String(payload.sub ?? '').trim();

  if (!participantId) {
    throw new Error('Invalid token subject');
  }

  return {
    participantId,
    sessionId: typeof payload.sid === 'string' ? payload.sid : undefined,
    role: typeof payload.role === 'string' ? payload.role : undefined,
  };
}
