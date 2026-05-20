import type { FastifyInstance } from 'fastify';

export interface ContactUser {
  id: string;
  email: string;
  displayName: string;
  avatarUrl: string | null;
}

export interface ContactRequest {
  id: string;
  status: 'pending' | 'accepted' | 'rejected';
  createdAt: string;
  user: ContactUser;
}

type DbContactRequest = {
  id: string;
  status: string;
  created_at: string;
  other_id: string;
  other_email: string;
  other_display_name: string;
  other_avatar_url: string | null;
};

function mapRequest(row: DbContactRequest): ContactRequest {
  return {
    id: row.id,
    status: row.status as ContactRequest['status'],
    createdAt: row.created_at,
    user: {
      id: row.other_id,
      email: row.other_email,
      displayName: row.other_display_name,
      avatarUrl: row.other_avatar_url,
    },
  };
}

export async function sendContactRequest(
  app: FastifyInstance,
  requesterId: string,
  addresseeEmail: string,
): Promise<{ id: string }> {
  const addresseeResult = await app.db.query<{ id: string }>(
    'SELECT id FROM users WHERE email = $1',
    [addresseeEmail],
  );
  const addressee = addresseeResult.rows[0];
  if (!addressee) throw Object.assign(new Error('User not found'), { statusCode: 404 });
  if (addressee.id === requesterId) throw Object.assign(new Error('Cannot add yourself'), { statusCode: 400 });

  // Check for any existing request in either direction
  const existing = await app.db.query<{ id: string; status: string }>(
    `SELECT id, status FROM contact_requests
     WHERE (requester_id = $1 AND addressee_id = $2)
        OR (requester_id = $2 AND addressee_id = $1)`,
    [requesterId, addressee.id],
  );
  if ((existing.rowCount ?? 0) > 0) {
    const row = existing.rows[0]!;
    if (row.status === 'accepted') throw Object.assign(new Error('Already contacts'), { statusCode: 409 });
    if (row.status === 'pending') throw Object.assign(new Error('Request already pending'), { statusCode: 409 });
    // If previously rejected, allow re-sending (update it back to pending)
    await app.db.query(
      `UPDATE contact_requests SET status = 'pending', updated_at = now()
       WHERE id = $1`,
      [row.id],
    );
    return { id: row.id };
  }

  const result = await app.db.query<{ id: string }>(
    `INSERT INTO contact_requests (requester_id, addressee_id) VALUES ($1, $2) RETURNING id`,
    [requesterId, addressee.id],
  );
  return { id: result.rows[0]!.id };
}

export async function getIncomingRequests(app: FastifyInstance, userId: string): Promise<ContactRequest[]> {
  const result = await app.db.query<DbContactRequest>(
    `SELECT cr.id, cr.status, cr.created_at,
            u.id as other_id, u.email as other_email,
            u.display_name as other_display_name, u.avatar_url as other_avatar_url
     FROM contact_requests cr
     JOIN users u ON u.id = cr.requester_id
     WHERE cr.addressee_id = $1 AND cr.status = 'pending'
     ORDER BY cr.created_at DESC`,
    [userId],
  );
  return result.rows.map(mapRequest);
}

export async function getOutgoingRequests(app: FastifyInstance, userId: string): Promise<ContactRequest[]> {
  const result = await app.db.query<DbContactRequest>(
    `SELECT cr.id, cr.status, cr.created_at,
            u.id as other_id, u.email as other_email,
            u.display_name as other_display_name, u.avatar_url as other_avatar_url
     FROM contact_requests cr
     JOIN users u ON u.id = cr.addressee_id
     WHERE cr.requester_id = $1 AND cr.status = 'pending'
     ORDER BY cr.created_at DESC`,
    [userId],
  );
  return result.rows.map(mapRequest);
}

export async function respondToRequest(
  app: FastifyInstance,
  requestId: string,
  userId: string,
  action: 'accept' | 'reject',
): Promise<void> {
  const result = await app.db.query<{ id: string }>(
    `UPDATE contact_requests
     SET status = $1, updated_at = now()
     WHERE id = $2 AND addressee_id = $3 AND status = 'pending'
     RETURNING id`,
    [action === 'accept' ? 'accepted' : 'rejected', requestId, userId],
  );
  if ((result.rowCount ?? 0) === 0) {
    throw Object.assign(new Error('Request not found or already responded'), { statusCode: 404 });
  }
}

export async function getContacts(app: FastifyInstance, userId: string): Promise<ContactUser[]> {
  const result = await app.db.query<{
    id: string; email: string; display_name: string; avatar_url: string | null;
  }>(
    `SELECT
       CASE WHEN cr.requester_id = $1 THEN u2.id ELSE u1.id END as id,
       CASE WHEN cr.requester_id = $1 THEN u2.email ELSE u1.email END as email,
       CASE WHEN cr.requester_id = $1 THEN u2.display_name ELSE u1.display_name END as display_name,
       CASE WHEN cr.requester_id = $1 THEN u2.avatar_url ELSE u1.avatar_url END as avatar_url
     FROM contact_requests cr
     JOIN users u1 ON u1.id = cr.requester_id
     JOIN users u2 ON u2.id = cr.addressee_id
     WHERE (cr.requester_id = $1 OR cr.addressee_id = $1) AND cr.status = 'accepted'
     ORDER BY display_name`,
    [userId],
  );
  return result.rows.map((r) => ({
    id: r.id,
    email: r.email,
    displayName: r.display_name,
    avatarUrl: r.avatar_url,
  }));
}

export async function removeContact(
  app: FastifyInstance,
  userId: string,
  contactId: string,
): Promise<void> {
  await app.db.query(
    `DELETE FROM contact_requests
     WHERE status = 'accepted'
       AND ((requester_id = $1 AND addressee_id = $2) OR (requester_id = $2 AND addressee_id = $1))`,
    [userId, contactId],
  );
}
