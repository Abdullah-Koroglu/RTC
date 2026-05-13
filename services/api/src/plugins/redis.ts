import fp from 'fastify-plugin';
import Redis from 'ioredis';
import { env } from '@/config/env';

export const redisPlugin = fp(async (app) => {
  if (!env.REDIS_ENABLED) {
    app.log.info('redis_disabled_using_inprocess_fallback');
    app.decorate(
      'redis',
      {
        ping: async () => 'PONG',
        quit: async () => 'OK',
      } as unknown as Redis,
    );
    return;
  }

  const redis = new Redis(env.REDIS_URL, {
    maxRetriesPerRequest: 2,
    enableReadyCheck: true,
    lazyConnect: true,
  });

  redis.on('error', (error) => {
    app.log.warn({ err: error }, 'redis_runtime_error');
  });

  await redis.connect();

  app.decorate('redis', redis);

  app.addHook('onClose', async () => {
    await redis.quit();
  });
});

declare module 'fastify' {
  interface FastifyInstance {
    redis: Redis;
  }
}
