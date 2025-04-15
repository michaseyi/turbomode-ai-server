/**
 * Authentication Service
 * 
 * Handles authentication logic including local login, OAuth, JWT tokens and sessions.
 */

import { prisma } from './index';
import { BaseService } from './index';
import { 
  AuthUser, 
  JwtPayload, 
  TokenResponse, 
  LoginCredentials, 
  RegisterData, 
  GoogleProfile 
} from '../types/auth';
import { authConfig, UserRole } from '../config/auth';
import { ERROR_MESSAGES } from '../config/constants';
import { ServiceResult } from '../types/index';

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
    role: UserRole.USER,
    type: parts[3] as 'access' | 'refresh',
  };
};

const mockHashPassword = async (password: string): Promise<string> => {
  return `hashed_${password}`;
};

const mockComparePassword = async (password: string, hash: string): Promise<boolean> => {
  return hash === `hashed_${password}`;
};

/**
 * Authentication Service
 */
export class AuthService extends BaseService {
  /**
   * Login with email and password
   */
  async login(credentials: LoginCredentials): Promise<ServiceResult<TokenResponse>> {
    try {
      const { email, password } = credentials;

      // Find user by email
      const user = await this.prisma.user.findUnique({
        where: { email },
      });

      if (!user) {
        return {
          success: false,
          error: {
            message: ERROR_MESSAGES.AUTH.INVALID_CREDENTIALS,
            status: 401,
          }
        };
      }

      // Check if the account is using local auth
      if (user.provider !== 'local') {
        return {
          success: false,
          error: {
            message: `This account uses ${user.provider} authentication. Please sign in with ${user.provider}.`,
            status: 400,
          }
        };
      }

      // Verify password
      const isPasswordValid = await mockComparePassword(password, user.password);
      if (!isPasswordValid) {
        return {
          success: false,
          error: {
            message: ERROR_MESSAGES.AUTH.INVALID_CREDENTIALS,
            status: 401,
          }
        };
      }

      // Generate tokens
      const tokens = this.generateTokens(user);

      return {
        success: true,
        data: tokens,
      };
    } catch (error) {
      console.error('Login error:', error);
      return {
        success: false,
        error: {
          message: ERROR_MESSAGES.SERVER.INTERNAL_ERROR,
          status: 500,
        }
      };
    }
  }

  /**
   * Register a new user
   */
  async register(data: RegisterData): Promise<ServiceResult<AuthUser>> {
    try {
      const { email, username, password, passwordConfirm } = data;

      // Validate passwords match
      if (password !== passwordConfirm) {
        return {
          success: false,
          error: {
            message: 'Passwords do not match',
            status: 400,
          }
        };
      }

      // Check if email already exists
      const emailExists = await this.prisma.user.findUnique({
        where: { email },
      });

      if (emailExists) {
        return {
          success: false,
          error: {
            message: ERROR_MESSAGES.AUTH.EMAIL_ALREADY_EXISTS,
            status: 400,
          }
        };
      }

      // Check if username already exists
      if (username) {
        const usernameExists = await this.prisma.user.findUnique({
          where: { username },
        });

        if (usernameExists) {
          return {
            success: false,
            error: {
              message: ERROR_MESSAGES.AUTH.USERNAME_ALREADY_EXISTS,
              status: 400,
            }
          };
        }
      }

      // Hash password
      const hashedPassword = await mockHashPassword(password);

      // Create user
      const newUser = await this.prisma.user.create({
        data: {
          email,
          username,
          password: hashedPassword,
          provider: 'local',
          role: UserRole.USER,
          isEmailVerified: false,
        },
      });

      // Format user data for response (exclude password)
      const userData: AuthUser = {
        id: newUser.id,
        email: newUser.email,
        username: newUser.username,
        role: newUser.role as UserRole,
        provider: newUser.provider as 'local',
        isEmailVerified: newUser.isEmailVerified,
        createdAt: newUser.createdAt,
        updatedAt: newUser.updatedAt,
      };

      return {
        success: true,
        data: userData,
      };
    } catch (error) {
      console.error('Registration error:', error);
      return {
        success: false,
        error: {
          message: ERROR_MESSAGES.SERVER.INTERNAL_ERROR,
          status: 500,
        }
      };
    }
  }

  /**
   * Refresh access token using refresh token
   */
  async refreshToken(refreshToken: string): Promise<ServiceResult<TokenResponse>> {
    try {
      // Verify refresh token
      const payload = mockVerifyToken(refreshToken, authConfig.jwt.secret);
      
      if (!payload || payload.type !== 'refresh') {
        return {
          success: false,
          error: {
            message: ERROR_MESSAGES.AUTH.INVALID_TOKEN,
            status: 401,
          }
        };
      }

      // Find user
      const user = await this.prisma.user.findUnique({
        where: { id: payload.userId },
      });

      if (!user) {
        return {
          success: false,
          error: {
            message: ERROR_MESSAGES.USER.NOT_FOUND,
            status: 404,
          }
        };
      }

      // Generate new tokens
      const tokens = this.generateTokens(user);

      return {
        success: true,
        data: tokens,
      };
    } catch (error) {
      console.error('Token refresh error:', error);
      return {
        success: false,
        error: {
          message: ERROR_MESSAGES.AUTH.INVALID_TOKEN,
          status: 401,
        }
      };
    }
  }

  /**
   * Validate access token and get user data
   */
  async validateToken(token: string): Promise<ServiceResult<AuthUser>> {
    try {
      // Verify access token
      const payload = mockVerifyToken(token, authConfig.jwt.secret);
      
      if (!payload || payload.type !== 'access') {
        return {
          success: false,
          error: {
            message: ERROR_MESSAGES.AUTH.INVALID_TOKEN,
            status: 401,
          }
        };
      }

      // Find user
      const user = await this.prisma.user.findUnique({
        where: { id: payload.userId },
      });

      if (!user) {
        return {
          success: false,
          error: {
            message: ERROR_MESSAGES.USER.NOT_FOUND,
            status: 404,
          }
        };
      }

      // Format user data (exclude password)
      const userData: AuthUser = {
        id: user.id,
        email: user.email,
        username: user.username,
        role: user.role as UserRole,
        provider: user.provider as 'local' | 'google',
        isEmailVerified: user.isEmailVerified,
        createdAt: user.createdAt,
        updatedAt: user.updatedAt,
      };

      return {
        success: true,
        data: userData,
      };
    } catch (error) {
      console.error('Token validation error:', error);
      return {
        success: false,
        error: {
          message: ERROR_MESSAGES.AUTH.INVALID_TOKEN,
          status: 401,
        }
      };
    }
  }

  /**
   * Handle Google OAuth authentication
   */
  async googleAuth(profile: GoogleProfile): Promise<ServiceResult<TokenResponse>> {
    try {
      const email = profile.emails?.[0]?.value;
      if (!email) {
        return {
          success: false,
          error: {
            message: 'Email is required from Google profile',
            status: 400,
          }
        };
      }

      // Check if user already exists
      let user = await this.prisma.user.findUnique({
        where: { email },
      });

      if (user) {
        // If user exists but used a different provider, update the provider
        if (user.provider !== 'google') {
          user = await this.prisma.user.update({
            where: { id: user.id },
            data: {
              provider: 'google',
              googleId: profile.id,
              isEmailVerified: true,
            },
          });
        }
      } else {
        // Create new user from Google profile
        user = await this.prisma.user.create({
          data: {
            email,
            username: profile.displayName.replace(/\s+/g, '').toLowerCase(),
            googleId: profile.id,
            provider: 'google',
            role: UserRole.USER,
            isEmailVerified: true,
            profile: {
              create: {
                firstName: profile.name?.givenName,
                lastName: profile.name?.familyName,
                avatar: profile.photos?.[0]?.value,
              }
            }
          },
        });
      }

      // Generate tokens
      const tokens = this.generateTokens(user);

      return {
        success: true,
        data: tokens,
      };
    } catch (error) {
      console.error('Google auth error:', error);
      return {
        success: false,
        error: {
          message: ERROR_MESSAGES.AUTH.OAUTH_FAILURE,
          status: 500,
        }
      };
    }
  }

  /**
   * Logout user (blacklist token)
   */
  async logout(token: string): Promise<ServiceResult<null>> {
    try {
      // In a real implementation, you would blacklist the token
      // For now, we'll just return success

      return {
        success: true,
        data: null,
      };
    } catch (error) {
      console.error('Logout error:', error);
      return {
        success: false,
        error: {
          message: ERROR_MESSAGES.SERVER.INTERNAL_ERROR,
          status: 500,
        }
      };
    }
  }

  /**
   * Generate access and refresh tokens
   */
  private generateTokens(user: any): TokenResponse {
    // Create JWT payload
    const tokenPayload: JwtPayload = {
      userId: user.id,
      email: user.email,
      role: user.role,
      type: 'access',
    };

    // Create refresh token payload
    const refreshPayload: JwtPayload = {
      ...tokenPayload,
      type: 'refresh',
    };

    // Generate tokens
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

    // Calculate expiry in seconds (this is mock functionality)
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

