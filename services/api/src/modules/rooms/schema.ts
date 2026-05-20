import { z } from 'zod';

export const createRoomBodySchema = z.object({
  type: z.enum(['public', 'password', 'invite_only']).default('public'),
  password: z.string().min(4).max(64).optional(),
  inviteUserIds: z.array(z.string().uuid()).optional(),
}).superRefine((val, ctx) => {
  if (val.type === 'password' && !val.password) {
    ctx.addIssue({ code: z.ZodIssueCode.custom, message: 'password required for password type', path: ['password'] });
  }
});

export const verifyPasswordBodySchema = z.object({
  password: z.string().min(1),
});

export const addInviteBodySchema = z.object({
  userId: z.string().uuid(),
});

export const respondJoinRequestBodySchema = z.object({
  action: z.enum(['approve', 'deny']),
});

export type CreateRoomBody = z.infer<typeof createRoomBodySchema>;
export type VerifyPasswordBody = z.infer<typeof verifyPasswordBodySchema>;
