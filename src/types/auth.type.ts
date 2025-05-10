import { authValidation } from '@/validation';
import { Role } from '@prisma/client';
import { z } from 'zod';

export interface AuthUser {
  id: string;
  email: string;
  isEmailVerified: boolean;
  role: Role;
}

export interface JwtPayload<T> {
  data: T;
  type: 'access' | 'refresh';
}

export type TokenResponse = z.infer<typeof authValidation.loginResponse>;

export type LoginPayload = z.infer<typeof authValidation.loginCredentials>;

export type RegisterPayload = z.infer<typeof authValidation.registrationCredentials>;

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
