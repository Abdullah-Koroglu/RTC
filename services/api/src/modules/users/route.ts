import type { FastifyInstance } from 'fastify';
import { searchUserQuerySchema } from '@/modules/users/schema';
import { getUserById, getUserByEmail } from '@/modules/users/service';

export async function userRoutes(app: FastifyInstance): Promise<void> {
  // Returns the authenticated user's own profile
  app.get(
    '/users/me',
    { preHandler: [app.authenticateInternal] },
    async (request, reply) => {
      const user = await getUserById(app, request.internalUserId);
      if (!user) return reply.code(404).send({ code: 'NOT_FOUND', message: 'User not found' });
      return user;
    },
  );

  // Search a user by exact email (returns minimal public info)
  app.get(
    '/users/search',
    { preHandler: [app.authenticateInternal] },
    async (request, reply) => {
      const { email } = searchUserQuerySchema.parse(request.query);
      const user = await getUserByEmail(app, email);
      if (!user) return reply.code(404).send({ code: 'NOT_FOUND', message: 'No user found with that email' });
      // Don't expose the requester's own profile through search
      if (user.id === request.internalUserId) {
        return reply.code(400).send({ code: 'BAD_REQUEST', message: 'Cannot search yourself' });
      }
      return { id: user.id, email: user.email, displayName: user.displayName, avatarUrl: user.avatarUrl };
    },
  );
}
