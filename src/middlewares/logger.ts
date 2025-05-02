import { BaseController } from '@/controllers/base.controller';
import { formatRequest, formatResponse, logger, loggerConfig } from '@/utils/logger';
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

    try {
      await next();

      const duration = performance.now() - startTime;

      const status = c.res ? c.res.status : 200;

      logger.info(`${formatResponse(c, status, duration)}`);

      // if (loggerConfig.level === 'debug') {
      //   const contentType = c.res?.headers.get('content-type');
      //   if (
      //     loggerConfig.showBody &&
      //     contentType &&
      //     contentType.includes('application/json') &&
      //     c.res.body
      //   ) {
      //     try {
      //       const responseText = await c.res.clone().text();
      //       if (responseText) {
      //         logger.debug(
      //           `Response body: ${responseText.substring(0, 500)}${responseText.length > 500 ? '...' : ''}`
      //         );
      //       }
      //     } catch (e) {
      //       // Ignore body parsing errors
      //     }
      //   }
      // }
    } catch (error) {
      const duration = performance.now() - startTime;

      logger.error(
        `Request failed after ${duration.toFixed(2)}ms: ${error instanceof Error ? error.message : String(error)}`
      );

      throw error;
    }
  };
}

export const loggerMiddleware = new LoggerMiddleware();
