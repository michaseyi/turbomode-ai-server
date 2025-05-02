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

export interface TokenResponse {
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
  tokenType: string;
}

export interface LoginCredentials {
  email: string;
  password: string;
  rememberMe?: boolean;
}

export interface RegisterData {
  email: string;
  password: string;
  passwordConfirm: string;
}

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
