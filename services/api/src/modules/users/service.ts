import type { FastifyInstance } from 'fastify';

export interface UserRow {
  id: string;
  email: string;
  displayName: string;
  avatarUrl: string | null;
}

type DbUser = { id: string; email: string; display_name: string; avatar_url: string | null };

function mapUser(row: DbUser): UserRow {
  return { id: row.id, email: row.email, displayName: row.display_name, avatarUrl: row.avatar_url };
}

export async function getUserById(app: FastifyInstance, id: string): Promise<UserRow | null> {
  const result = await app.db.query<DbUser>(
    'SELECT id, email, display_name, avatar_url FROM users WHERE id = $1',
    [id],
  );
  const row = result.rows[0];
  return row ? mapUser(row) : null;
}

export async function getUserByEmail(app: FastifyInstance, email: string): Promise<UserRow | null> {
  const result = await app.db.query<DbUser>(
    'SELECT id, email, display_name, avatar_url FROM users WHERE email = $1',
    [email],
  );
  const row = result.rows[0];
  return row ? mapUser(row) : null;
}
