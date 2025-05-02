import { Context, Next, MiddlewareHandler } from 'hono';
import { HTTPException } from 'hono/http-exception';
import { ERROR_MESSAGES } from '@/config/constants.js';
import { env } from '@/config/env.js';
import { BaseController } from '@/controllers/base.controller';

export class ErrorMiddleware extends BaseController {
  /**
   * Catches all errors thrown during request processing and formats
   * them into consistent error responses.
   */
  errorHandler: MiddlewareHandler = async (c: Context, next: Next) => {
    try {
      return await next();
    } catch (error) {
      console.error('Uncaught error in request handler:', error);

      if (error instanceof HTTPException) {
        const message = error.message || ERROR_MESSAGES.SERVER.INTERNAL_ERROR;
        const status = error.status;
        return this.sendError(c, message, status);
      }

      const message = error instanceof Error ? error.message : ERROR_MESSAGES.SERVER.INTERNAL_ERROR;
      const errorDetails =
        env.NODE_ENV === 'development'
          ? {
              stack: error instanceof Error ? error.stack : undefined,
            }
          : undefined;
      return this.sendError(c, message, 500, errorDetails);
    }
  };

  /**
   * Handles requests for routes that don't exist with a consistent
   * 404 response.
   */
  notFoundHandler = (c: Context) => {
    return this.sendError(c, ERROR_MESSAGES.SERVER.NOT_FOUND, 404, {});
  };
}

export const errorMiddleware = new ErrorMiddleware();
