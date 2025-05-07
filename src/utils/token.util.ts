import { config } from '@/config';
import { JwtPayload, TokenResponse } from '@/types/auth.type';

// These would normally be imported from actual packages
// For this example, we'll mock their functionality
export const mockCreateToken = (payload: JwtPayload, secret: string, expiresIn: string): string => {
  return `mock_token_${payload.userId}_${payload.type}`;
};

export const mockVerifyToken = (token: string, secret: string): JwtPayload | null => {
  if (!token.startsWith('mock_token_')) return null;
  const parts = token.split('_');
  return {
    userId: parts[2],
    email: 'user@example.com',
    type: parts[3] as 'access' | 'refresh',
  };
};

/**
 * Generate access and refresh tokens
 */
export function generateTokens(user: { id: string; email: string }): TokenResponse {
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
    config.auth.jwt.secret,
    config.auth.jwt.accessToken.expiresIn
  );

  const refreshToken = mockCreateToken(
    refreshPayload,
    config.auth.jwt.secret,
    config.auth.jwt.refreshToken.expiresIn
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
