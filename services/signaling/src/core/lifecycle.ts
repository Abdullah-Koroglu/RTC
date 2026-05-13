import { env } from '@/config/env';
import type { FastifyInstance } from 'fastify';
import type { WebSocketGateway } from '@/websocket/gateway';

export function registerLifecycle(app: FastifyInstance, gateway: WebSocketGateway): void {
  let closing = false;

  const shutdown = async (signal: NodeJS.Signals): Promise<void> => {
    if (closing) {
      return;
    }
    closing = true;

    app.log.info({ signal }, 'shutdown_started');

    const timeout = setTimeout(() => {
      app.log.error('shutdown_timeout');
      process.exit(1);
    }, env.SHUTDOWN_GRACE_MS);

    try {
      await gateway.close();
      await app.close();
      clearTimeout(timeout);
      app.log.info('shutdown_complete');
      process.exit(0);
    } catch (error) {
      clearTimeout(timeout);
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
