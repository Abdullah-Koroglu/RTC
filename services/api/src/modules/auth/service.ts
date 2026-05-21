import type { FastifyInstance } from 'fastify';
import bcrypt from 'bcryptjs';
import type { RegisterBody, VerifyPasswordBody, UpsertOAuthUserBody } from '@/modules/auth/schema';

export function issueToken(app: FastifyInstance, payload: { subject: string; role?: string }): { accessToken: string } {
  const accessToken = app.jwt.sign({ sub: payload.subject, ...(payload.role ? { role: payload.role } : {}) });
  return { accessToken };
}

export async function registerUser(
  app: FastifyInstance,
  input: RegisterBody,
): Promise<{ id: string; email: string; displayName: string }> {
  const existing = await app.db.query<{ id: string }>(
    'SELECT id FROM users WHERE email = $1',
    [input.email],
  );
  if ((existing.rowCount ?? 0) > 0) {
    throw Object.assign(new Error('Email already registered'), { statusCode: 409 });
  }

  const passwordHash = await bcrypt.hash(input.password, 12);

  const result = await app.db.query<{ id: string; email: string; display_name: string }>(
    `INSERT INTO users (email, display_name, password_hash)
     VALUES ($1, $2, $3)
     RETURNING id, email, display_name`,
    [input.email, input.displayName, passwordHash],
  );

  const row = result.rows[0]!;
  return { id: row.id, email: row.email, displayName: row.display_name };
}

export async function verifyPassword(
  app: FastifyInstance,
  input: VerifyPasswordBody,
): Promise<{ id: string; email: string; displayName: string; avatarUrl: string | null } | null> {
  const result = await app.db.query<{
    id: string;
    email: string;
    display_name: string;
    avatar_url: string | null;
    password_hash: string | null;
  }>(
    'SELECT id, email, display_name, avatar_url, password_hash FROM users WHERE email = $1',
    [input.email],
  );

  const user = result.rows[0];
  if (!user || !user.password_hash) return null;

  const valid = await bcrypt.compare(input.password, user.password_hash);
  if (!valid) return null;

  return {
    id: user.id,
    email: user.email,
    displayName: user.display_name,
    avatarUrl: user.avatar_url,
  };
}

export async function upsertOAuthUser(
  app: FastifyInstance,
  input: UpsertOAuthUserBody,
): Promise<{ id: string; email: string; displayName: string; avatarUrl: string | null }> {
  // Check if this email exists and is already linked to a different provider
  const existing = await app.db.query<{ id: string; password_hash: string | null }>(
    'SELECT id, password_hash FROM users WHERE email = $1',
    [input.email],
  );

  if ((existing.rowCount ?? 0) > 0) {
    const userId = existing.rows[0]!.id;
    const hasPassword = existing.rows[0]!.password_hash !== null;

    // Check if this provider is already linked
    const providerLinked = await app.db.query<{ id: string }>(
      'SELECT id FROM user_providers WHERE user_id = $1 AND provider = $2',
      [userId, input.provider],
    );

    if ((providerLinked.rowCount ?? 0) === 0) {
      // Provider not linked — check if there are other providers or a password
      const otherProviders = await app.db.query<{ provider: string }>(
        'SELECT provider FROM user_providers WHERE user_id = $1 LIMIT 1',
        [userId],
      );

      if ((otherProviders.rowCount ?? 0) > 0) {
        const existingProvider = otherProviders.rows[0]!.provider;
        throw Object.assign(new Error(`Email already registered with ${existingProvider}`), {
          statusCode: 409,
          existingProvider,
        });
      }

      if (hasPassword) {
        throw Object.assign(new Error('Email already registered with password'), {
          statusCode: 409,
          existingProvider: 'credentials',
        });
      }
    }
  }

  // Upsert user by email, then link provider
  const result = await app.db.query<{ id: string; email: string; display_name: string; avatar_url: string | null }>(
    `INSERT INTO users (email, display_name, avatar_url)
     VALUES ($1, $2, $3)
     ON CONFLICT (email) DO UPDATE
       SET display_name = EXCLUDED.display_name,
           avatar_url   = COALESCE(EXCLUDED.avatar_url, users.avatar_url),
           updated_at   = now()
     RETURNING id, email, display_name, avatar_url`,
    [input.email, input.displayName, input.avatarUrl ?? null],
  );

  const user = result.rows[0]!;

  await app.db.query(
    `INSERT INTO user_providers (user_id, provider, provider_id)
     VALUES ($1, $2, $3)
     ON CONFLICT (provider, provider_id) DO NOTHING`,
    [user.id, input.provider, input.providerId],
  );

  return {
    id: user.id,
    email: user.email,
    displayName: user.display_name,
    avatarUrl: user.avatar_url,
  };
}
