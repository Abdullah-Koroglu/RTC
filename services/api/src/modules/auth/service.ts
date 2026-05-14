import type { FastifyInstance } from 'fastify';

export function issueToken(app: FastifyInstance, payload: { subject: string; role?: string }): { accessToken: string } {
  const accessToken = app.jwt.sign({ sub: payload.subject, role: payload.role });
  return { accessToken };
}
