import { z } from 'zod';
import { eventVersionSchema } from '@/events/version';

export const idSchema = z.string().min(1);
export const isoDateSchema = z.string().datetime({ offset: true });

export const envelopeMetaSchema = z.object({
  v: eventVersionSchema,
  eventId: idSchema,
  timestamp: isoDateSchema,
  correlationId: idSchema.optional(),
});

export type EnvelopeMeta = z.infer<typeof envelopeMetaSchema>;

export type Prettify<T> = {
  [K in keyof T]: T[K];
} & {};

export type EventOfType<TUnion, TType extends string> = TUnion extends { type: TType } ? TUnion : never;
