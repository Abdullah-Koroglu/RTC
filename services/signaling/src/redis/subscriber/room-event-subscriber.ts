import type { DistributedRoomEvent } from '@/redis/events/contracts';
import { distributedRoomEventSchema } from '@/redis/events/contracts';
import { signalingChannels } from '@/redis/channels/channels';
import { RedisSubscriber } from '@/redis/subscriber/redis-subscriber';

export class RoomEventSubscriber {
  constructor(private readonly subscriber: RedisSubscriber) {}

  async subscribeDistributed(
    handler: (event: DistributedRoomEvent) => Promise<void> | void,
  ): Promise<void> {
    await this.subscriber.subscribe(signalingChannels.distributedSync, distributedRoomEventSchema, handler);
  }

  async unsubscribeDistributed(): Promise<void> {
    await this.subscriber.unsubscribe(signalingChannels.distributedSync);
  }
}
