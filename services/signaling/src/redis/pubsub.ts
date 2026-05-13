import { RedisManager } from '@/redis/manager';
import { RedisPublisher } from '@/redis/publisher/redis-publisher';
import { RedisSubscriber } from '@/redis/subscriber/redis-subscriber';
import { distributedRoomEventSchema, type DistributedRoomEvent } from '@/redis/events/contracts';
import { RoomEventPublisher } from '@/redis/publisher/room-event-publisher';
import { RoomEventSubscriber } from '@/redis/subscriber/room-event-subscriber';
import { logger } from '@/core/logger';
import { env } from '@/config/env';

export class RedisPubSub {
  private readonly manager = RedisManager.getInstance();
  private readonly publisher = new RoomEventPublisher(
    new RedisPublisher(this.manager.getPublisherClient()),
  );
  private readonly subscriber = new RoomEventSubscriber(
    new RedisSubscriber(this.manager.getSubscriberClient()),
  );
  private connected = false;

  async connect(onEvent: (envelope: DistributedRoomEvent) => Promise<void> | void): Promise<void> {
    if (!env.REDIS_ENABLED) {
      logger.info('redis_pubsub_disabled_for_local_dev');
      this.connected = false;
      return;
    }

    try {
      await this.manager.connect();
      await this.subscriber.subscribeDistributed(async (event) => {
        const parsed = distributedRoomEventSchema.safeParse(event);
        if (!parsed.success) {
          return;
        }
        await onEvent(parsed.data);
      });
      this.connected = true;
    } catch (error) {
      this.connected = false;
      logger.warn({ err: error }, 'redis_pubsub_unavailable_starting_degraded');
      await this.manager.close();
    }
  }

  async publish(envelope: DistributedRoomEvent): Promise<void> {
    if (!this.connected) {
      return;
    }
    await this.publisher.publishDistributed(envelope);
  }

  async close(): Promise<void> {
    if (this.connected) {
      await this.subscriber.unsubscribeDistributed();
    }
    await this.manager.close();
  }
}
