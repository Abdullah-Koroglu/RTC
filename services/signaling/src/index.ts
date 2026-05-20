import { z } from 'zod';
import { env } from '@/config/env';
import { buildApp } from '@/core/app';
import { registerLifecycle } from '@/core/lifecycle';
import { WebSocketGateway } from '@/websocket/gateway';
import { RoomManager } from '@/rooms/room-manager';
import { RedisManager } from '@/redis/manager';

async function bootstrap(): Promise<void> {
  const app = buildApp();

  const redisClient = env.REDIS_ENABLED ? RedisManager.getInstance().getPooledClient('rooms') : null;
  const roomManager = new RoomManager(redisClient);
  const gateway = new WebSocketGateway(app, roomManager);

  await gateway.start();
  registerLifecycle(app, gateway);

  // Internal endpoint for mediasoup to notify signaling when a peer is gone via ICE
  app.post('/internal/peer-gone', async (request, reply) => {
    const body = z.object({ roomId: z.string().min(1), peerId: z.string().min(1) }).parse(request.body);
    await gateway.handlePeerGoneNotification(body.roomId, body.peerId);
    return reply.send({ ok: true });
  });

  app.post('/internal/producer-new', async (request, reply) => {
    const body = z.object({
      roomId: z.string().min(1),
      peerId: z.string().min(1),
      producerId: z.string().min(1),
      kind: z.enum(['audio', 'video']),
    }).parse(request.body);
    await gateway.handleProducerNew(body.roomId, body.peerId, body.producerId, body.kind);
    return reply.send({ ok: true });
  });

  app.post('/internal/producer-closed', async (request, reply) => {
    const body = z.object({
      roomId: z.string().min(1),
      peerId: z.string().min(1),
      producerId: z.string().min(1),
    }).parse(request.body);
    await gateway.handleProducerClosed(body.roomId, body.peerId, body.producerId);
    return reply.send({ ok: true });
  });

  // REST endpoint to query current room participants
  app.get<{ Params: { roomId: string } }>('/rooms/:roomId/participants', async (request) => ({
    participants: await roomManager.getParticipants(request.params.roomId),
  }));

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
