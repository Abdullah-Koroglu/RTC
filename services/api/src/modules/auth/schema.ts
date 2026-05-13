import { z } from 'zod';

export const loginBodySchema = z.object({
  subject: z.string().min(1),
  role: z.string().min(1).optional(),
});

export type LoginBody = z.infer<typeof loginBodySchema>;
