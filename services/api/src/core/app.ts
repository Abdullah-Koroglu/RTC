import Fastify, { type FastifyInstance } from 'fastify';
import { logger } from '@/core/logger';
import { registerPlugins } from '@/plugins';
import { registerRoutes } from '@/routes';
import { SERVICE_NAME, SERVICE_VERSION } from '@/config/constants';

export async function buildApp(): Promise<FastifyInstance> {
  const app = Fastify({
    loggerInstance: logger,
    trustProxy: true,
    requestIdHeader: 'x-request-id',
    requestIdLogLabel: 'requestId',
    ajv: {
      customOptions: {
        removeAdditional: true,
        useDefaults: true,
        coerceTypes: true,
      },
    },
  });

  await registerPlugins(app);
  await registerRoutes(app);

  app.get('/_meta', async () => ({
    service: SERVICE_NAME,
    version: SERVICE_VERSION,
  }));

  return app;
}
