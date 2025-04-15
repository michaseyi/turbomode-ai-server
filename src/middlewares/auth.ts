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

/**
 * Authentication Context interface
 * Added to the request context when authenticated
 */
export interface AuthContext {
  user?: AuthUser;
  isAuthenticated: boolean;
}

/**
 * Authentication Middleware
 * 
 * Verifies the access token from the request and adds the user to the context.
 * Rejects unauthorized requests with appropriate error responses.
 * 
 * Usage:
 * ```
 * router.use('/protected', authMiddleware);
 * ```
 */
export const authMiddleware: MiddlewareHandler = async (c: Context, next: Next) => {
  // Get access token from request
  const accessToken = getAccessToken(c);
  
  if (!accessToken) {
    return c.json({
      success: false,
      error: {
        message: ERROR_MESSAGES.AUTH.UNAUTHORIZED,
        status: 401,
      }
    }, 401);
  }
  
  try {
    // Verify token and get user data
    const result = await authService.validateToken(accessToken);
    
    if (!result.success || !result.data) {
      return c.json({
        success: false,
        error: {
          message: ERROR_MESSAGES.AUTH.INVALID_TOKEN,
          status: 401,
        }
      }, 401);
    }
    
    // Add user data to request context
    c.set('user', result.data);
    c.set('isAuthenticated', true);
    
    // Continue to next middleware/handler
    await next();
  } catch (error) {
    console.error('Authentication middleware error:', error);
    return c.json({
      success: false,
      error: {
        message: ERROR_MESSAGES.SERVER.INTERNAL_ERROR,
        status: 500,
      }
    }, 500);
  }
};

/**
 * Role-based Authorization Middleware
 * 
 * Ensures the authenticated user has the required role.
 * Must be used after authMiddleware.
 * 
 * Usage:
 * ```
 * router.use('/admin', authMiddleware, roleMiddleware('ADMIN'));
 * ```
 */
export const roleMiddleware = (requiredRole: string): MiddlewareHandler => {
  return async (c: Context, next: Next) => {
    const user = c.get('user') as AuthUser | undefined;
    
    if (!user) {
      return c.json({
        success: false,
        error: {
          message: ERROR_MESSAGES.AUTH.UNAUTHORIZED,
          status: 401,
        }
      }, 401);
    }
    
    if (user.role !== requiredRole) {
      return c.json({
        success: false,
        error: {
          message: ERROR_MESSAGES.AUTH.FORBIDDEN,
          status: 403,
        }
      }, 403);
    }
    
    await next();
  };
};

/**
 * Helper Functions
 */

/**
 * Extract access token from request
 * Checks cookies and Authorization header
 */
export function getAccessToken(c: Context): string | null {
  // Try to get from cookie
  const cookieToken = c.req.cookie(AUTH.COOKIES.ACCESS_TOKEN);
  if (cookieToken) return cookieToken;
  
  // Try to get from Authorization header
  const authHeader = c.req.header(AUTH.HEADERS.AUTHORIZATION);
  if (authHeader && authHeader.startsWith('Bearer ')) {
    return authHeader.substring(7);
  }
  
  return null;
}

