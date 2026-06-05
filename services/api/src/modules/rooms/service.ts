import type { FastifyInstance } from 'fastify';
import bcrypt from 'bcryptjs';
import { randomBytes } from 'node:crypto';
import type { CreateRoomBody } from '@/modules/rooms/schema';

export type RoomType = 'public' | 'password' | 'invite_only';

export interface RoomInfo {
  id: string;
  roomCode: string;
  hostUserId: string | null;
  type: RoomType;
  status: 'active' | 'expired' | 'ended';
  isLocked: boolean;
  isExpired: boolean;
  expiresAt: string;
  createdAt: string;
  endedAt: string | null;
}

type DbRoom = {
  id: string;
  room_code: string;
  host_user_id: string | null;
  type: string;
  is_locked: boolean;
  expires_at: string;
  created_at: string;
  ended_at: string | null;
};

function mapRoom(row: DbRoom): RoomInfo {
  const ended = row.ended_at !== null;
  const expired = new Date(row.expires_at) < new Date();
  return {
    id: row.id,
    roomCode: row.room_code,
    hostUserId: row.host_user_id,
    type: row.type as RoomType,
    status: ended ? 'ended' : expired ? 'expired' : 'active',
    isLocked: row.is_locked,
    isExpired: ended || expired,
    expiresAt: row.expires_at,
    createdAt: row.created_at,
    endedAt: row.ended_at,
  };
}

function generateRoomCode(): string {
  return randomBytes(5).toString('hex'); // 10 char hex, e.g. "3f8a2c1d9b"
}

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export async function createRoom(
  app: FastifyInstance,
  input: CreateRoomBody,
  hostUserId: string | null,
): Promise<RoomInfo> {
  const roomCode = generateRoomCode();
  const passwordHash = input.password ? await bcrypt.hash(input.password, 10) : null;
  // Only pass a real UUID as host — anonymous/non-UUID values become null
  const validHostId = hostUserId && UUID_RE.test(hostUserId) ? hostUserId : null;

  const result = await app.db.query<DbRoom>(
    `INSERT INTO rooms (room_code, host_user_id, type, password_hash)
     VALUES ($1, $2, $3, $4)
     RETURNING id, room_code, host_user_id, type, is_locked, expires_at, created_at, ended_at`,
    [roomCode, validHostId, input.type, passwordHash],
  );
  const room = result.rows[0]!;

  if (input.inviteUserIds?.length) {
    for (const userId of input.inviteUserIds) {
      await app.db.query(
        `INSERT INTO room_invites (room_id, user_id, invited_by) VALUES ($1, $2, $3) ON CONFLICT DO NOTHING`,
        [room.id, userId, hostUserId],
      );
    }
  }

  return mapRoom(room);
}

export async function getRoomByCode(app: FastifyInstance, roomCode: string): Promise<RoomInfo | null> {
  const result = await app.db.query<DbRoom>(
    `SELECT id, room_code, host_user_id, type, is_locked, expires_at, created_at, ended_at
     FROM rooms WHERE room_code = $1`,
    [roomCode],
  );
  const row = result.rows[0];
  return row ? mapRoom(row) : null;
}

export async function verifyRoomPassword(
  app: FastifyInstance,
  roomCode: string,
  password: string,
): Promise<boolean> {
  const result = await app.db.query<{ password_hash: string | null }>(
    'SELECT password_hash FROM rooms WHERE room_code = $1',
    [roomCode],
  );
  const row = result.rows[0];
  if (!row?.password_hash) return false;
  return bcrypt.compare(password, row.password_hash);
}

export async function isUserInvited(
  app: FastifyInstance,
  roomCode: string,
  userId: string,
): Promise<boolean> {
  const result = await app.db.query<{ id: string }>(
    `SELECT ri.id FROM room_invites ri
     JOIN rooms r ON r.id = ri.room_id
     WHERE r.room_code = $1 AND ri.user_id = $2`,
    [roomCode, userId],
  );
  return (result.rowCount ?? 0) > 0;
}

export async function addInvite(
  app: FastifyInstance,
  roomCode: string,
  userId: string,
  invitedBy: string,
): Promise<void> {
  await app.db.query(
    `INSERT INTO room_invites (room_id, user_id, invited_by)
     SELECT r.id, $2, $3 FROM rooms r WHERE r.room_code = $1
     ON CONFLICT DO NOTHING`,
    [roomCode, userId, invitedBy],
  );
}

export async function removeInvite(
  app: FastifyInstance,
  roomCode: string,
  userId: string,
): Promise<void> {
  await app.db.query(
    `DELETE FROM room_invites ri
     USING rooms r
     WHERE r.id = ri.room_id AND r.room_code = $1 AND ri.user_id = $2`,
    [roomCode, userId],
  );
}

export async function getRoomInvites(
  app: FastifyInstance,
  roomCode: string,
): Promise<Array<{ userId: string; email: string; displayName: string }>> {
  const result = await app.db.query<{ user_id: string; email: string; display_name: string }>(
    `SELECT u.id as user_id, u.email, u.display_name
     FROM room_invites ri
     JOIN rooms r ON r.id = ri.room_id
     JOIN users u ON u.id = ri.user_id
     WHERE r.room_code = $1`,
    [roomCode],
  );
  return result.rows.map((r) => ({ userId: r.user_id, email: r.email, displayName: r.display_name }));
}

export async function createJoinRequest(
  app: FastifyInstance,
  roomCode: string,
  peerId: string,
  displayName: string,
  userId: string | null,
): Promise<string> {
  // Upsert: if previously denied, re-request
  const result = await app.db.query<{ id: string }>(
    `INSERT INTO room_join_requests (room_code, peer_id, user_id, display_name)
     VALUES ($1, $2, $3, $4)
     ON CONFLICT (room_code, peer_id) DO UPDATE
       SET status = 'pending', display_name = EXCLUDED.display_name, resolved_at = NULL
     RETURNING id`,
    [roomCode, peerId, userId, displayName],
  );
  return result.rows[0]!.id;
}

export async function getPendingJoinRequests(
  app: FastifyInstance,
  roomCode: string,
): Promise<Array<{ id: string; peerId: string; displayName: string | null; userId: string | null; createdAt: string }>> {
  const result = await app.db.query<{ id: string; peer_id: string; display_name: string | null; user_id: string | null; created_at: string }>(
    `SELECT id, peer_id, display_name, user_id, created_at
     FROM room_join_requests
     WHERE room_code = $1 AND status = 'pending'
     ORDER BY created_at`,
    [roomCode],
  );
  return result.rows.map((r) => ({
    id: r.id,
    peerId: r.peer_id,
    displayName: r.display_name,
    userId: r.user_id,
    createdAt: r.created_at,
  }));
}

export async function resolveJoinRequest(
  app: FastifyInstance,
  requestId: string,
  action: 'approve' | 'deny',
): Promise<{ peerId: string; roomCode: string } | null> {
  const status = action === 'approve' ? 'approved' : 'denied';
  const result = await app.db.query<{ peer_id: string; room_code: string }>(
    `UPDATE room_join_requests
     SET status = $1, resolved_at = now()
     WHERE id = $2 AND status = 'pending'
     RETURNING peer_id, room_code`,
    [status, requestId],
  );
  const row = result.rows[0];
  return row ? { peerId: row.peer_id, roomCode: row.room_code } : null;
}

export async function resolveJoinRequestByPeer(
  app: FastifyInstance,
  roomCode: string,
  peerId: string,
  action: 'approve' | 'deny',
): Promise<void> {
  const status = action === 'approve' ? 'approved' : 'denied';
  await app.db.query(
    `UPDATE room_join_requests
     SET status = $1, resolved_at = now()
     WHERE room_code = $2 AND peer_id = $3 AND status = 'pending'`,
    [status, roomCode, peerId],
  );
}

export async function endRoom(app: FastifyInstance, roomCode: string): Promise<RoomInfo | null> {
  const result = await app.db.query<DbRoom>(
    `UPDATE rooms
     SET ended_at = COALESCE(ended_at, now())
     WHERE room_code = $1
     RETURNING id, room_code, host_user_id, type, is_locked, expires_at, created_at, ended_at`,
    [roomCode],
  );
  const row = result.rows[0];
  return row ? mapRoom(row) : null;
}
