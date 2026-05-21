import { z } from 'zod';

const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  LOG_LEVEL: z.enum(['fatal', 'error', 'warn', 'info', 'debug', 'trace', 'silent']).default('info'),
  HOST: z.string().min(1).default('0.0.0.0'),
  PORT: z.coerce.number().int().min(1).max(65535).default(4000),
  CORS_ORIGIN: z.string().min(1).default('http://localhost:3000'),
  RATE_LIMIT_MAX: z.coerce.number().int().positive().default(100),
  RATE_LIMIT_WINDOW: z.string().min(2).default('1 minute'),
  JWT_SECRET: z.string().min(32).default('dev_jwt_secret_change_me_1234567890'),
  JWT_EXPIRES_IN: z.string().default('15m'),
  REDIS_ENABLED: z.coerce.boolean().default(false),
  REDIS_URL: z.string().url().default('redis://127.0.0.1:6379'),
  DATABASE_ENABLED: z.coerce.boolean().default(false),
  DATABASE_URL: z.string().url().default('postgresql://postgres:postgres@127.0.0.1:5432/rtc'),
  INTERNAL_API_SECRET: z.string().min(32).default('dev_internal_secret_change_me_12345'),
  SIGNALING_INTERNAL_URL: z.string().url().optional(),
  TURN_REALM: z.string().min(1).default('turn.local.rtc'),
  TURN_SHARED_SECRET: z.string().min(1).default('rtc-local-turn-secret'),
  TURN_TTL_SECONDS: z.coerce.number().int().positive().default(3600),
  SHUTDOWN_GRACE_MS: z.coerce.number().int().positive().default(10000),
});

export type AppEnv = z.infer<typeof envSchema>;

export const env: AppEnv = envSchema.parse(process.env);
