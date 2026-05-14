import fp from 'fastify-plugin';
import helmet from '@fastify/helmet';
import cors from '@fastify/cors';
import rateLimit from '@fastify/rate-limit';
import sensible from '@fastify/sensible';
import { env } from '@/config/env';

function buildAllowedOrigins(input: string): string[] {
  const configured = input
    .split(',')
    .map((item) => item.trim())
    .filter(Boolean);

  const origins = new Set<string>(configured);
  origins.add('http://app.local.rtc');
  origins.add('https://app.local.rtc');

  for (const origin of configured) {
    if (origin.startsWith('http://')) {
      origins.add(`https://${origin.slice('http://'.length)}`);
    }
    if (origin.startsWith('https://')) {
      origins.add(`http://${origin.slice('https://'.length)}`);
    }
  }

  return Array.from(origins);
}

export const appPlugin = fp(async (app) => {
  const allowedOrigins = buildAllowedOrigins(env.CORS_ORIGIN);

  await app.register(sensible);

  await app.register(helmet, {
    contentSecurityPolicy: false,
    global: true,
  });

  await app.register(cors, {
    origin: allowedOrigins,
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
