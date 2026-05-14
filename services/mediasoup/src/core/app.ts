import Fastify, { type FastifyInstance } from 'fastify';
import cors from '@fastify/cors';
import { env } from '@/config/env';
import { logger } from '@/core/logger';
import { registerRoutes } from '@/routes';
import type { RoomManager } from '@/rooms/room-manager';
import type { WorkerManager } from '@/workers/worker-manager';

export interface AppContext {
  workerManager: WorkerManager;
  roomManager: RoomManager;
}

export function buildApp(ctx: AppContext): FastifyInstance {
  const app = Fastify({
    loggerInstance: logger,
    disableRequestLogging: true,
    trustProxy: true,
    bodyLimit: 2 * 1024 * 1024,
  });

  // Register CORS
  void app.register(cors, {
    origin: [
      'http://app.local.rtc',
      'https://app.local.rtc',
      'http://localhost:3000',
      'https://localhost:3000',
      process.env.CORS_ORIGIN ?? '',
      process.env.ALLOWED_ORIGINS ?? '',
    ]
      .flatMap((value) => value.split(','))
      .map((value) => value.trim())
      .filter(Boolean),
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    credentials: true,
  });

  app.get('/health', () => ({
    status: 'ok',
    uptimeSeconds: Math.floor(process.uptime()),
    workers: ctx.workerManager.getSnapshots(),
  }));

  app.get('/ready', async (_req, reply) => {
    if (!ctx.workerManager.hasHealthyWorkers()) {
      return reply.status(503).send({
        status: 'degraded',
        reason: 'no_healthy_workers',
      });
    }

    return reply.send({
      status: 'ready',
      workers: ctx.workerManager.getSnapshots().length,
      rooms: ctx.roomManager.getStats().roomCount,
    });
  });

  app.get('/metrics', async (_req, reply) => {
    const stats = ctx.roomManager.getStats();
    const workerCount = ctx.workerManager.getSnapshots().length;

    reply.type('text/plain; version=0.0.4');
    return [
      '# HELP mediasoup_rooms_total Active mediasoup rooms',
      '# TYPE mediasoup_rooms_total gauge',
      `mediasoup_rooms_total ${stats.roomCount}`,
      '# HELP mediasoup_peers_total Active mediasoup peers',
      '# TYPE mediasoup_peers_total gauge',
      `mediasoup_peers_total ${stats.peerCount}`,
      '# HELP mediasoup_producers_total Active mediasoup producers',
      '# TYPE mediasoup_producers_total gauge',
      `mediasoup_producers_total ${stats.producerCount}`,
      '# HELP mediasoup_consumers_total Active mediasoup consumers',
      '# TYPE mediasoup_consumers_total gauge',
      `mediasoup_consumers_total ${stats.consumerCount}`,
      '# HELP mediasoup_workers_total Active mediasoup workers',
      '# TYPE mediasoup_workers_total gauge',
      `mediasoup_workers_total ${workerCount}`,
    ].join('\n');
  });

  registerRoutes(app, ctx);

  app.log.info({ nodeEnv: env.NODE_ENV }, 'mediasoup_http_ready');
  return app;
}
