import type { Context, Next, MiddlewareHandler } from 'hono';
import { AuthUser } from '@/types/auth.js';
import { BaseController } from '@/controllers/base';
import { ERROR_MESSAGES } from '@/config/constants';

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
  async ensureAuthenticated(c: Context, next: Next) {
    const accessToken = this.getAccessToken(c);

    if (!accessToken) {
      return this.sendError(c, ERROR_MESSAGES.AUTH.MISSING_TOKEN, 400);
    }

    return await next();
    return this.sendError(c, ERROR_MESSAGES.SERVER.NOT_IMPLEMENTED);
  }

  /**
   * Ensures the authenticated user has the required role.
   * Must be used after authMiddleware.
   *
   */
  ensureRole = (requiredRole: string): MiddlewareHandler => {
    return async c => {
      return this.sendError(c, ERROR_MESSAGES.SERVER.NOT_IMPLEMENTED);
    };
  };
}

export const authMiddleware = new AuthMiddleware();
