import type { FastifyInstance } from 'fastify';
import { createUserBodySchema } from '@/modules/users/schema';
import { createUser } from '@/modules/users/service';

export async function userRoutes(app: FastifyInstance): Promise<void> {
  app.post(
    '/users',
    {
      preHandler: [app.authenticate],
      schema: {
        tags: ['users'],
        body: {
          type: 'object',
          properties: {
            email: { type: 'string', format: 'email' },
            displayName: { type: 'string', minLength: 2, maxLength: 50 },
          },
          required: ['email', 'displayName'],
        },
      },
    },
    async (request) => {
      const payload = createUserBodySchema.parse(request.body);
      return createUser(app, payload);
    },
  );
}
