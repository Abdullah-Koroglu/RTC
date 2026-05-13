import { z } from 'zod';
import { participantIdSchema } from '@/rooms/entities';

export const authClaimsSchema = z.object({
  sub: participantIdSchema,
  roomAccess: z.array(z.string()).default([]),
  role: z.string().optional(),
  sessionId: z.string().optional(),
});

export type AuthClaims = z.infer<typeof authClaimsSchema>;
