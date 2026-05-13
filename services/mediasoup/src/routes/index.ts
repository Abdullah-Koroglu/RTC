import type { FastifyInstance } from 'fastify';
import { z } from 'zod';
import type { AppContext } from '@/core/app';

const roomPeerParams = z.object({
  roomId: z.string().min(1),
  peerId: z.string().min(1),
});

export function registerRoutes(app: FastifyInstance, ctx: AppContext): void {
  app.post('/rooms/:roomId/peers/:peerId/join', async (request) => {
    const params = roomPeerParams.parse(request.params);
    return ctx.roomManager.joinRoom(params.roomId, params.peerId);
  });

  app.post('/rooms/:roomId/peers/:peerId/transports', async (request) => {
    const params = roomPeerParams.parse(request.params);
    const body = z.object({ appData: z.record(z.unknown()).optional() }).parse(request.body);

    return ctx.roomManager.createTransport({
      roomId: params.roomId,
      peerId: params.peerId,
      appData: body.appData,
    });
  });

  app.post('/rooms/:roomId/peers/:peerId/transports/:transportId/connect', async (request) => {
    const params = z.object({
      roomId: z.string().min(1),
      peerId: z.string().min(1),
      transportId: z.string().min(1),
    }).parse(request.params);

    const body = z.object({
      dtlsParameters: z.unknown(),
    }).parse(request.body);

    await ctx.roomManager.connectTransport(params.roomId, params.peerId, params.transportId, {
      dtlsParameters: body.dtlsParameters as never,
    });

    return { ok: true };
  });

  app.post('/rooms/:roomId/peers/:peerId/producers', async (request) => {
    const params = roomPeerParams.parse(request.params);
    const body = z
      .object({
        transportId: z.string().min(1),
        kind: z.enum(['audio', 'video']),
        rtpParameters: z.unknown(),
        appData: z.record(z.unknown()).optional(),
      })
      .parse(request.body);

    return ctx.roomManager.createProducer({
      roomId: params.roomId,
      peerId: params.peerId,
      transportId: body.transportId,
      kind: body.kind,
      rtpParameters: body.rtpParameters as never,
      appData: body.appData,
    });
  });

  app.post('/rooms/:roomId/peers/:peerId/consumers', async (request) => {
    const params = roomPeerParams.parse(request.params);
    const body = z
      .object({
        producerId: z.string().min(1),
        rtpCapabilities: z.unknown(),
        appData: z.record(z.unknown()).optional(),
      })
      .parse(request.body);

    return ctx.roomManager.createConsumer({
      roomId: params.roomId,
      peerId: params.peerId,
      producerId: body.producerId,
      rtpCapabilities: body.rtpCapabilities as never,
      appData: body.appData,
    });
  });

  app.get('/rooms/:roomId/peers/:peerId/producers', async (request) => {
    const params = roomPeerParams.parse(request.params);
    return {
      producers: ctx.roomManager.listRemoteProducers(params.roomId, params.peerId),
    };
  });

  app.delete('/rooms/:roomId/peers/:peerId', async (request) => {
    const params = roomPeerParams.parse(request.params);
    ctx.roomManager.disconnectPeer(params.roomId, params.peerId);
    return { ok: true };
  });
}
