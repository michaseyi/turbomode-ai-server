import { loggerUtil } from '@/utils';
import { Context, Next, MiddlewareHandler } from 'hono';
import { nanoid } from 'nanoid';

/**
 * Logs incoming requests and outgoing responses with timing information.
 * Adds a unique request ID to each request for tracking.
 */
export const requestLogger: MiddlewareHandler = async (c: Context, next: Next) => {
  const requestId = nanoid(10);
  c.set('requestId', requestId);

  const startTime = performance.now();
  loggerUtil.info(`${loggerUtil.formatRequest(c, requestId)}`);

  await next();

  const duration = performance.now() - startTime;

  const status = c.res ? c.res.status : 200;

  loggerUtil.info(`${loggerUtil.formatResponse(c, status, duration)}`);
};
