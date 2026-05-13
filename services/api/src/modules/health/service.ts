import type { FastifyInstance } from 'fastify';

export async function getHealthStatus(app: FastifyInstance): Promise<{
  status: 'ok';
  uptimeSeconds: number;
  timestamp: string;
  redis: 'up' | 'down';
  postgres: 'up' | 'down';
}> {
  const redis = await app.redis.ping().then(() => 'up' as const).catch(() => 'down' as const);
  const postgres = await app.db.query('SELECT 1').then(() => 'up' as const).catch(() => 'down' as const);

  return {
    status: 'ok',
    uptimeSeconds: Math.floor(process.uptime()),
    timestamp: new Date().toISOString(),
    redis,
    postgres,
  };
}
