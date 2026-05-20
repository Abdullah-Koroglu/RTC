import type { FastifyInstance } from 'fastify';
import { healthRoutes } from '@/modules/health/route';
import { authRoutes } from '@/modules/auth/route';
import { turnRoutes } from '@/modules/turn/route';
import { userRoutes } from '@/modules/users/route';
import { roomRoutes } from '@/modules/rooms/route';
import { contactRoutes } from '@/modules/contacts/route';

export async function registerRoutes(app: FastifyInstance): Promise<void> {
  await app.register(healthRoutes);
  await app.register(authRoutes, { prefix: '/v1' });
  await app.register(turnRoutes, { prefix: '/v1' });
  await app.register(userRoutes, { prefix: '/v1' });
  await app.register(roomRoutes, { prefix: '/v1' });
  await app.register(contactRoutes, { prefix: '/v1' });
}
