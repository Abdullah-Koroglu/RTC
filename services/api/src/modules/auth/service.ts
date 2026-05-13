import type { FastifyInstance } from 'fastify';
import type { LoginBody } from '@/modules/auth/schema';

export async function issueToken(app: FastifyInstance, payload: LoginBody): Promise<{ accessToken: string }> {
  const accessToken = await app.jwt.sign({ sub: payload.subject, role: payload.role });
  return { accessToken };
}
