import type { FastifyInstance } from 'fastify';
import { env } from '@/config/env';

export function registerLifecycle(app: FastifyInstance): void {
  let shuttingDown = false;

  const shutdown = async (signal: NodeJS.Signals): Promise<void> => {
    if (shuttingDown) {
      return;
    }
    shuttingDown = true;

    app.log.info({ signal }, 'shutdown_started');

    const forceExitTimeout = setTimeout(() => {
      app.log.error('shutdown_timeout_force_exit');
      process.exit(1);
    }, env.SHUTDOWN_GRACE_MS);

    try {
      await app.close();
      clearTimeout(forceExitTimeout);
      app.log.info('shutdown_completed');
      process.exit(0);
    } catch (error) {
      clearTimeout(forceExitTimeout);
      app.log.error({ err: error }, 'shutdown_failed');
      process.exit(1);
    }
  };

  process.on('SIGTERM', () => {
    void shutdown('SIGTERM');
  });

  process.on('SIGINT', () => {
    void shutdown('SIGINT');
  });
}
