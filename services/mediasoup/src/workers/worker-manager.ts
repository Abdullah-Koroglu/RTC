import { EventEmitter } from 'node:events';
import { randomUUID } from 'node:crypto';
import { createWorker } from 'mediasoup';
import { env } from '@/config/env';
import { logger } from '@/core/logger';
import type { Worker, WorkerId, WorkerSnapshot } from '@/types/mediasoup';

interface WorkerRecord {
  id: WorkerId;
  worker: Worker;
  roomCount: number;
  closed: boolean;
}

export interface WorkerReplacedEvent {
  oldWorkerId: WorkerId;
  newWorkerId: WorkerId;
}

export class WorkerManager extends EventEmitter {
  private readonly workers = new Map<WorkerId, WorkerRecord>();
  private readonly roomAssignments = new Map<string, WorkerId>();

  async bootstrap(): Promise<void> {
    for (let i = 0; i < env.MEDIASOUP_WORKER_COUNT; i += 1) {
      await this.spawnWorker();
    }

    logger.info({ count: this.workers.size }, 'mediasoup_workers_bootstrapped');
  }

  hasHealthyWorkers(): boolean {
    return this.workers.size > 0;
  }

  getSnapshots(): WorkerSnapshot[] {
    return Array.from(this.workers.values()).map((w) => ({
      workerId: w.id,
      pid: w.worker.pid,
      roomCount: w.roomCount,
      closed: w.closed,
    }));
  }

  assignWorkerForRoom(roomId: string): Worker {
    const assignedId = this.roomAssignments.get(roomId);
    if (assignedId) {
      const existing = this.workers.get(assignedId);
      if (existing && !existing.closed) {
        return existing.worker;
      }
    }

    const leastLoaded = this.getLeastLoadedWorkerRecord();
    if (!leastLoaded) {
      throw new Error('No mediasoup workers available');
    }

    leastLoaded.roomCount += 1;
    this.roomAssignments.set(roomId, leastLoaded.id);
    return leastLoaded.worker;
  }

  releaseWorkerForRoom(roomId: string): void {
    const workerId = this.roomAssignments.get(roomId);
    if (!workerId) {
      return;
    }

    const record = this.workers.get(workerId);
    if (record) {
      record.roomCount = Math.max(0, record.roomCount - 1);
    }

    this.roomAssignments.delete(roomId);
  }

  getAssignedWorkerId(roomId: string): WorkerId | undefined {
    return this.roomAssignments.get(roomId);
  }

  async close(): Promise<void> {
    for (const record of this.workers.values()) {
      record.closed = true;
      record.worker.close();
    }
    this.workers.clear();
    this.roomAssignments.clear();
  }

  private getLeastLoadedWorkerRecord(): WorkerRecord | undefined {
    let target: WorkerRecord | undefined;

    for (const record of this.workers.values()) {
      if (record.closed) {
        continue;
      }
      if (!target || record.roomCount < target.roomCount) {
        target = record;
      }
    }

    return target;
  }

  private async spawnWorker(): Promise<WorkerRecord> {
    const worker = await createWorker({
      rtcMinPort: env.MEDIASOUP_WORKER_RTC_MIN_PORT,
      rtcMaxPort: env.MEDIASOUP_WORKER_RTC_MAX_PORT,
      logLevel: env.NODE_ENV === 'development' ? 'debug' : 'warn',
      logTags: env.MEDIASOUP_LOG_TAG_LIST,
    });

    const record: WorkerRecord = {
      id: randomUUID(),
      worker,
      roomCount: 0,
      closed: false,
    };

    this.workers.set(record.id, record);

    worker.on('died', () => {
      void this.handleWorkerDeath(record.id);
    });

    logger.info({ workerId: record.id, pid: worker.pid }, 'mediasoup_worker_spawned');
    return record;
  }

  private async handleWorkerDeath(deadWorkerId: WorkerId): Promise<void> {
    const deadWorker = this.workers.get(deadWorkerId);
    if (!deadWorker) {
      return;
    }

    deadWorker.closed = true;
    this.workers.delete(deadWorkerId);

    logger.error({ workerId: deadWorkerId, pid: deadWorker.worker.pid }, 'mediasoup_worker_died');

    const reassignedRooms = Array.from(this.roomAssignments.entries())
      .filter(([, workerId]) => workerId === deadWorkerId)
      .map(([roomId]) => roomId);

    for (const roomId of reassignedRooms) {
      this.roomAssignments.delete(roomId);
    }

    const replacement = await this.spawnWorker();

    this.emit('worker-replaced', {
      oldWorkerId: deadWorkerId,
      newWorkerId: replacement.id,
    } as WorkerReplacedEvent);
  }
}
