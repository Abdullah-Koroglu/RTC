import type { FastifyInstance } from 'fastify';
import type { CreateUserBody } from '@/modules/users/schema';

export async function createUser(app: FastifyInstance, input: CreateUserBody): Promise<{
  id: string;
  email: string;
  displayName: string;
}> {
  const result = await app.db.query<{
    id: string;
    email: string;
    display_name: string;
  }>(
    'SELECT gen_random_uuid()::text as id, $1::text as email, $2::text as display_name',
    [input.email, input.displayName],
  );

  const row = result.rows[0];

  return {
    id: row.id,
    email: row.email,
    displayName: row.display_name,
  };
}
