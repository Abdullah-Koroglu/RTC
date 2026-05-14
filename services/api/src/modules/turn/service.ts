import { createHmac } from 'node:crypto';
import { env } from '@/config/env';

export interface TurnCredentials {
  urls: string[];
  username: string;
  credential: string;
  ttlSeconds: number;
}

export function issueTurnCredentials(subject: string): TurnCredentials {
  const expiresAt = Math.floor(Date.now() / 1000) + env.TURN_TTL_SECONDS;
  const username = `${expiresAt}:${subject}`;
  const credential = createHmac('sha1', env.TURN_SHARED_SECRET).update(username).digest('base64');

  return {
    urls: [`turn:${env.TURN_REALM}:3478?transport=tcp`],
    username,
    credential,
    ttlSeconds: env.TURN_TTL_SECONDS,
  };
}