import type { Redis } from 'ioredis';
import type { ZodType } from 'zod';
import type { ChannelName } from '@/redis/channels/channels';
import { JsonCodec } from '@/redis/serialization/json-codec';
import { logger } from '@/core/logger';

type Handler<T> = (payload: T, channel: string) => Promise<void> | void;

interface Subscription<T> {
  schema: ZodType<T>;
  handler: Handler<T>;
}

export class RedisSubscriber {
  private readonly codec = new JsonCodec();
  private readonly subscriptions = new Map<ChannelName, Subscription<unknown>>();
  private isListening = false;

  constructor(private readonly client: Redis) {}

  async subscribe<T>(channel: ChannelName, schema: ZodType<T>, handler: Handler<T>): Promise<void> {
    this.subscriptions.set(channel, {
      schema,
      handler: handler as Handler<unknown>,
    });

    await this.client.subscribe(channel);
    logger.info({ channel }, 'redis_subscribed');

    if (!this.isListening) {
      this.startListener();
      this.isListening = true;
    }
  }

  async unsubscribe(channel: ChannelName): Promise<void> {
    this.subscriptions.delete(channel);
    await this.client.unsubscribe(channel);
    logger.info({ channel }, 'redis_unsubscribed');
  }

  private startListener(): void {
    this.client.on('message', (channel, raw) => {
      const subscription = this.subscriptions.get(channel);
      if (!subscription) {
        return;
      }

      const parsed = this.codec.decode(raw, subscription.schema as ZodType<unknown>);
      if (!parsed) {
        return;
      }

      void subscription.handler(parsed, channel);
    });

    this.client.on('ready', () => {
      for (const channel of this.subscriptions.keys()) {
        void this.client.subscribe(channel);
      }
    });
  }
}
