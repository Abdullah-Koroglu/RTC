import type { FastifyInstance } from 'fastify';
import { appPlugin } from '@/plugins/app';
import { jwtPlugin } from '@/plugins/jwt';
import { redisPlugin } from '@/plugins/redis';
import { postgresPlugin } from '@/plugins/postgres';
import { errorHandlerPlugin } from '@/plugins/error-handler';
import { websocketPlugin } from '@/plugins/websocket';

export async function registerPlugins(app: FastifyInstance): Promise<void> {
  await app.register(appPlugin);
  await app.register(jwtPlugin);
  await app.register(redisPlugin);
  await app.register(postgresPlugin);
  await app.register(websocketPlugin);
  await app.register(errorHandlerPlugin);
}
