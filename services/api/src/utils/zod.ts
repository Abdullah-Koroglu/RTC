import { fromZodError } from 'zod-validation-error';
import { ZodError } from 'zod';

export function formatZodError(error: ZodError): string {
  return fromZodError(error, { prefix: null }).message;
}
