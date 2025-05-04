import { Context } from 'hono';
import { BaseController } from '@/controllers/base';
import { authService } from '@/services/auth';
import { LoginCredentials, RegisterCredentials } from '@/types/auth';
import { authConfig } from '@/config/auth';
import { AUTH, ERROR_MESSAGES } from '@/config/constants';
import { deleteCookie, getCookie, setCookie } from 'hono/cookie';
import assert from 'assert';

export class AuthController extends BaseController {
  /**
   * Login with email and password
   */
  async login(c: Context<{}, any, { out: { json: LoginCredentials } }>) {
    const body = c.req.valid('json');

    const result = await authService.login(body);

    if (!result.ok) {
      return this.sendError(c, result.error.message, 400);
    }

    return this.sendSuccess(c, result.message, result.data, 200);
  }

  /**
   * Register a new user
   */
  async register(c: Context<{}, any, { out: { json: RegisterCredentials } }>) {
    const body = c.req.valid('json');

    const result = await authService.register(body);

    if (!result.ok) {
      return this.sendError(c, result.error.message, 400);
    }

    return this.sendSuccessWithoutData(c, result.message, 201);
  }

  /**
   * Refresh access token
   */
  async refreshToken(c: Context) {
    const refreshToken = this.getRefreshToken(c);

    if (!refreshToken) {
      return this.sendError(c, ERROR_MESSAGES.AUTH.MISSING_TOKEN, 401);
    }

    const result = await authService.refreshToken(refreshToken);

    if (!result.ok) {
      return this.sendError(c, result.error.message, 400);
    }

    return this.sendSuccess(c, result.message, result.data, 200);
  }

  /**
   * Logout user
   */
  async logout(c: Context) {
    const accessToken = this.getAccessToken(c);

    if (!accessToken) {
      return this.sendError(c, ERROR_MESSAGES.AUTH.MISSING_TOKEN, 401);
    }

    await authService.logout(accessToken);

    return this.sendSuccessWithoutData(c, 'Logout successful', 200);
  }

  /**
   * Get current authenticated user
   */
  async getCurrentUser(c: Context) {
    return this.sendSuccess(c, 'User fetched', {}, 200);
  }

  /**
   * Handle Google OAuth callback
   */
  async googleCallback(c: Context) {
    // const token = c.get('token');
    const user = c.get('user-google');

    assert(user, 'User data is required');

    const result = await authService.googleAuth(user);

    if (!result.ok) {
      return this.sendError(c, result.error.message, 400);
    }

    return this.sendSuccess(c, result.message, result.data, 200);
  }
}

// Export singleton instance
export const authController = new AuthController();
