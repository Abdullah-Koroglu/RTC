import fp from 'fastify-plugin';
import jwt from '@fastify/jwt';
import { env } from '@/config/env';

declare module '@fastify/jwt' {
  interface FastifyJWT {
    payload: {
      sub: string;
      role?: string;
    };
    user: {
      sub: string;
      role?: string;
    };
  }
}

export const jwtPlugin = fp(async (app) => {
  await app.register(jwt, {
    secret: env.JWT_SECRET,
    sign: {
      expiresIn: env.JWT_EXPIRES_IN,
      issuer: 'rtc-api',
    },
  });

  app.decorate('authenticate', async (request, reply) => {
    try {
      await request.jwtVerify();
    } catch {
      return reply.code(401).send({ code: 'UNAUTHORIZED', message: 'Invalid or missing token' });
    }
  });
});

declare module 'fastify' {
  interface FastifyInstance {
    authenticate: (request: import('fastify').FastifyRequest, reply: import('fastify').FastifyReply) => Promise<void>;
  }
}
