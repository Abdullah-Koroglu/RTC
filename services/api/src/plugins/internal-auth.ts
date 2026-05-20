import fp from 'fastify-plugin';
import type { FastifyInstance, FastifyReply, FastifyRequest } from 'fastify';
import { env } from '@/config/env';

export const internalAuthPlugin = fp(async (app: FastifyInstance) => {
  app.decorate(
    'authenticateInternal',
    async (request: FastifyRequest, reply: FastifyReply) => {
      const auth = request.headers['authorization'];
      const userId = request.headers['x-user-id'];

      if (!auth || auth !== `Bearer ${env.INTERNAL_API_SECRET}`) {
        return reply.code(401).send({ code: 'UNAUTHORIZED', message: 'Invalid internal secret' });
      }

      if (!userId || typeof userId !== 'string') {
        return reply.code(400).send({ code: 'BAD_REQUEST', message: 'x-user-id header required' });
      }

      request.internalUserId = userId;
    },
  );
});

declare module 'fastify' {
  interface FastifyInstance {
    authenticateInternal: (request: FastifyRequest, reply: FastifyReply) => Promise<void>;
  }
  interface FastifyRequest {
    internalUserId: string;
  }
}
