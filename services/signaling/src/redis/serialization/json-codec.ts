import { ZodType } from 'zod';
import { logger } from '@/core/logger';

export class JsonCodec {
  encode<T>(payload: T): string {
    return JSON.stringify(payload);
  }

  decode<T>(raw: string, schema: ZodType<T>): T | null {
    let parsedJson: unknown;

    try {
      parsedJson = JSON.parse(raw);
    } catch (error) {
      logger.warn({ err: error }, 'redis_codec_invalid_json');
      return null;
    }

    const parsed = schema.safeParse(parsedJson);
    if (!parsed.success) {
      logger.warn({ issues: parsed.error.issues }, 'redis_codec_schema_mismatch');
      return null;
    }

    return parsed.data;
  }
}
