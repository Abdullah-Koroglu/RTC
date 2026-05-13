import Redis from 'ioredis';
import { env } from '@/config/env';
import { logger } from '@/core/logger';

interface RedisManagerOptions {
  poolSize?: number;
}

export class RedisManager {
  private static instance: RedisManager | null = null;
  private readonly publisherClient: Redis;
  private readonly subscriberClient: Redis;
  private readonly commandPool: Redis[] = [];
  private closed = false;

  private constructor(options?: RedisManagerOptions) {
    const poolSize = Math.max(1, options?.poolSize ?? env.REDIS_POOL_SIZE);

    this.publisherClient = this.createClient('publisher');
    this.subscriberClient = this.createClient('subscriber');

    for (let i = 0; i < poolSize; i += 1) {
      this.commandPool.push(this.createClient(`pool-${i + 1}`));
    }
  }

  static getInstance(options?: RedisManagerOptions): RedisManager {
    if (!RedisManager.instance) {
      RedisManager.instance = new RedisManager(options);
    }

    return RedisManager.instance;
  }

  async connect(): Promise<void> {
    if (this.closed) {
      throw new Error('RedisManager is closed');
    }

    const clients = [this.publisherClient, this.subscriberClient, ...this.commandPool];
    await Promise.all(clients.map(async (client) => {
      if (client.status !== 'ready') {
        await client.connect();
      }
    }));
  }

  getPublisherClient(): Redis {
    return this.publisherClient;
  }

  getSubscriberClient(): Redis {
    return this.subscriberClient;
  }

  getPooledClient(key: string): Redis {
    const index = Math.abs(this.hash(key)) % this.commandPool.length;
    return this.commandPool[index] ?? this.commandPool[0];
  }

  async close(): Promise<void> {
    if (this.closed) {
      return;
    }

    this.closed = true;
    const clients = [this.publisherClient, this.subscriberClient, ...this.commandPool];
    await Promise.allSettled(clients.map((client) => client.quit()));
  }

  private createClient(name: string): Redis {
    const client = new Redis(env.REDIS_URL, {
      lazyConnect: true,
      maxRetriesPerRequest: null,
      enableReadyCheck: true,
      retryStrategy: (attempt: number) => {
        const backoff = Math.min(env.REDIS_RETRY_MAX_MS, env.REDIS_RETRY_BASE_MS * 2 ** (attempt - 1));
        const jitter = Math.floor(Math.random() * 250);
        return backoff + jitter;
      },
      reconnectOnError: (error) => {
        logger.warn({ err: error, client: name }, 'redis_reconnect_on_error');
        return true;
      },
    });

    client.on('connect', () => logger.info({ client: name }, 'redis_connecting'));
    client.on('ready', () => logger.info({ client: name }, 'redis_ready'));
    client.on('reconnecting', () => logger.warn({ client: name }, 'redis_reconnecting'));
    client.on('error', (error) => logger.error({ err: error, client: name }, 'redis_error'));
    client.on('end', () => logger.warn({ client: name }, 'redis_connection_closed'));

    return client;
  }

  private hash(input: string): number {
    let hash = 0;
    for (let i = 0; i < input.length; i += 1) {
      hash = (hash << 5) - hash + input.charCodeAt(i);
      hash |= 0;
    }
    return hash;
  }
}
