import type { Context, Next, MiddlewareHandler } from 'hono';
import type { AuthUser } from '@/types/auth.type.js';
import { messages } from '@/config/constants';
import { controllerUtils, tokenUtils } from '@/utils';
import { db, Role } from '@/lib/db';
import { config } from '@/config';

export interface AuthContext {
  user?: AuthUser;
  isAuthenticated: boolean;
}

/**
 * Verifies the access token from the request and adds the user to the context.
 * Rejects unauthorized requests with appropriate error responses.
 *
 */
export async function ensureAuthenticated(c: Context, next: Next) {
  const accessToken = controllerUtils.getAccessToken(c);

  if (!accessToken) {
    return controllerUtils.createErrorResponse(c, messages.auth.NOT_AUTHENTICATED, 401);
  }

  const user = tokenUtils.getTokenData<AuthUser>(accessToken, 'access');

  if (!user) {
    return controllerUtils.createErrorResponse(c, messages.auth.NOT_AUTHENTICATED, 401);
  }

  if (config.app.environment === 'development') {
    if (!(await db.user.count({ where: { id: user.id } }))) {
      return controllerUtils.createErrorResponse(c, messages.auth.NOT_AUTHENTICATED, 401);
    }
  }

  c.set('user', user);

  return await next();
}

/**
 * Ensures the authenticated user has the required role.
 * Must be used after authMiddleware.
 *
 */
export const ensureRole = (role: Role): MiddlewareHandler => {
  return async (c, next) => {
    const user = c.get('user');

    if (!user) {
      return controllerUtils.createErrorResponse(c, messages.auth.NOT_AUTHENTICATED, 401);
    }

    if (user.role !== role) {
      return controllerUtils.createErrorResponse(c, messages.auth.NOT_AUTHORIZED, 403);
    }

    return await next();
  };
};
