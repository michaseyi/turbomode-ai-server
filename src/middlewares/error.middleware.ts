import { Context } from 'hono';
import { HTTPException } from 'hono/http-exception';
import { messages } from '@/config/constants';
import { env } from '@/config/env';
import { loggerUtils } from '@/utils';
import { ErrorHandler } from 'hono/types';
import { controllerUtils } from '@/utils';

/**
 * Catches all errors thrown during request processing and formats
 * them into consistent error responses.
 */
export const errorHandler: ErrorHandler = async (e: Error | HTTPException, c: Context) => {
  loggerUtils.error('Uncaught error in request handler', e);

  if (e instanceof HTTPException) {
    const message = e.message || messages.server.INTERNAL_ERROR;
    const status = e.status;
    return controllerUtils.createErrorResponse(c, message, status);
  }

  const message =
    env.NODE_ENV === 'production'
      ? messages.server.INTERNAL_ERROR
      : e instanceof Error
        ? e.message
        : messages.server.INTERNAL_ERROR;
  const errorDetails =
    env.NODE_ENV === 'development'
      ? {
          stack: e instanceof Error ? e.stack : undefined,
        }
      : undefined;
  return controllerUtils.createErrorResponse(c, message, 500, errorDetails);
};

/**
 * Handles requests for routes that don't exist with a consistent
 * 404 response.
 */
export const notFoundHandler = (c: Context) => {
  return controllerUtils.createErrorResponse(c, messages.server.NOT_FOUND, 404, {
    path: c.req.path,
  });
};
