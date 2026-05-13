import type { ZodTypeAny } from 'zod';
import { websocketClientMessageSchema, websocketEnvelopeSchema, websocketServerMessageSchema } from '@/websocket/contracts';

export function validateWsClientMessage(input: unknown) {
  return websocketClientMessageSchema.safeParse(input);
}

export function validateWsServerMessage(input: unknown) {
  return websocketServerMessageSchema.safeParse(input);
}

export function validateWsEnvelope(input: unknown) {
  return websocketEnvelopeSchema.safeParse(input);
}

export function parseOrThrow<TSchema extends ZodTypeAny>(schema: TSchema, input: unknown) {
  return schema.parse(input);
}
