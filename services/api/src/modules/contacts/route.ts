import type { FastifyInstance } from 'fastify';
import { sendRequestBodySchema, respondRequestBodySchema } from '@/modules/contacts/schema';
import {
  sendContactRequest,
  getIncomingRequests,
  getOutgoingRequests,
  respondToRequest,
  getContacts,
  removeContact,
} from '@/modules/contacts/service';

export async function contactRoutes(app: FastifyInstance): Promise<void> {
  const auth = { preHandler: [app.authenticateInternal] };

  // List accepted contacts
  app.get('/contacts', auth, async (request) => {
    return getContacts(app, request.internalUserId);
  });

  // Send a contact request by email
  app.post('/contacts/request', auth, async (request, reply) => {
    const { email } = sendRequestBodySchema.parse(request.body);
    try {
      const result = await sendContactRequest(app, request.internalUserId, email);
      return reply.code(201).send(result);
    } catch (err: unknown) {
      const e = err as Error & { statusCode?: number };
      if (e.statusCode === 404) return reply.code(404).send({ code: 'NOT_FOUND', message: e.message });
      if (e.statusCode === 400) return reply.code(400).send({ code: 'BAD_REQUEST', message: e.message });
      if (e.statusCode === 409) return reply.code(409).send({ code: 'CONFLICT', message: e.message });
      throw err;
    }
  });

  // Incoming pending requests (I am the addressee)
  app.get('/contacts/requests/incoming', auth, async (request) => {
    return getIncomingRequests(app, request.internalUserId);
  });

  // Outgoing pending requests (I am the requester)
  app.get('/contacts/requests/outgoing', auth, async (request) => {
    return getOutgoingRequests(app, request.internalUserId);
  });

  // Accept or reject a request
  app.patch('/contacts/requests/:id', auth, async (request, reply) => {
    const { id } = request.params as { id: string };
    const { action } = respondRequestBodySchema.parse(request.body);
    try {
      await respondToRequest(app, id, request.internalUserId, action);
      return reply.code(204).send();
    } catch (err: unknown) {
      const e = err as Error & { statusCode?: number };
      if (e.statusCode === 404) return reply.code(404).send({ code: 'NOT_FOUND', message: e.message });
      throw err;
    }
  });

  // Remove a contact
  app.delete('/contacts/:contactId', auth, async (request, reply) => {
    const { contactId } = request.params as { contactId: string };
    await removeContact(app, request.internalUserId, contactId);
    return reply.code(204).send();
  });
}
