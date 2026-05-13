import { env } from '@/config/env';
import { buildApp } from '@/core/app';
import { registerLifecycle } from '@/core/lifecycle';

async function bootstrap(): Promise<void> {
  const app = await buildApp();
  registerLifecycle(app);

  await app.listen({
    host: env.HOST,
    port: env.PORT,
  });

  app.log.info({ host: env.HOST, port: env.PORT }, 'api_started');
}

bootstrap().catch((error) => {
  console.error(error);
  process.exit(1);
});
