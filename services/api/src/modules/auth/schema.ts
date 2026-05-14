import { z } from 'zod';

export const loginBodySchema = z.object({
  subject: z.string().min(1).optional(),
  peerId: z.string().min(1).optional(),
  roomId: z.string().min(1).optional(),
  role: z.string().min(1).optional(),
}).superRefine((value, ctx) => {
  if (!value.subject && !value.peerId) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: 'subject or peerId is required',
      path: ['subject'],
    });
  }
});

export type LoginBody = z.infer<typeof loginBodySchema>;
