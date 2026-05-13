import { env } from '@/config/env';
import { buildApp } from '@/core/app';
import { registerLifecycle } from '@/core/lifecycle';
import { RoomManager } from '@/rooms/room-manager';
import { WorkerManager } from '@/workers/worker-manager';

async function bootstrap(): Promise<void> {
  const workerManager = new WorkerManager();
  await workerManager.bootstrap();

  const roomManager = new RoomManager(workerManager);
  const app = buildApp({
    workerManager,
    roomManager,
  });

  registerLifecycle(app, roomManager, workerManager);

  await app.listen({
    host: env.HOST,
    port: env.PORT,
  });

  app.log.info(
    {
      host: env.HOST,
      port: env.PORT,
      workerCount: workerManager.getSnapshots().length,
    },
    'mediasoup_service_started',
  );
}

bootstrap().catch((error) => {
  console.error(error);
  process.exit(1);
});
