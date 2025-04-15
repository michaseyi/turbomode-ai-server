/**
 * Authentication configuration
 * 
 * Contains settings for JWT, local authentication, and OAuth providers.
 */

import { env } from '@/config/env';

/**
 * JWT Configuration
 */
export const jwtConfig = {
  secret: env.JWT_SECRET,
  accessToken: {
    expiresIn: env.JWT_EXPIRES_IN,
  },
  refreshToken: {
    expiresIn: env.JWT_REFRESH_EXPIRES_IN,
  },
};

/**
 * Local Authentication Configuration
 */
export const localAuthConfig = {
  usernameField: 'email',
  passwordField: 'password',
  session: false,
  // Password requirements
  password: {
    minLength: 8,
    requireLowercase: true,
    requireUppercase: true,
    requireNumbers: true,
    requireSpecialChars: true,
  },
};

/**
 * Google OAuth Configuration
 */
export const googleAuthConfig = {
  clientID: env.GOOGLE_CLIENT_ID,
  clientSecret: env.GOOGLE_CLIENT_SECRET,
  callbackURL: env.GOOGLE_CALLBACK_URL,
  scope: ['profile', 'email'],
};

/**
 * Authentication types
 */
export type AuthProvider = 'local' | 'google';

/**
 * User role types
 */
export enum UserRole {
  USER = 'USER',
  ADMIN = 'ADMIN',
}

/**
 * Authentication configuration
 */
export const authConfig = {
  jwt: jwtConfig,
  local: localAuthConfig,
  google: googleAuthConfig,
  // Cookie settings for auth tokens
  cookies: {
    httpOnly: true,
    secure: env.NODE_ENV === 'production',
    sameSite: 'strict' as const,
    maxAge: 30 * 24 * 60 * 60 * 1000, // 30 days
  },
  // Session settings
  session: {
    name: 'turbomode.sid',
    secret: env.JWT_SECRET,
    resave: false,
    saveUninitialized: false,
    cookie: {
      httpOnly: true,
      secure: env.NODE_ENV === 'production',
      maxAge: 24 * 60 * 60 * 1000, // 24 hours
    },
  },
};

