import { BaseService } from '@/services';
import {
  AuthUser,
  JwtPayload,
  TokenResponse,
  LoginCredentials,
  RegisterCredentials,
} from '@/types/auth';
import { authConfig } from '@/config/auth';
import { ERROR_MESSAGES } from '@/config/constants';
import { ServiceResult } from '@/types';
import { logger } from '@/utils/logger';
import { GoogleUser } from '@hono/oauth-providers/google';
import assert from 'assert';

// These would normally be imported from actual packages
// For this example, we'll mock their functionality
const mockCreateToken = (payload: JwtPayload, secret: string, expiresIn: string): string => {
  return `mock_token_${payload.userId}_${payload.type}`;
};

const mockVerifyToken = (token: string, secret: string): JwtPayload | null => {
  if (!token.startsWith('mock_token_')) return null;
  const parts = token.split('_');
  return {
    userId: parts[2],
    email: 'user@example.com',
    type: parts[3] as 'access' | 'refresh',
  };
};

const mockHashPassword = async (password: string): Promise<string> => {
  return `hashed_${password}`;
};

const mockComparePassword = async (password: string, hash: string): Promise<boolean> => {
  return hash === `hashed_${password}`;
};

export class AuthService extends BaseService {
  /**
   * Login with email and password
   */
  async login(loginCredentials: LoginCredentials): Promise<ServiceResult<TokenResponse>> {
    const { email, password } = loginCredentials;

    const existingUser = await this.db.user.findUnique({ where: { email } });

    if (!existingUser) {
      return this.error(ERROR_MESSAGES.AUTH.INVALID_CREDENTIALS);
    }

    if (!existingUser.password) {
      return this.error(ERROR_MESSAGES.AUTH.OAUTH_ACCOUNT_EXISTS);
    }

    const isPasswordValid = await mockComparePassword(password, existingUser.password);

    if (!isPasswordValid) {
      return this.error(ERROR_MESSAGES.AUTH.INVALID_CREDENTIALS);
    }

    const tokens = this.generateTokens(existingUser);

    logger.info('User logged in', tokens);

    return this.success('Login successful', tokens);
  }

  /**
   * Register a new user
   */
  async register(registerCredentials: RegisterCredentials): Promise<ServiceResult<{}>> {
    const { email, password, firstName, lastName } = registerCredentials;

    const existingUser = await this.db.user.findUnique({ where: { email } });

    if (existingUser) {
      return this.error(ERROR_MESSAGES.AUTH.EMAIL_TAKEN);
    }

    const hashedPassword = await mockHashPassword(password);

    const createdUser = await this.db.user.create({
      data: {
        email,
        password: hashedPassword,
        firstName,
        lastName,
      },
    });

    logger.info('User registered', createdUser);

    return this.success('User registered successfully', {});
  }

  /**
   * Refresh access token using refresh token
   */
  async refreshToken(refreshToken: string): Promise<ServiceResult<TokenResponse>> {
    return this.error(ERROR_MESSAGES.SERVER.NOT_IMPLEMENTED);
  }

  /**
   * Validate access token and get user data
   */
  async validateToken(token: string): Promise<ServiceResult<AuthUser>> {
    return this.error(ERROR_MESSAGES.SERVER.NOT_IMPLEMENTED);
  }

  /**
   * Handle Google OAuth authentication
   */
  async googleAuth(profile: Partial<GoogleUser>): Promise<ServiceResult<TokenResponse>> {
    const { id } = profile;
    assert(id, 'Google ID is required');
    assert(profile.email, 'Email is required');
    assert(profile.given_name, 'First name is required');
    assert(profile.family_name, 'Last name is required');

    const existingUser = await this.db.user.findFirst({ where: { googleId: id } });

    const tokens = this.generateTokens(
      existingUser ??
        (await this.db.user.create({
          data: {
            email: profile.email,
            firstName: profile.given_name,
            lastName: profile.family_name,
            googleId: id,
          },
        }))
    );

    logger.info('User authenticated with Google', tokens);

    return this.error(ERROR_MESSAGES.SERVER.NOT_IMPLEMENTED);
  }

  /**
   * Logout user (blacklist token)
   */
  async logout(token: string): Promise<ServiceResult<null>> {
    return this.error(ERROR_MESSAGES.SERVER.NOT_IMPLEMENTED);
  }

  /**
   * Generate access and refresh tokens
   */
  private generateTokens(user: { id: string; email: string }): TokenResponse {
    const tokenPayload: JwtPayload = {
      userId: user.id,
      email: user.email,
      type: 'access',
    };

    const refreshPayload: JwtPayload = {
      ...tokenPayload,
      type: 'refresh',
    };

    const accessToken = mockCreateToken(
      tokenPayload,
      authConfig.jwt.secret,
      authConfig.jwt.accessToken.expiresIn
    );

    const refreshToken = mockCreateToken(
      refreshPayload,
      authConfig.jwt.secret,
      authConfig.jwt.refreshToken.expiresIn
    );

    const expiresInMs = 3600 * 1000; // 1 hour
    const expiresIn = Math.floor(expiresInMs / 1000);

    return {
      accessToken,
      refreshToken,
      expiresIn,
      tokenType: 'Bearer',
    };
  }
}

// Export singleton instance
export const authService = new AuthService();
