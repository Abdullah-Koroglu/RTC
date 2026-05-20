import { z } from 'zod';
import type { OutboundEvent } from '@/types/events';

export const distributedRoomEventSchema = z.object({
  eventId: z.string().min(1),
  emittedAt: z.string().datetime({ offset: true }),
  roomId: z.string().min(1),
  sourceNodeId: z.string().min(1),
  event: z.custom<Extract<OutboundEvent, { type: 'room.participant-joined' | 'room.participant-left' | 'room.participant-state-updated' | 'signal.relay' | 'producer.new' | 'producer.closed' }>>(),
});

export type DistributedRoomEvent = z.infer<typeof distributedRoomEventSchema>;
