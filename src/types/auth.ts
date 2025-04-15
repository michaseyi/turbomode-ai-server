/**
 * Authentication Types
 * 
 * Type definitions for authentication, JWT tokens, and user sessions.
 */

import { UserRole, AuthProvider } from '../config/auth';

/**
 * User Authentication Model
 */
export interface AuthUser {
  id: string;
  email: string;
  username?: string;
  role: UserRole;
  provider: AuthProvider;
  isEmailVerified: boolean;
  createdAt: Date;
  updatedAt: Date;
}

/**
 * JWT Token Payload
 */
export interface JwtPayload {
  userId: string;
  email: string;
  role: UserRole;
  type: 'access' | 'refresh';
}

/**
 * Token Response
 */
export interface TokenResponse {
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
  tokenType: string;
}

/**
 * Login Credentials
 */
export interface LoginCredentials {
  email: string;
  password: string;
  rememberMe?: boolean;
}

/**
 * Registration Data
 */
export interface RegisterData {
  email: string;
  username: string;
  password: string;
  passwordConfirm: string;
}

/**
 * OAuth Profile from Google
 */
export interface GoogleProfile {
  id: string;
  displayName: string;
  name?: {
    familyName?: string;
    givenName?: string;
  };
  emails?: Array<{ value: string; verified: boolean }>;
  photos?: Array<{ value: string }>;
  provider: 'google';
  _raw: string;
  _json: {
    sub: string;
    name?: string;
    given_name?: string;
    family_name?: string;
    picture?: string;
    email?: string;
    email_verified?: boolean;
    locale?: string;
  };
}

/**
 * Auth Session Data
 */
export interface AuthSession {
  user: AuthUser;
  isAuthenticated: boolean;
}

/**
 * Authentication Error Response
 */
export interface AuthErrorResponse {
  error: string;
  message: string;
  statusCode: number;
}

/**
 * Authentication Success Response
 */
export interface AuthSuccessResponse<T = any> {
  data: T;
  message: string;
}

/**
 * Auth Context for middleware
 */
export interface AuthContext {
  user?: AuthUser;
  isAuthenticated: boolean;
}

