import pino from 'pino';
import { env } from '@/config/env';

export const logger = pino({
  name: 'rtc-signaling',
  level: env.LOG_LEVEL,
  redact: {
    paths: ['req.headers.authorization', '*.token'],
    remove: true,
  },
  transport:
    env.NODE_ENV === 'development'
      ? {
          target: 'pino-pretty',
          options: {
            colorize: true,
            translateTime: 'SYS:standard',
          },
        }
      : undefined,
});
