import type { Redis } from 'ioredis';
import type { ChannelName } from '@/redis/channels/channels';
import { JsonCodec } from '@/redis/serialization/json-codec';
import { logger } from '@/core/logger';

export class RedisPublisher {
  private readonly codec = new JsonCodec();

  constructor(private readonly client: Redis) {}

  async publish<T>(channel: ChannelName, payload: T): Promise<number> {
    const raw = this.codec.encode(payload);
    const delivered = await this.client.publish(channel, raw);
    logger.debug({ channel, delivered }, 'redis_publish');
    return delivered;
  }
}
