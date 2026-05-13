import { z } from 'zod';

const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  LOG_LEVEL: z.enum(['fatal', 'error', 'warn', 'info', 'debug', 'trace', 'silent']).default('info'),
  HOST: z.string().min(1).default('0.0.0.0'),
  PORT: z.coerce.number().int().min(1).max(65535).default(4010),
  REDIS_ENABLED: z.coerce.boolean().default(false),
  REDIS_URL: z.string().url().default('redis://127.0.0.1:6379'),
  REDIS_CHANNEL: z.string().min(1).default('rtc:signaling:events'),
  REDIS_POOL_SIZE: z.coerce.number().int().positive().default(4),
  REDIS_RETRY_BASE_MS: z.coerce.number().int().positive().default(100),
  REDIS_RETRY_MAX_MS: z.coerce.number().int().positive().default(5000),
  JWT_SECRET: z.string().min(32).default('dev_jwt_secret_change_me_1234567890'),
  HEARTBEAT_INTERVAL_MS: z.coerce.number().int().positive().default(25000),
  HEARTBEAT_TIMEOUT_MS: z.coerce.number().int().positive().default(10000),
  MAX_PAYLOAD_BYTES: z.coerce.number().int().positive().default(262144),
  SHUTDOWN_GRACE_MS: z.coerce.number().int().positive().default(12000),
});

export type Env = z.infer<typeof envSchema>;

export const env: Env = envSchema.parse(process.env);
