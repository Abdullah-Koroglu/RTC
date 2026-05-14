import type { FastifyInstance } from 'fastify';
import { loginBodySchema } from '@/modules/auth/schema';
import { issueToken } from '@/modules/auth/service';

export function authRoutes(app: FastifyInstance): void {
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
          anyOf: [
            { required: ['subject'] },
            { required: ['peerId'] },
          ],
        },
      },
    },
    (request) => {
      try {
        const payload = loginBodySchema.parse(request.body);
        const subject = payload.subject ?? payload.peerId;

        if (!subject) {
          throw new Error('subject or peerId is required');
        }

        return issueToken(app, { subject, role: payload.role });
      } catch (error) {
        request.log.error(
          {
            err: error,
            body: request.body,
          },
          'auth_login_failed',
        );
        throw error;
      }
    },
  );

  app.get('/auth/me', { preHandler: [app.authenticate] }, (request) => {
    return { user: request.user };
  });
}
