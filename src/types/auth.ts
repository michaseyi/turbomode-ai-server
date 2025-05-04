import { authValidation } from '@/validation';
import { z } from 'zod';

export interface AuthUser {
  id: string;
  email: string;
  isEmailVerified: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface JwtPayload {
  userId: string;
  email: string;
  type: 'access' | 'refresh';
}

export type TokenResponse = z.infer<typeof authValidation.loginResponse>;

export type LoginCredentials = z.infer<typeof authValidation.loginCredentials>;

export type RegisterCredentials = z.infer<typeof authValidation.registrationCredentials>;

export interface AuthSession {
  user: AuthUser;
  isAuthenticated: boolean;
}

export interface AuthErrorResponse {
  error: string;
  message: string;
  statusCode: number;
}

export interface AuthSuccessResponse<T = any> {
  data: T;
  message: string;
}

export interface AuthContext {
  user?: AuthUser;
  isAuthenticated: boolean;
}
