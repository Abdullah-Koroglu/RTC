import { logger } from '@/core/logger';
import { env } from '@/config/env';
import type { Router, Worker, WorkerId } from '@/types/mediasoup';
import type { WorkerManager } from '@/workers/worker-manager';

interface RoomRouter {
  router: Router;
  workerId: WorkerId;
}

export class RouterManager {
  private readonly routers = new Map<string, RoomRouter>();

  constructor(private readonly workerManager: WorkerManager) {}

  async getOrCreate(roomId: string): Promise<RoomRouter> {
    const existing = this.routers.get(roomId);
    if (existing && !existing.router.closed) {
      return existing;
    }

    const worker = this.workerManager.assignWorkerForRoom(roomId);
    const router = await worker.createRouter({
      mediaCodecs: env.MEDIASOUP_ROUTER_CODECS,
    });

    const assignedWorkerId = this.workerManager.getAssignedWorkerId(roomId);
    if (!assignedWorkerId) {
      throw new Error('Missing worker assignment for room');
    }

    const value: RoomRouter = {
      router,
      workerId: assignedWorkerId,
    };

    this.routers.set(roomId, value);

    logger.info({ roomId, workerId: assignedWorkerId }, 'router_created');
    return value;
  }

  get(roomId: string): RoomRouter | undefined {
    return this.routers.get(roomId);
  }

  async migrateRoomToWorker(roomId: string, worker: Worker, newWorkerId: WorkerId): Promise<void> {
    const existing = this.routers.get(roomId);
    if (existing?.router && !existing.router.closed) {
      existing.router.close();
    }

    const router = await worker.createRouter({
      mediaCodecs: env.MEDIASOUP_ROUTER_CODECS,
    });

    this.routers.set(roomId, { router, workerId: newWorkerId });
    logger.warn({ roomId, workerId: newWorkerId }, 'router_recreated_after_worker_failure');
  }

  closeRoom(roomId: string): void {
    const roomRouter = this.routers.get(roomId);
    if (!roomRouter) {
      return;
    }

    if (!roomRouter.router.closed) {
      roomRouter.router.close();
    }

    this.routers.delete(roomId);
    this.workerManager.releaseWorkerForRoom(roomId);
  }

  closeAll(): void {
    for (const [roomId, roomRouter] of this.routers.entries()) {
      if (!roomRouter.router.closed) {
        roomRouter.router.close();
      }
      this.workerManager.releaseWorkerForRoom(roomId);
    }

    this.routers.clear();
  }
}
