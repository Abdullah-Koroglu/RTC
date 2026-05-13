import { z } from 'zod';
import { idSchema, isoDateSchema } from '@/events/common';

export const participantIdSchema = idSchema;
export const roomIdSchema = idSchema;

export const participantRoleSchema = z.enum(['host', 'speaker', 'listener']);

export const participantSchema = z.object({
  participantId: participantIdSchema,
  displayName: z.string().min(1).max(80),
  role: participantRoleSchema.default('listener'),
  isMuted: z.boolean().default(false),
  joinedAt: isoDateSchema,
});

export const roomSchema = z.object({
  roomId: roomIdSchema,
  name: z.string().min(1).max(120),
  createdAt: isoDateSchema,
  participants: z.array(participantSchema),
});

export type ParticipantId = z.infer<typeof participantIdSchema>;
export type RoomId = z.infer<typeof roomIdSchema>;
export type Participant = z.infer<typeof participantSchema>;
export type Room = z.infer<typeof roomSchema>;
