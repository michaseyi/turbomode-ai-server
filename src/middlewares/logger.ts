import { BaseController } from '@/controllers/base';
import { formatRequest, formatResponse, logger } from '@/utils/logger';
import { Context, Next, MiddlewareHandler } from 'hono';
import { nanoid } from 'nanoid';

class LoggerMiddleware extends BaseController {
  /**
   * Logs incoming requests and outgoing responses with timing information.
   * Adds a unique request ID to each request for tracking.
   */
  requestLogger: MiddlewareHandler = async (c: Context, next: Next) => {
    const requestId = nanoid(10);
    c.set('requestId', requestId);

    const startTime = performance.now();
    logger.info(`${formatRequest(c, requestId)}`);

    await next();

    const duration = performance.now() - startTime;

    const status = c.res ? c.res.status : 200;

    logger.info(`${formatResponse(c, status, duration)}`);
  };
}

export const loggerMiddleware = new LoggerMiddleware();
