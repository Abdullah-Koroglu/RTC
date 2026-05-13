import type { FastifyInstance } from 'fastify';
import { loginBodySchema } from '@/modules/auth/schema';
import { issueToken } from '@/modules/auth/service';

export async function authRoutes(app: FastifyInstance): Promise<void> {
  app.post(
    '/auth/login',
    {
      schema: {
        tags: ['auth'],
        body: {
          type: 'object',
          properties: {
            subject: { type: 'string' },
            role: { type: 'string' },
          },
          required: ['subject'],
        },
      },
    },
    async (request) => {
      const payload = loginBodySchema.parse(request.body);
      return issueToken(app, payload);
    },
  );

  app.get('/auth/me', { preHandler: [app.authenticate] }, async (request) => {
    return { user: request.user };
  });
}
