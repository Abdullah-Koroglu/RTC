import { env } from '@/config/env';
import { buildApp } from '@/core/app';
import { registerLifecycle } from '@/core/lifecycle';
import { WebSocketGateway } from '@/websocket/gateway';

async function bootstrap(): Promise<void> {
  const app = buildApp();
  const gateway = new WebSocketGateway(app);

  await gateway.start();
  registerLifecycle(app, gateway);

  await app.listen({
    host: env.HOST,
    port: env.PORT,
  });

  app.log.info({ host: env.HOST, port: env.PORT }, 'signaling_started');
}

bootstrap().catch((error) => {
  console.error(error);
  process.exit(1);
});
