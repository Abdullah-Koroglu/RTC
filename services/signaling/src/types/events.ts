import { z } from 'zod';

export const clientJoinRoomSchema = z.object({
  type: z.literal('room.join'),
  roomId: z.string().min(1),
  displayName: z.string().optional(),
  micEnabled: z.boolean().optional(),
  cameraEnabled: z.boolean().optional(),
  password: z.string().optional(),
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

export const clientRequestJoinSchema = z.object({
  type: z.literal('room.request-join'),
  roomId: z.string().min(1),
  displayName: z.string().optional(),
  requestId: z.string().optional(),
});

export const clientApproveJoinSchema = z.object({
  type: z.literal('room.approve-join'),
  roomId: z.string().min(1),
  peerId: z.string().min(1),
  requestId: z.string().optional(),
});

export const clientDenyJoinSchema = z.object({
  type: z.literal('room.deny-join'),
  roomId: z.string().min(1),
  peerId: z.string().min(1),
  requestId: z.string().optional(),
});

export const clientKickSchema = z.object({
  type: z.literal('room.kick'),
  roomId: z.string().min(1),
  peerId: z.string().min(1),
  requestId: z.string().optional(),
});

export const clientLockRoomSchema = z.object({
  type: z.literal('room.lock'),
  roomId: z.string().min(1),
  locked: z.boolean(),
  requestId: z.string().optional(),
});

export const clientTransferHostSchema = z.object({
  type: z.literal('room.transfer-host'),
  roomId: z.string().min(1),
  peerId: z.string().min(1),
  requestId: z.string().optional(),
});

export const clientForceMuteSchema = z.object({
  type: z.literal('room.force-mute'),
  roomId: z.string().min(1),
  peerId: z.string().min(1),
  kind: z.enum(['audio', 'video', 'both']),
  requestId: z.string().optional(),
});

export const clientRequestUnmuteSchema = z.object({
  type: z.literal('room.request-unmute'),
  roomId: z.string().min(1),
  peerId: z.string().min(1),
  kind: z.enum(['audio', 'video', 'both']),
  requestId: z.string().optional(),
});

export const clientRaiseHandSchema = z.object({
  type: z.literal('room.raise-hand'),
  roomId: z.string().min(1),
  requestId: z.string().optional(),
});

export const clientLowerHandSchema = z.object({
  type: z.literal('room.lower-hand'),
  roomId: z.string().min(1),
  peerId: z.string().min(1).optional(),
  requestId: z.string().optional(),
});

export const inboundEventSchema = z.discriminatedUnion('type', [
  clientJoinRoomSchema,
  clientLeaveRoomSchema,
  clientSignalSchema,
  clientReconnectSchema,
  clientPingSchema,
  clientParticipantStateUpdateSchema,
  clientRequestJoinSchema,
  clientApproveJoinSchema,
  clientDenyJoinSchema,
  clientKickSchema,
  clientLockRoomSchema,
  clientTransferHostSchema,
  clientForceMuteSchema,
  clientRequestUnmuteSchema,
  clientRaiseHandSchema,
  clientLowerHandSchema,
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
      type: 'room.join-requested';
      roomId: string;
      peerId: string;
      displayName: string;
    }
  | {
      type: 'room.join-approved';
      roomId: string;
    }
  | {
      type: 'room.join-denied';
      roomId: string;
    }
  | {
      type: 'room.participant-kicked';
      roomId: string;
      participantId: string;
    }
  | {
      type: 'room.locked';
      roomId: string;
      locked: boolean;
    }
  | {
      type: 'room.host-transferred';
      roomId: string;
      newHostPeerId: string;
      newHostDisplayName: string;
    }
  | {
      type: 'room.participant-muted';
      roomId: string;
      participantId: string;
      kind: 'audio' | 'video' | 'both';
    }
  | {
      type: 'room.unmute-requested';
      roomId: string;
      kind: 'audio' | 'video' | 'both';
    }
  | {
      type: 'room.hand-raised';
      roomId: string;
      participantId: string;
      displayName: string;
    }
  | {
      type: 'room.hand-lowered';
      roomId: string;
      participantId: string;
    }
  | {
      type: 'room.ended';
      roomId: string;
      reason: 'ended' | 'expired';
      endedAt?: string;
    }
  | {
      type: 'producer.new';
      roomId: string;
      peerId: string;
      producerId: string;
      kind: 'audio' | 'video';
    }
  | {
      type: 'producer.closed';
      roomId: string;
      peerId: string;
      producerId: string;
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
  event: z.custom<Extract<OutboundEvent, { type: 'room.participant-joined' | 'room.participant-left' | 'room.participant-state-updated' | 'signal.relay' | 'producer.new' | 'producer.closed' | 'room.locked' | 'room.host-transferred' }>>(),
});

export type RedisEnvelope = z.infer<typeof redisEnvelopeSchema>;
