/**
 * Error Handling Middleware
 * 
 * Provides global error handling and not found response handling.
 * Ensures consistent error responses throughout the application.
 */

import { Context, Next, MiddlewareHandler } from 'hono';
import { HTTPException } from 'hono/http-exception';
import { ERROR_MESSAGES } from '@/config/constants.js';
import { env } from '@/config/env.js';

/**
 * Global error handling middleware
 * 
 * Catches all errors thrown during request processing and formats
 * them into consistent error responses.
 * 
 * Usage:
 * ```
 * app.use('*', errorMiddleware);
 * ```
 */
export const errorMiddleware: MiddlewareHandler = async (c: Context, next: Next) => {
  try {
    await next();
  } catch (error) {
    console.error('Uncaught error in request handler:', error);
    
    // Handle Hono's HTTP exceptions
    if (error instanceof HTTPException) {
      const message = error.message || ERROR_MESSAGES.SERVER.INTERNAL_ERROR;
      const status = error.status;
      
      return c.json({
        success: false,
        error: {
          message,
          status,
        }
      }, status);
    }
    
    // Handle any other errors
    const message = error instanceof Error ? error.message : ERROR_MESSAGES.SERVER.INTERNAL_ERROR;
    const errorDetails = env.NODE_ENV === 'development' ? {
      stack: error instanceof Error ? error.stack : undefined,
    } : undefined;
    
    return c.json({
      success: false,
      error: {
        message,
        status: 500,
        ...(errorDetails && { details: errorDetails }),
      }
    }, 500);
  }
};

/**
 * Not found handler middleware
 * 
 * Handles requests for routes that don't exist with a consistent
 * 404 response.
 * 
 * Usage:
 * ```
 * app.notFound(notFoundMiddleware);
 * ```
 */
export const notFoundMiddleware = (c: Context) => {
  return c.json({
    success: false,
    error: {
      message: ERROR_MESSAGES.SERVER.NOT_FOUND,
      status: 404,
      path: c.req.path,
    }
  }, 404);
};

