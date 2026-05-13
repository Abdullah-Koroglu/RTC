import type { FastifyInstance } from 'fastify';
import { healthSchema } from '@/modules/health/schema';
import { getHealthStatus } from '@/modules/health/service';

export async function healthRoutes(app: FastifyInstance): Promise<void> {
  app.get('/health', { schema: healthSchema }, async () => getHealthStatus(app));
}
