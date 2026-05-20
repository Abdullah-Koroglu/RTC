import { z } from 'zod';

export const clientJoinRoomSchema = z.object({
  type: z.literal('room.join'),
  roomId: z.string().min(1),
  displayName: z.string().optional(),
  micEnabled: z.boolean().optional(),
  cameraEnabled: z.boolean().optional(),
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
    kind: z.enum(['offer', 'answer', 'ice-candidate', 'chat', 'name-announce', 'photo-announce']),
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

export const clientParticipantStateUpdateSchema = z.object({
  type: z.literal('participant.state-update'),
  roomId: z.string().min(1),
  cameraEnabled: z.boolean().optional(),
  micEnabled: z.boolean().optional(),
  displayName: z.string().optional(),
  requestId: z.string().optional(),
});

export const inboundEventSchema = z.discriminatedUnion('type', [
  clientJoinRoomSchema,
  clientLeaveRoomSchema,
  clientSignalSchema,
  clientReconnectSchema,
  clientPingSchema,
  clientParticipantStateUpdateSchema,
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
      displayName?: string;
    }
  | {
      type: 'room.participant-left';
      roomId: string;
      participantId: string;
      connectionId: string;
      reason: 'leave' | 'disconnect' | 'timeout';
    }
  | {
      type: 'room.participant-state-updated';
      roomId: string;
      participantId: string;
      displayName: string;
      cameraEnabled: boolean;
      micEnabled: boolean;
    }
  | {
      type: 'signal.relay';
      roomId: string;
      participantId: string;
      payload: {
        kind: 'offer' | 'answer' | 'ice-candidate' | 'chat' | 'name-announce' | 'photo-announce';
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
  event: z.custom<Extract<OutboundEvent, { type: 'room.participant-joined' | 'room.participant-left' | 'room.participant-state-updated' | 'signal.relay' }>>(),
});

export type RedisEnvelope = z.infer<typeof redisEnvelopeSchema>;
