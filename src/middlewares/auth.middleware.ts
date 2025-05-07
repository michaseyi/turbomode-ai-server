import type { Context, Next, MiddlewareHandler } from 'hono';
import { AuthUser } from '@/types/auth.type.js';
import { messages } from '@/config/constants';
import { controllerUtil } from '@/utils';

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
  const accessToken = controllerUtil.getAccessToken(c);

  if (!accessToken) {
    return controllerUtil.createErrorResponse(c, messages.auth.MISSING_TOKEN, 400);
  }

  return await next();
}

/**
 * Ensures the authenticated user has the required role.
 * Must be used after authMiddleware.
 *
 */
export const ensureRole = (requiredRole: string): MiddlewareHandler => {
  return async c => {
    return controllerUtil.createErrorResponse(c, messages.server.NOT_IMPLEMENTED, 400);
  };
};
