import { Context } from 'hono';
import { HTTPException } from 'hono/http-exception';
import type { ContentfulStatusCode, StatusCode } from 'hono/utils/http-status';

import {} from '@/app.js';

/**
 * Base controller class with common response methods
 * All controllers should extend this class for consistent response handling
 */
export class BaseController {
  /**
   * Send a successful response with data
   */
  protected sendSuccess<T>(c: Context, data: T, status: ContentfulStatusCode = 200) {
    return c.json(
      {
        success: true,
        data,
      } as const,
      status
    );
  }

  /**
   * Send a paginated response with metadata
   */
  protected sendPaginated<T>(
    c: Context,
    data: T[],
    { total, page, limit }: { total: number; page: number; limit: number }
  ) {
    return c.json(
      {
        success: true,
        data,
        pagination: {
          total,
          page,
          limit,
          pages: Math.ceil(total / limit),
          hasMore: page * limit < total,
        },
      },
      200
    );
  }

  /**
   * Send an error response
   */
  protected sendError(
    c: Context,
    message: string,
    status: ContentfulStatusCode = 400,
    errors?: Record<string, string[]>
  ) {
    return c.json(
      {
        success: false,
        error: {
          message,
          ...(errors && { details: errors }),
        },
      } as const,
      status
    );
  }

  /**
   * Create and throw an HTTP exception
   */
  protected throwError(message: string, status: ContentfulStatusCode = 400): never {
    throw new HTTPException(status, { message });
  }

  /**
   * Send a no content response (204)
   */
  protected sendNoContent(c: Context) {
    return c.body(null, 204);
  }
}
