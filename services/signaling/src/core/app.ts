import Fastify, { type FastifyInstance } from 'fastify';
import { env } from '@/config/env';
import { logger } from '@/core/logger';

export function buildApp(): FastifyInstance {
  const app = Fastify({
    loggerInstance: logger,
    disableRequestLogging: true,
    bodyLimit: env.MAX_PAYLOAD_BYTES,
    trustProxy: true,
  });

  app.get('/health', async () => ({
    status: 'ok',
    uptimeSeconds: Math.floor(process.uptime()),
    nodeEnv: env.NODE_ENV,
  }));

  return app;
}
