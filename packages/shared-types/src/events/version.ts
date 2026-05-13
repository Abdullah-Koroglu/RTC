import { z } from 'zod';

export const EVENT_SCHEMA_VERSION = '1.0' as const;

export const eventVersionSchema = z.literal(EVENT_SCHEMA_VERSION);

export type EventSchemaVersion = z.infer<typeof eventVersionSchema>;
