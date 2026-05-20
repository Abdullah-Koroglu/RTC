import { z } from 'zod';

export const sendRequestBodySchema = z.object({
  email: z.string().email(),
});

export const respondRequestBodySchema = z.object({
  action: z.enum(['accept', 'reject']),
});

export type SendRequestBody = z.infer<typeof sendRequestBodySchema>;
export type RespondRequestBody = z.infer<typeof respondRequestBodySchema>;
