import type { DistributedRoomEvent } from '@/redis/events/contracts';
import { signalingChannels } from '@/redis/channels/channels';
import { RedisPublisher } from '@/redis/publisher/redis-publisher';

export class RoomEventPublisher {
  constructor(private readonly publisher: RedisPublisher) {}

  async publishDistributed(event: DistributedRoomEvent): Promise<void> {
    await this.publisher.publish(signalingChannels.distributedSync, event);
  }
}
