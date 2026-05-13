import type { Redis } from 'ioredis';
import type { Pool } from 'pg';

export interface ServiceContainer {
  redis: Redis;
  db: Pool;
}
