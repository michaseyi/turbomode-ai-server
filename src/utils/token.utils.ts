import { config } from '@/config';
import { timeMs } from '@/config/constants';
import { AuthUser, JwtPayload, TokenResponse } from '@/types/auth.type';
import jwt from 'jsonwebtoken';

export function jwtSign<T>(payload: JwtPayload<T>, secret: string, expiresIn: number): string {
  return jwt.sign(payload, secret, { expiresIn });
}

export function jwtVerify<T>(token: string, secret: string): JwtPayload<T> | null {
  return jwt.verify(token, secret) as JwtPayload<T>;
}

/**
 * Generate access and refresh tokens
 */
export function generateTokens(user: AuthUser): TokenResponse {
  const tokenPayload: JwtPayload<AuthUser> = {
    data: {
      email: user.email,
      id: user.id,
      isEmailVerified: user.isEmailVerified,
      role: user.role,
    },
    type: 'access',
  };

  const refreshPayload: JwtPayload<Pick<AuthUser, 'email' | 'id'>> = {
    data: {
      email: user.email,
      id: user.id,
    },
    type: 'refresh',
  };
  const accessToken = jwtSign(
    tokenPayload,
    config.auth.jwt.secret,
    config.auth.jwt.accessToken.expiresIn
  );

  const refreshToken = jwtSign(
    refreshPayload,
    config.auth.jwt.secret,
    config.auth.jwt.refreshToken.expiresIn
  );

  const expiresIn = Math.floor(timeMs.HOUR / 1000);

  return {
    accessToken,
    refreshToken,
    expiresIn,
    tokenType: 'Bearer',
  };
}

/**
 * Get token payload
 */

export function getTokenData<T>(token: string, type: JwtPayload<any>['type']): T | null {
  const data = jwtVerify<T>(token, config.auth.jwt.secret);

  if (!data) {
    return null;
  }

  if (data.type !== type) {
    return null;
  }

  return data.data;
}
