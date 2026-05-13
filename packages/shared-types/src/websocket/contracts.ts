import { z } from 'zod';
import { envelopeMetaSchema } from '@/events/common';
import {
  heartbeatSchema,
  reconnectSchema,
  roomJoinSchema,
  roomLeaveSchema,
  trackPublishedSchema,
  trackUnpublishedSchema,
  muteSchema,
  unmuteSchema,
  participantJoinedSchema,
  participantLeftSchema,
} from '@/events/contracts';

export const websocketClientMessageSchema = z.discriminatedUnion('type', [
  roomJoinSchema,
  roomLeaveSchema,
  heartbeatSchema,
  reconnectSchema,
  muteSchema,
  unmuteSchema,
]);

export const websocketServerMessageSchema = z.discriminatedUnion('type', [
  participantJoinedSchema,
  participantLeftSchema,
  trackPublishedSchema,
  trackUnpublishedSchema,
  heartbeatSchema,
  reconnectSchema,
]);

export const websocketAckSchema = envelopeMetaSchema.extend({
  type: z.literal('ack'),
  ok: z.literal(true),
  requestType: z.string().min(1),
});

export const websocketErrorSchema = envelopeMetaSchema.extend({
  type: z.literal('error'),
  ok: z.literal(false),
  code: z.string().min(1),
  message: z.string().min(1),
});

export const websocketEnvelopeSchema = z.discriminatedUnion('type', [
  websocketAckSchema,
  websocketErrorSchema,
  websocketClientMessageSchema,
  websocketServerMessageSchema,
]);

export type WebsocketClientMessage = z.infer<typeof websocketClientMessageSchema>;
export type WebsocketServerMessage = z.infer<typeof websocketServerMessageSchema>;
export type WebsocketEnvelope = z.infer<typeof websocketEnvelopeSchema>;
