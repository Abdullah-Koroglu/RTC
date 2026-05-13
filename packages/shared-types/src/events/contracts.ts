import { z } from 'zod';
import { envelopeMetaSchema } from '@/events/common';
import { participantIdSchema, roomIdSchema } from '@/rooms/entities';
import { mediaTrackSchema } from '@/rtc/tracks';

export const roomJoinSchema = envelopeMetaSchema.extend({
  type: z.literal('room_join'),
  roomId: roomIdSchema,
  participantId: participantIdSchema,
  reconnectToken: z.string().optional(),
});

export const roomLeaveSchema = envelopeMetaSchema.extend({
  type: z.literal('room_leave'),
  roomId: roomIdSchema,
  participantId: participantIdSchema,
  reason: z.enum(['client_request', 'disconnect', 'timeout']).default('client_request'),
});

export const participantJoinedSchema = envelopeMetaSchema.extend({
  type: z.literal('participant_joined'),
  roomId: roomIdSchema,
  participantId: participantIdSchema,
  connectionId: z.string().min(1),
});

export const participantLeftSchema = envelopeMetaSchema.extend({
  type: z.literal('participant_left'),
  roomId: roomIdSchema,
  participantId: participantIdSchema,
  connectionId: z.string().min(1),
  reason: z.enum(['leave', 'disconnect', 'timeout']),
});

export const trackPublishedSchema = envelopeMetaSchema.extend({
  type: z.literal('track_published'),
  roomId: roomIdSchema,
  participantId: participantIdSchema,
  track: mediaTrackSchema,
});

export const trackUnpublishedSchema = envelopeMetaSchema.extend({
  type: z.literal('track_unpublished'),
  roomId: roomIdSchema,
  participantId: participantIdSchema,
  trackId: z.string().min(1),
});

export const muteSchema = envelopeMetaSchema.extend({
  type: z.literal('mute'),
  roomId: roomIdSchema,
  participantId: participantIdSchema,
  targetParticipantId: participantIdSchema.optional(),
});

export const unmuteSchema = envelopeMetaSchema.extend({
  type: z.literal('unmute'),
  roomId: roomIdSchema,
  participantId: participantIdSchema,
  targetParticipantId: participantIdSchema.optional(),
});

export const heartbeatSchema = envelopeMetaSchema.extend({
  type: z.literal('heartbeat'),
  participantId: participantIdSchema.optional(),
  sentAt: z.number().int().optional(),
});

export const reconnectSchema = envelopeMetaSchema.extend({
  type: z.literal('reconnect'),
  participantId: participantIdSchema,
  recoveryToken: z.string().min(10),
});

export const rtcEventSchema = z.discriminatedUnion('type', [
  participantJoinedSchema,
  participantLeftSchema,
  roomJoinSchema,
  roomLeaveSchema,
  trackPublishedSchema,
  trackUnpublishedSchema,
  muteSchema,
  unmuteSchema,
  heartbeatSchema,
  reconnectSchema,
]);

export type RtcEvent = z.infer<typeof rtcEventSchema>;
export type ParticipantJoinedEvent = z.infer<typeof participantJoinedSchema>;
export type ParticipantLeftEvent = z.infer<typeof participantLeftSchema>;
export type RoomJoinEvent = z.infer<typeof roomJoinSchema>;
export type RoomLeaveEvent = z.infer<typeof roomLeaveSchema>;
export type TrackPublishedEvent = z.infer<typeof trackPublishedSchema>;
export type TrackUnpublishedEvent = z.infer<typeof trackUnpublishedSchema>;
export type MuteEvent = z.infer<typeof muteSchema>;
export type UnmuteEvent = z.infer<typeof unmuteSchema>;
export type HeartbeatEvent = z.infer<typeof heartbeatSchema>;
export type ReconnectEvent = z.infer<typeof reconnectSchema>;
