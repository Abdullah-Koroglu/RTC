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

export const registerBodySchema = z.object({
  email: z.string().email(),
  password: z.string().min(8).max(128),
  displayName: z.string().min(2).max(50),
});

export const verifyPasswordBodySchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

export const upsertOAuthUserBodySchema = z.object({
  email: z.string().email(),
  displayName: z.string().min(1).max(100),
  avatarUrl: z.string().url().nullable().optional(),
  provider: z.string().min(1),
  providerId: z.string().min(1),
});

export type LoginBody = z.infer<typeof loginBodySchema>;
export type RegisterBody = z.infer<typeof registerBodySchema>;
export type VerifyPasswordBody = z.infer<typeof verifyPasswordBodySchema>;
export type UpsertOAuthUserBody = z.infer<typeof upsertOAuthUserBodySchema>;
