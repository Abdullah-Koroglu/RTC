import type { FastifyReply, FastifyRequest, RouteHandlerMethod } from 'fastify';

export function asyncHandler<TRequest extends FastifyRequest = FastifyRequest>(
  fn: (request: TRequest, reply: FastifyReply) => Promise<unknown>,
): RouteHandlerMethod {
  return async (request, reply) => fn(request as TRequest, reply);
}
