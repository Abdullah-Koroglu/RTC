import fp from 'fastify-plugin';
import { ZodError } from 'zod';
import { formatZodError } from '@/utils/zod';
import { AppError } from '@/utils/errors';

export const errorHandlerPlugin = fp(async (app) => {
  app.setErrorHandler((error, request, reply) => {
    request.log.error(
      {
        err: error,
        requestId: request.id,
      },
      'request_failed',
    );

    if (error instanceof AppError) {
      return reply.status(error.statusCode).send({
        code: error.code,
        message: error.message,
        details: error.details,
      });
    }

    if (error instanceof ZodError) {
      return reply.status(400).send({
        code: 'VALIDATION_ERROR',
        message: formatZodError(error),
      });
    }

    if ('validation' in error && Array.isArray((error as { validation?: unknown }).validation)) {
      return reply.status(400).send({
        code: 'REQUEST_VALIDATION_ERROR',
        message: error.message,
      });
    }

    return reply.status(500).send({
      code: 'INTERNAL_SERVER_ERROR',
      message: 'Unexpected server error',
    });
  });
});
