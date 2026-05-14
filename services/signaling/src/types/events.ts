import { z } from 'zod';

export const clientJoinRoomSchema = z.object({
  type: z.literal('room.join'),
  roomId: z.string().min(1),
  requestId: z.string().optional(),
});

export const clientLeaveRoomSchema = z.object({
  type: z.literal('room.leave'),
  roomId: z.string().min(1),
  requestId: z.string().optional(),
});

export const clientSignalSchema = z.object({
  type: z.literal('signal.relay'),
  roomId: z.string().min(1),
  payload: z.object({
    kind: z.enum(['offer', 'answer', 'ice-candidate', 'chat']),
    data: z.unknown(),
    targetParticipantId: z.string().optional(),
  }),
  requestId: z.string().optional(),
});

export const clientReconnectSchema = z.object({
  type: z.literal('session.reconnect'),
  recoveryToken: z.string().min(10),
  requestId: z.string().optional(),
});

export const clientPingSchema = z.object({
  type: z.literal('ping'),
  ts: z.number().optional(),
});

export const inboundEventSchema = z.discriminatedUnion('type', [
  clientJoinRoomSchema,
  clientLeaveRoomSchema,
  clientSignalSchema,
  clientReconnectSchema,
  clientPingSchema,
]);

export type InboundEvent = z.infer<typeof inboundEventSchema>;

export type OutboundEvent =
  | {
      type: 'ack';
      requestId?: string;
      ok: true;
      data?: unknown;
    }
  | {
      type: 'error';
      requestId?: string;
      code: string;
      message: string;
    }
  | {
      type: 'room.participant-joined';
      roomId: string;
      participantId: string;
      connectionId: string;
    }
  | {
      type: 'room.participant-left';
      roomId: string;
      participantId: string;
      connectionId: string;
      reason: 'leave' | 'disconnect' | 'timeout';
    }
  | {
      type: 'signal.relay';
      roomId: string;
      participantId: string;
      payload: {
        kind: 'offer' | 'answer' | 'ice-candidate' | 'chat';
        data: unknown;
        targetParticipantId?: string;
      };
    }
  | {
      type: 'pong';
      ts: number;
    }
  | {
      type: 'session.ready';
      connectionId: string;
      participantId: string;
      recoveryToken: string;
    };

export const redisEnvelopeSchema = z.object({
  eventId: z.string(),
  emittedAt: z.string(),
  roomId: z.string().min(1),
  sourceNodeId: z.string().min(1),
  event: z.custom<Extract<OutboundEvent, { type: 'room.participant-joined' | 'room.participant-left' | 'signal.relay' }>>(),
});

export type RedisEnvelope = z.infer<typeof redisEnvelopeSchema>;
