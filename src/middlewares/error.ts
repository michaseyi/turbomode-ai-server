import { Context } from 'hono';
import { HTTPException } from 'hono/http-exception';
import { ERROR_MESSAGES } from '@/config/constants';
import { env } from '@/config/env';
import { BaseController } from '@/controllers/base';
import { logger } from '@/utils/logger';
import { ErrorHandler } from 'hono/types';

export class ErrorMiddleware extends BaseController {
  /**
   * Catches all errors thrown during request processing and formats
   * them into consistent error responses.
   */
  errorHandler: ErrorHandler = async (e: Error | HTTPException, c: Context) => {
    logger.error('Uncaught error in request handler', e);

    if (e instanceof HTTPException) {
      const message = e.message || ERROR_MESSAGES.SERVER.INTERNAL_ERROR;
      const status = e.status;
      return this.sendError(c, message, status);
    }

    const message = e instanceof Error ? e.message : ERROR_MESSAGES.SERVER.INTERNAL_ERROR;
    const errorDetails =
      env.NODE_ENV === 'development'
        ? {
            stack: e instanceof Error ? e.stack : undefined,
          }
        : undefined;
    return this.sendError(c, message, 500, errorDetails);
  };

  /**
   * Handles requests for routes that don't exist with a consistent
   * 404 response.
   */
  notFoundHandler = (c: Context) => {
    return this.sendError(c, ERROR_MESSAGES.SERVER.NOT_FOUND, 404, {
      path: c.req.path,
    });
  };
}

export const errorMiddleware = new ErrorMiddleware();
