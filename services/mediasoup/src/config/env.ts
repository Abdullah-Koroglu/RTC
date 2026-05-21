import { cpus } from 'node:os';
import { z } from 'zod';
import type { WorkerLogTag } from '@/types/mediasoup';

const booleanFromEnv = z.preprocess((value) => {
  if (typeof value === 'boolean') {
    return value;
  }

  if (typeof value === 'number') {
    return value !== 0;
  }

  if (typeof value === 'string') {
    const normalized = value.trim().toLowerCase();
    if (['true', '1', 'yes', 'y', 'on'].includes(normalized)) {
      return true;
    }
    if (['false', '0', 'no', 'n', 'off', ''].includes(normalized)) {
      return false;
    }
  }

  return value;
}, z.boolean());

const workerTags = [
  'info',
  'ice',
  'dtls',
  'rtp',
  'srtp',
  'rtcp',
  'rtx',
  'bwe',
  'score',
  'simulcast',
  'svc',
  'sctp',
  'message',
] as const;

const defaultCodecs = [
  {
    kind: 'audio',
    mimeType: 'audio/opus',
    clockRate: 48000,
    channels: 2,
    parameters: {
      'useinbandfec': 1,          // FEC: paket kaybında ses kalitesini korur
      'usedtx': 1,                // DTX: sessizlikte bant genişliği tasarrufu
      'maxaveragebitrate': 64000, // 64kbps — ses için yeterli kalite
      'ptime': 20,                // 20ms paket süresi
    },
  },
  {
    kind: 'video',
    mimeType: 'video/VP9',        // VP8 → VP9: daha iyi sıkıştırma, düşük bitrate'te yüksek kalite
    clockRate: 90000,
    parameters: {
      'x-google-start-bitrate': 2000,
      'x-google-max-bitrate': 5000,
      'x-google-min-bitrate': 200,
    },
  },
  // VP8 fallback — VP9 desteklemeyen tarayıcılar için
  {
    kind: 'video',
    mimeType: 'video/VP8',
    clockRate: 90000,
    parameters: {
      'x-google-start-bitrate': 2000,
      'x-google-max-bitrate': 5000,
      'x-google-min-bitrate': 200,
    },
  },
] as const;

const schema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  LOG_LEVEL: z.enum(['fatal', 'error', 'warn', 'info', 'debug', 'trace', 'silent']).default('info'),
  HOST: z.string().min(1).default('0.0.0.0'),
  PORT: z.coerce.number().int().min(1).max(65535).default(4020),
  SHUTDOWN_GRACE_MS: z.coerce.number().int().positive().default(15000),
  MEDIASOUP_WORKER_COUNT: z.coerce.number().int().positive().default(Math.max(1, cpus().length - 1)),
  MEDIASOUP_WORKER_RTC_MIN_PORT: z.coerce.number().int().min(10000).max(65535).default(40000),
  MEDIASOUP_WORKER_RTC_MAX_PORT: z.coerce.number().int().min(10000).max(65535).default(49999),
  MEDIASOUP_LISTEN_IP: z.string().min(1).default('0.0.0.0'),
  MEDIASOUP_ANNOUNCED_IP: z.string().min(1).optional(),
  MEDIASOUP_ENABLE_UDP: booleanFromEnv.default(true),
  MEDIASOUP_ENABLE_TCP: booleanFromEnv.default(true),
  MEDIASOUP_PREFER_UDP: booleanFromEnv.default(true),
  MEDIASOUP_INITIAL_AVAILABLE_OUTGOING_BITRATE: z.coerce.number().int().positive().default(1000000),
  MEDIASOUP_MAX_INCOMING_BITRATE: z.coerce.number().int().positive().default(1500000),
  MEDIASOUP_LOG_TAGS: z.string().default('ice,dtls,rtp,rtcp,bwe,score,simulcast,svc'),
  MEDIASOUP_CODECS_JSON: z.string().optional(),
  SIGNALING_INTERNAL_URL: z.string().url().optional(),
});

const parsed = schema.parse(process.env);

if (parsed.MEDIASOUP_WORKER_RTC_MIN_PORT >= parsed.MEDIASOUP_WORKER_RTC_MAX_PORT) {
  throw new Error('MEDIASOUP_WORKER_RTC_MIN_PORT must be lower than MEDIASOUP_WORKER_RTC_MAX_PORT');
}

const parsedTags = parsed.MEDIASOUP_LOG_TAGS.split(',')
  .map((x) => x.trim())
  .filter(Boolean)
  .filter((x): x is WorkerLogTag => workerTags.includes(x as (typeof workerTags)[number]));

const parsedCodecs = parsed.MEDIASOUP_CODECS_JSON
  ? (JSON.parse(parsed.MEDIASOUP_CODECS_JSON) as unknown)
  : defaultCodecs;

export const env = {
  ...parsed,
  MEDIASOUP_LOG_TAG_LIST: parsedTags,
  MEDIASOUP_ROUTER_CODECS: parsedCodecs,
};

export type Env = typeof env;
