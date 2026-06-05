import type { FastifyInstance } from 'fastify';
import { env } from '@/config/env';
import {
  createRoomBodySchema,
  verifyPasswordBodySchema,
  addInviteBodySchema,
  respondJoinRequestBodySchema,
} from '@/modules/rooms/schema';
import {
  createRoom,
  getRoomByCode,
  verifyRoomPassword,
  isUserInvited,
  addInvite,
  removeInvite,
  getRoomInvites,
  createJoinRequest,
  getPendingJoinRequests,
  resolveJoinRequest,
  resolveJoinRequestByPeer,
  endRoom,
} from '@/modules/rooms/service';

export async function roomRoutes(app: FastifyInstance): Promise<void> {
  // Create a room (internal: called from web BFF)
  app.post('/rooms', { preHandler: [app.authenticateInternal] }, async (request, reply) => {
    const body = createRoomBodySchema.parse(request.body);
    const room = await createRoom(app, body, request.internalUserId || null);
    return reply.code(201).send(room);
  });

  // Get room info by code (public — lobby page fetches this)
  app.get('/rooms/:code', async (request, reply) => {
    const { code } = request.params as { code: string };
    const room = await getRoomByCode(app, code);
    if (!room) return reply.code(404).send({ code: 'NOT_FOUND', message: 'Room not found' });
    // Don't expose password_hash — only return public metadata
    return room;
  });

  // Verify password
  app.post('/rooms/:code/verify-password', async (request, reply) => {
    const { code } = request.params as { code: string };
    const { password } = verifyPasswordBodySchema.parse(request.body);
    const room = await getRoomByCode(app, code);
    if (!room) return reply.code(404).send({ code: 'NOT_FOUND', message: 'Room not found' });
    if (room.isExpired) return reply.code(410).send({ code: 'EXPIRED', message: 'Room has expired' });
    const valid = await verifyRoomPassword(app, code, password);
    return { valid };
  });

  // Check if current user is invited
  app.get('/rooms/:code/invites/me', { preHandler: [app.authenticateInternal] }, async (request) => {
    const { code } = request.params as { code: string };
    const invited = await isUserInvited(app, code, request.internalUserId);
    return { invited };
  });

  // List invites (host only — caller responsible for verifying host)
  app.get('/rooms/:code/invites', { preHandler: [app.authenticateInternal] }, async (request) => {
    const { code } = request.params as { code: string };
    return getRoomInvites(app, code);
  });

  // Add an invite
  app.post('/rooms/:code/invites', { preHandler: [app.authenticateInternal] }, async (request, reply) => {
    const { code } = request.params as { code: string };
    const { userId } = addInviteBodySchema.parse(request.body);
    await addInvite(app, code, userId, request.internalUserId);
    return reply.code(201).send({ ok: true });
  });

  // Remove an invite
  app.delete('/rooms/:code/invites/:userId', { preHandler: [app.authenticateInternal] }, async (request, reply) => {
    const { code, userId } = request.params as { code: string; userId: string };
    await removeInvite(app, code, userId);
    return reply.code(204).send();
  });

  // Create a join request (waiting room entry)
  app.post('/rooms/:code/join-requests', async (request, reply) => {
    const { code } = request.params as { code: string };
    const { peerId, displayName, userId } = request.body as { peerId: string; displayName?: string; userId?: string };
    const room = await getRoomByCode(app, code);
    if (!room) return reply.code(404).send({ code: 'NOT_FOUND', message: 'Room not found' });
    if (room.isExpired) return reply.code(410).send({ code: 'EXPIRED', message: 'Room has expired' });
    if (room.isLocked) return reply.code(403).send({ code: 'LOCKED', message: 'Room is locked' });
    const id = await createJoinRequest(app, code, peerId, displayName ?? peerId, userId ?? null);

    // Notify signaling so it can forward the request to the host via WebSocket
    if (env.SIGNALING_INTERNAL_URL) {
      void fetch(`${env.SIGNALING_INTERNAL_URL}/internal/join-request-notify`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ roomId: code, peerId, displayName: displayName ?? peerId }),
      }).catch((err: unknown) => {
        app.log.warn({ err }, 'signaling_join_request_notify_failed');
      });
    }

    return reply.code(201).send({ id });
  });

  // List pending join requests (host only)
  app.get('/rooms/:code/join-requests', { preHandler: [app.authenticateInternal] }, async (request) => {
    const { code } = request.params as { code: string };
    return getPendingJoinRequests(app, code);
  });

  // Status check for a specific peer's join request (public — waiting peer polls this)
  app.get('/rooms/:code/join-requests/status', async (request, reply) => {
    const { code } = request.params as { code: string };
    const { peerId } = request.query as { peerId?: string };
    if (!peerId) return reply.code(400).send({ code: 'BAD_REQUEST', message: 'peerId required' });
    const result = await app.db.query<{ status: string }>(
      `SELECT status FROM room_join_requests WHERE room_code = $1 AND peer_id = $2 ORDER BY created_at DESC LIMIT 1`,
      [code, peerId],
    );
    const row = result.rows[0];
    if (!row) return reply.code(404).send({ code: 'NOT_FOUND', message: 'Request not found' });
    return { status: row.status };
  });

  // Approve or deny by peerId (called from signaling service after WebSocket decision)
  app.patch('/rooms/:code/join-requests/peer/:peerId', { preHandler: [app.authenticateInternal] }, async (request, reply) => {
    const { code, peerId } = request.params as { code: string; peerId: string };
    const { action } = respondJoinRequestBodySchema.parse(request.body);
    await resolveJoinRequestByPeer(app, code, peerId, action);
    return reply.code(204).send();
  });

  // Approve or deny a join request by DB id (host only)
  app.patch('/rooms/:code/join-requests/:id', { preHandler: [app.authenticateInternal] }, async (request, reply) => {
    const { id } = request.params as { code: string; id: string };
    const { action } = respondJoinRequestBodySchema.parse(request.body);
    const result = await resolveJoinRequest(app, id, action);
    if (!result) return reply.code(404).send({ code: 'NOT_FOUND', message: 'Request not found or already resolved' });
    return { ok: true, peerId: result.peerId };
  });

  // Force-end a room and notify signaling to evict active participants.
  app.post('/rooms/:code/end', { preHandler: [app.authenticateInternal] }, async (request, reply) => {
    const { code } = request.params as { code: string };
    const room = await endRoom(app, code);
    if (!room) {
      return reply.code(404).send({ code: 'NOT_FOUND', message: 'Room not found' });
    }

    let signalingNotified = false;
    if (env.SIGNALING_INTERNAL_URL) {
      try {
        const res = await fetch(`${env.SIGNALING_INTERNAL_URL}/internal/rooms/${code}/end`, {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${env.INTERNAL_API_SECRET}`,
            'x-user-id': request.internalUserId,
          },
        });
        signalingNotified = res.ok;
        if (!res.ok) {
          app.log.warn({ code, status: res.status }, 'signaling_room_end_notify_failed');
        }
      } catch (err: unknown) {
        app.log.warn({ err, code }, 'signaling_room_end_notify_error');
      }
    }

    return reply.send({
      ok: true,
      room,
      signalingNotified,
    });
  });
}
