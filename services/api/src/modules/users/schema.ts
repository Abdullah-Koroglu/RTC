import { z } from 'zod';

export const createUserBodySchema = z.object({
  email: z.string().email(),
  displayName: z.string().min(2).max(50),
});

export type CreateUserBody = z.infer<typeof createUserBodySchema>;
