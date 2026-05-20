import type { FastifyInstance } from 'fastify';
import { loginBodySchema, registerBodySchema, verifyPasswordBodySchema, upsertOAuthUserBodySchema } from '@/modules/auth/schema';
import { issueToken, registerUser, verifyPassword, upsertOAuthUser } from '@/modules/auth/service';

export function authRoutes(app: FastifyInstance): void {
  // Issues a short-lived JWT for room/media operations (peerId-based)
  app.post(
    '/auth/login',
    {
      schema: {
        tags: ['auth'],
        body: {
          type: 'object',
          properties: {
            subject: { type: 'string' },
            peerId: { type: 'string' },
            roomId: { type: 'string' },
            role: { type: 'string' },
          },
          anyOf: [{ required: ['subject'] }, { required: ['peerId'] }],
        },
      },
    },
    (request) => {
      const payload = loginBodySchema.parse(request.body);
      const subject = payload.subject ?? payload.peerId;
      if (!subject) throw new Error('subject or peerId is required');
      return issueToken(app, { subject, ...(payload.role ? { role: payload.role } : {}) });
    },
  );

  app.get('/auth/me', { preHandler: [app.authenticate] }, (request) => {
    return { user: request.user };
  });

  // Public: register with email + password
  app.post('/auth/register', async (request, reply) => {
    const body = registerBodySchema.parse(request.body);
    try {
      const user = await registerUser(app, body);
      return reply.code(201).send(user);
    } catch (err: unknown) {
      if (err instanceof Error && (err as NodeJS.ErrnoException & { statusCode?: number }).statusCode === 409) {
        return reply.code(409).send({ code: 'EMAIL_TAKEN', message: err.message });
      }
      throw err;
    }
  });

  // Public: verify email + password (called by NextAuth CredentialsProvider)
  app.post('/auth/verify-password', async (request, reply) => {
    const body = verifyPasswordBodySchema.parse(request.body);
    const user = await verifyPassword(app, body);
    if (!user) {
      return reply.code(401).send({ code: 'INVALID_CREDENTIALS', message: 'Invalid email or password' });
    }
    return user;
  });

  // Internal: upsert OAuth user (called from NextAuth signIn callback)
  app.post(
    '/auth/upsert-oauth-user',
    { preHandler: [app.authenticateInternal] },
    async (request) => {
      const body = upsertOAuthUserBodySchema.parse(request.body);
      return upsertOAuthUser(app, body);
    },
  );
}
