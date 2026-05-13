import type { FastifyInstance } from 'fastify';
import type { RoomInfo } from '@shared-types/room';

const rooms: RoomInfo[] = [];

export async function roomRoutes(app: FastifyInstance): Promise<void> {
  app.get('/rooms', async () => rooms);
}
