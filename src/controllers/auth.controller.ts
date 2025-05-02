/**
 * Authentication Controller
 *
 * Handles HTTP requests for authentication endpoints.
 */

import { Context } from 'hono';
import { BaseController } from '@/controllers/base.controller';
import { authService } from '@/services/auth.service';
import { LoginCredentials, RegisterData, GoogleProfile } from '@/types/auth';
import { authConfig } from '@/config/auth';
import { AUTH, ERROR_MESSAGES, VALIDATION } from '@/config/constants';
import { deleteCookie, getCookie, setCookie } from 'hono/cookie';

/**
 * Authentication Controller
 */
export class AuthController extends BaseController {
  /**
   * Login with email and password
   */
  async login(c: Context) {
    try {
      // Parse and validate request body
      const body = await c.req.json();

      // Validate required fields
      if (!body.email || !body.password) {
        return this.sendError(c, 'Email and password are required', 400);
      }

      // Validate email format
      if (!VALIDATION.EMAIL.PATTERN.test(body.email)) {
        return this.sendError(c, VALIDATION.EMAIL.MESSAGE, 400);
      }
      const credentials: LoginCredentials = {
        email: body.email,
        password: body.password,
        rememberMe: body.rememberMe || false,
      };

      // Attempt login
      const result = await authService.login(credentials);

      if (!result.success) {
        return this.sendError(c, result.error.message, result.error.status);
      }

      // Set cookies for tokens if using cookie-based auth
      this.setAuthCookies(c, result.data);

      return this.sendSuccess(c, {
        user: result.data,
        message: 'Login successful',
      });
    } catch (error) {
      console.error('Login error:', error);
      return this.sendError(c, ERROR_MESSAGES.SERVER.INTERNAL_ERROR, 500);
    }
  }

  /**
   * Register a new user
   */
  async register(c: Context) {
    try {
      // Parse and validate request body
      const body = await c.req.json();

      // Validate required fields
      if (!body.email || !body.username || !body.password || !body.passwordConfirm) {
        return this.sendError(c, 'All fields are required', 400);
      }

      // Validate email format
      if (!VALIDATION.EMAIL.PATTERN.test(body.email)) {
        return this.sendError(c, VALIDATION.EMAIL.MESSAGE, 400);
      }

      // Validate username format
      if (!VALIDATION.USERNAME.PATTERN.test(body.username)) {
        return this.sendError(c, VALIDATION.USERNAME.MESSAGE, 400);
      }

      // Validate password
      if (!VALIDATION.PASSWORD.PATTERN.test(body.password)) {
        return this.sendError(c, VALIDATION.PASSWORD.MESSAGE, 400);
      }

      // Check if passwords match
      if (body.password !== body.passwordConfirm) {
        return this.sendError(c, 'Passwords do not match', 400);
      }

      const registerData: RegisterData = {
        email: body.email,
        username: body.username,
        password: body.password,
        passwordConfirm: body.passwordConfirm,
      };

      // Attempt registration
      const result = await authService.register(registerData);

      if (!result.success) {
        return this.sendError(c, result.error.message, result.error.status);
      }

      return this.sendSuccess(c, {
        user: result.data,
        message: 'Registration successful',
      });
    } catch (error) {
      console.error('Registration error:', error);
      return this.sendError(c, ERROR_MESSAGES.SERVER.INTERNAL_ERROR, 500);
    }
  }

  /**
   * Refresh access token
   */
  async refreshToken(c: Context) {
    try {
      // Get refresh token from cookies or authorization header
      const refreshToken = this.getRefreshToken(c);

      if (!refreshToken) {
        return this.sendError(c, ERROR_MESSAGES.AUTH.MISSING_TOKEN, 401);
      }

      // Attempt to refresh the token
      const result = await authService.refreshToken(refreshToken);

      if (!result.success) {
        return this.sendError(c, result.error.message, result.error.status);
      }

      // Set cookies for tokens if using cookie-based auth
      this.setAuthCookies(c, result.data);

      return this.sendSuccess(c, {
        tokens: result.data,
        message: 'Token refreshed successfully',
      });
    } catch (error) {
      console.error('Token refresh error:', error);
      return this.sendError(c, ERROR_MESSAGES.SERVER.INTERNAL_ERROR, 500);
    }
  }

  /**
   * Logout user
   */
  async logout(c: Context) {
    try {
      // Get access token
      const accessToken = this.getAccessToken(c);

      if (!accessToken) {
        return this.sendSuccess(c, { message: 'Already logged out' });
      }

      // Attempt logout
      const result = await authService.logout(accessToken);

      // Clear auth cookies
      this.clearAuthCookies(c);

      return this.sendSuccess(c, { message: 'Logout successful' });
    } catch (error) {
      console.error('Logout error:', error);
      return this.sendError(c, ERROR_MESSAGES.SERVER.INTERNAL_ERROR, 500);
    }
  }

  /**
   * Get current authenticated user
   */
  async getCurrentUser(c: Context) {
    try {
      // Get access token
      const accessToken = this.getAccessToken(c);

      if (!accessToken) {
        return this.sendError(c, ERROR_MESSAGES.AUTH.UNAUTHORIZED, 401);
      }

      // Validate token and get user data
      const result = await authService.validateToken(accessToken);

      if (!result.success) {
        return this.sendError(c, result.error.message, result.error.status);
      }

      return this.sendSuccess(c, {
        user: result.data,
      });
    } catch (error) {
      console.error('Get current user error:', error);
      return this.sendError(c, ERROR_MESSAGES.SERVER.INTERNAL_ERROR, 500);
    }
  }

  /**
   * Initiate Google OAuth flow
   */
  async googleAuth(c: Context) {
    // The actual OAuth redirect would be handled by a library like passport
    // For now, we'll just return a mock URL
    const googleAuthUrl = `https://accounts.google.com/o/oauth2/v2/auth?client_id=${
      authConfig.google.clientID
    }&redirect_uri=${encodeURIComponent(
      authConfig.google.callbackURL
    )}&response_type=code&scope=${authConfig.google.scope.join(' ')}`;

    // Redirect to Google auth URL
    return c.redirect(googleAuthUrl);
  }

  /**
   * Handle Google OAuth callback
   */
  async googleCallback(c: Context) {
    try {
      // In a real implementation, we would get the authorization code from the query params
      // and exchange it for tokens, then get the user profile from Google

      // For now, we'll use a mock profile
      const mockGoogleProfile: GoogleProfile = {
        id: '123456789',
        displayName: 'Test User',
        name: {
          familyName: 'User',
          givenName: 'Test',
        },
        emails: [{ value: 'test@example.com', verified: true }],
        photos: [{ value: 'https://example.com/photo.jpg' }],
        provider: 'google',
        _raw: '',
        _json: {
          sub: '123456789',
          name: 'Test User',
          given_name: 'Test',
          family_name: 'User',
          picture: 'https://example.com/photo.jpg',
          email: 'test@example.com',
          email_verified: true,
          locale: 'en',
        },
      };

      // Process Google authentication
      const result = await authService.googleAuth(mockGoogleProfile);

      if (!result.success) {
        return this.sendError(c, result.error.message, result.error.status);
      }

      // Set cookies for tokens if using cookie-based auth
      this.setAuthCookies(c, result.data);

      // Redirect to front-end with success
      return c.redirect('/auth/success');
    } catch (error) {
      console.error('Google callback error:', error);
      return this.sendError(c, ERROR_MESSAGES.AUTH.OAUTH_FAILURE, 500);
    }
  }

  // ===== Helper Methods =====

  /**
   * Set authentication cookies
   */
  private setAuthCookies(c: Context, tokens: any) {
    // Set access token cookie
    setCookie(c, AUTH.COOKIES.ACCESS_TOKEN, tokens.accessToken, {
      httpOnly: authConfig.cookies.httpOnly,
      secure: authConfig.cookies.secure,
      sameSite: authConfig.cookies.sameSite,
      maxAge: tokens.expiresIn * 1000,
      path: '/',
    });

    // Set refresh token cookie with longer expiry
    setCookie(c, AUTH.COOKIES.REFRESH_TOKEN, tokens.refreshToken, {
      httpOnly: authConfig.cookies.httpOnly,
      secure: authConfig.cookies.secure,
      sameSite: authConfig.cookies.sameSite,
      maxAge: 30 * 24 * 60 * 60 * 1000, // 30 days
      path: '/',
    });
  }

  /**
   * Clear authentication cookies
   */
  private clearAuthCookies(c: Context) {
    deleteCookie(c, AUTH.COOKIES.ACCESS_TOKEN, {
      httpOnly: true,
      secure: authConfig.cookies.secure,
      maxAge: 0,
      path: '/',
    });

    deleteCookie(c, AUTH.COOKIES.REFRESH_TOKEN, {
      httpOnly: true,
      secure: authConfig.cookies.secure,
      maxAge: 0,
      path: '/',
    });
  }

  /**
   * Get access token from request
   */
  private getAccessToken(c: Context): string | null {
    // Try to get from cookie first
    const cookieToken = getCookie(c, AUTH.COOKIES.ACCESS_TOKEN);
    if (cookieToken) return cookieToken;

    // Then try Authorization header
    const authHeader = c.req.header(AUTH.HEADERS.AUTHORIZATION);
    if (authHeader && authHeader.startsWith('Bearer ')) {
      return authHeader.substring(7);
    }

    return null;
  }

  /**
   * Get refresh token from request
   */
  private getRefreshToken(c: Context): string | null {
    // Try to get from cookie first
    const cookieToken = getCookie(c, AUTH.COOKIES.REFRESH_TOKEN);
    if (cookieToken) return cookieToken;

    // Then try to get from body or header
    const body = c.req.body;
    if (body && body.refreshToken) return body.refreshToken;

    return null;
  }
}

// Export singleton instance
export const authController = new AuthController();
