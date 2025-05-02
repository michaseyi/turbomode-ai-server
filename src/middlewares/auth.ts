/**
 * Authentication Middleware
 *
 * Middleware for handling authentication and authorization.
 * Verifies access tokens and adds user data to request context.
 */

import type { Context, Next, MiddlewareHandler } from 'hono';
import { authService } from '@/services/auth.service.js';
import { ERROR_MESSAGES, AUTH } from '@/config/constants.js';
import { AuthUser } from '@/types/auth.js';
import { BaseController } from '@/controllers/base.controller';
import { getCookie } from 'hono/cookie';

export interface AuthContext {
  user?: AuthUser;
  isAuthenticated: boolean;
}

export class AuthMiddleware extends BaseController {
  /**
   * Verifies the access token from the request and adds the user to the context.
   * Rejects unauthorized requests with appropriate error responses.
   *
   */
  ensureAuthenticated: MiddlewareHandler = async (c: Context, next: Next) => {
    const accessToken = this.getAccessToken(c);

    if (!accessToken) {
      return c.json(
        {
          success: false,
          error: {
            message: ERROR_MESSAGES.AUTH.UNAUTHORIZED,
            status: 401,
          },
        },
        401
      );
    }

    try {
      // Verify token and get user data
      const result = await authService.validateToken(accessToken);

      if (!result.success || !result.data) {
        return c.json(
          {
            success: false,
            error: {
              message: ERROR_MESSAGES.AUTH.INVALID_TOKEN,
              status: 401,
            },
          },
          401
        );
      }

      // Add user data to request context
      c.set('user', result.data);
      c.set('isAuthenticated', true);

      // Continue to next middleware/handler
      return await next();
    } catch (error) {
      console.error('Authentication middleware error:', error);
      return c.json(
        {
          success: false,
          error: {
            message: ERROR_MESSAGES.SERVER.INTERNAL_ERROR,
            status: 500,
          },
        },
        500
      );
    }
  };

  /**
   * Ensures the authenticated user has the required role.
   * Must be used after authMiddleware.
   *
   */
  ensureRole = (requiredRole: string): MiddlewareHandler => {
    return async (c: Context, next: Next) => {
      const user = c.get('user') as AuthUser | undefined;

      if (!user) {
        return c.json(
          {
            success: false,
            error: {
              message: ERROR_MESSAGES.AUTH.UNAUTHORIZED,
              status: 401,
            },
          },
          401
        );
      }

      if (user.role !== requiredRole) {
        return c.json(
          {
            success: false,
            error: {
              message: ERROR_MESSAGES.AUTH.FORBIDDEN,
              status: 403,
            },
          },
          403
        );
      }

      return await next();
    };
  };

  /**
   * Extract access token from request
   * Checks cookies and Authorization header
   */
  private getAccessToken(c: Context): string | null {
    const cookieToken = getCookie(c, AUTH.COOKIES.ACCESS_TOKEN);
    if (cookieToken) return cookieToken;

    const authHeader = c.req.header(AUTH.HEADERS.AUTHORIZATION);
    if (authHeader && authHeader.startsWith('Bearer ')) {
      return authHeader.substring(7);
    }

    return null;
  }
}

export const authMiddleware = new AuthMiddleware();
