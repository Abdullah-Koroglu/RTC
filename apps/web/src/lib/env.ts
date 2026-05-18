import { z } from 'zod';

const clientSchema = z.object({
  NEXT_PUBLIC_API_URL: z.string().url().default('http://localhost:4000'),
  NEXT_PUBLIC_SIGNALING_URL: z.string().url().default('ws://localhost:4010'),
  NEXT_PUBLIC_MEDIASOUP_URL: z.string().url().default('http://localhost:4020'),
});

const serverSchema = z.object({
  SIGNALING_INTERNAL_URL: z.string().url().default('http://localhost:4010'),
});

export function getClientEnv() {
  return clientSchema.parse({
    NEXT_PUBLIC_API_URL: process.env.NEXT_PUBLIC_API_URL,
    NEXT_PUBLIC_SIGNALING_URL: process.env.NEXT_PUBLIC_SIGNALING_URL,
    NEXT_PUBLIC_MEDIASOUP_URL: process.env.NEXT_PUBLIC_MEDIASOUP_URL,
  });
}

export function getServerEnv() {
  return serverSchema.parse({
    SIGNALING_INTERNAL_URL: process.env.SIGNALING_INTERNAL_URL,
  });
}
