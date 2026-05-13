import { z } from 'zod';
import { idSchema } from '@/events/common';

export const transportTypeSchema = z.enum(['webrtc', 'plain']);
export const mediaKindSchema = z.enum(['audio', 'video', 'data']);

export const mediaTrackSchema = z.object({
  trackId: idSchema,
  producerId: idSchema.optional(),
  transportType: transportTypeSchema,
  kind: mediaKindSchema,
  codec: z.string().min(1).optional(),
  simulcast: z.boolean().default(false),
  layers: z.array(z.string()).default([]),
});

export type TransportType = z.infer<typeof transportTypeSchema>;
export type MediaKind = z.infer<typeof mediaKindSchema>;
export type MediaTrack = z.infer<typeof mediaTrackSchema>;
