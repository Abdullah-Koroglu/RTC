import { z } from 'zod';

const clientSchema = z.object({
  NEXT_PUBLIC_API_URL: z.string().url().default('http://localhost:4000'),
  NEXT_PUBLIC_SIGNALING_URL: z.string().url().default('ws://localhost:4010'),
});

export const env = clientSchema.parse({
  NEXT_PUBLIC_API_URL: process.env.NEXT_PUBLIC_API_URL,
  NEXT_PUBLIC_SIGNALING_URL: process.env.NEXT_PUBLIC_SIGNALING_URL,
});
