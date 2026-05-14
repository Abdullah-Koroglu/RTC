import type { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { issueTurnCredentials } from '@/modules/turn/service';

const turnCredentialsQuerySchema = z.object({
  peerId: z.string().min(1).optional(),
});

export function turnRoutes(app: FastifyInstance): void {
  app.get(
    '/turn/credentials',
    {
      schema: {
        tags: ['turn'],
        querystring: {
          type: 'object',
          properties: {
            peerId: { type: 'string' },
          },
        },
      },
    },
    (request) => {
      const query = turnCredentialsQuerySchema.parse(request.query);
      const subject = query.peerId ?? 'rtc-client';

      return issueTurnCredentials(subject);
    },
  );
}