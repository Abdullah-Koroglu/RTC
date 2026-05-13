import { z } from 'zod';
import { participantSchema, roomSchema } from '@/rooms/entities';

export const participantDtoSchema = participantSchema;
export const roomDtoSchema = roomSchema;

export const roomStateDtoSchema = z.object({
  room: roomDtoSchema,
  activeSpeakers: z.array(z.string()),
  updatedAt: z.string().datetime({ offset: true }),
});

export type ParticipantDto = z.infer<typeof participantDtoSchema>;
export type RoomDto = z.infer<typeof roomDtoSchema>;
export type RoomStateDto = z.infer<typeof roomStateDtoSchema>;
