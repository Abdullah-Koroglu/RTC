import fp from 'fastify-plugin';
import helmet from '@fastify/helmet';
import cors from '@fastify/cors';
import rateLimit from '@fastify/rate-limit';
import sensible from '@fastify/sensible';
import { env } from '@/config/env';

export const appPlugin = fp(async (app) => {
  await app.register(sensible);

  await app.register(helmet, {
    contentSecurityPolicy: false,
    global: true,
  });

  await app.register(cors, {
    origin: env.CORS_ORIGIN.split(',').map((item) => item.trim()),
    credentials: true,
  });

  await app.register(rateLimit, {
    max: env.RATE_LIMIT_MAX,
    timeWindow: env.RATE_LIMIT_WINDOW,
    errorResponseBuilder: (_request, context) => ({
      code: 'RATE_LIMITED',
      error: 'Too Many Requests',
      message: `Rate limit exceeded, retry in ${context.after}`,
      statusCode: 429,
    }),
  });
});
