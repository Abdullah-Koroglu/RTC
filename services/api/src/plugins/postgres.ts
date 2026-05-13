import fp from 'fastify-plugin';
import { Pool } from 'pg';
import { env } from '@/config/env';

export const postgresPlugin = fp(async (app) => {
  if (!env.DATABASE_ENABLED) {
    app.log.info('postgres_disabled_using_inprocess_fallback');
    app.decorate(
      'db',
      {
        query: async () => ({
          rows: [],
          rowCount: 0,
        }),
        end: async () => undefined,
      } as unknown as Pool,
    );
    return;
  }

  const pool = new Pool({
    connectionString: env.DATABASE_URL,
    max: 20,
    idleTimeoutMillis: 30000,
    connectionTimeoutMillis: 5000,
    ssl: env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,
  });

  await pool.query('SELECT 1');

  app.decorate('db', pool);

  app.addHook('onClose', async () => {
    await pool.end();
  });
});

declare module 'fastify' {
  interface FastifyInstance {
    db: Pool;
  }
}
