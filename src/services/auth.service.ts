import { AuthUser, TokenResponse, LoginPayload, RegisterPayload } from '@/types/auth.type';
import { messages } from '@/config/constants';
import { ServiceErrorCode, ServiceResult } from '@/types';
import { encryptionUtils, loggerUtils, serviceUtils, tokenUtils } from '@/utils';
import { GoogleUser } from '@hono/oauth-providers/google';
import assert from 'assert';
import { db, Role } from '@/lib/db';

/**
 * Login with email and password
 */
export async function login(payload: LoginPayload): Promise<ServiceResult<TokenResponse>> {
  const { email, password } = payload;

  const existingUser = await db.user.findUnique({ where: { email } });

  if (!existingUser) {
    return serviceUtils.createErrorResult(
      messages.auth.INVALID_CREDENTIALS,
      ServiceErrorCode.InvalidCredentials
    );
  }

  if (!existingUser.password) {
    return serviceUtils.createErrorResult(
      messages.auth.OAUTH_ACCOUNT_EXISTS,
      ServiceErrorCode.NotImplemented
    );
  }

  const isPasswordValid = await encryptionUtils.compareHash(password, existingUser.password);

  if (!isPasswordValid) {
    return serviceUtils.createErrorResult(
      messages.auth.INVALID_CREDENTIALS,
      ServiceErrorCode.InvalidCredentials
    );
  }

  const tokens = tokenUtils.generateTokens(existingUser);

  loggerUtils.info('Successful user login', tokens);

  return serviceUtils.createSuccessResult('Login successful', tokens);
}

/**
 * Register a new user
 */
export async function register(payload: RegisterPayload): Promise<ServiceResult<{}>> {
  const { email, password, firstName, lastName } = payload;

  const existingUser = await db.user.findUnique({ where: { email } });

  if (existingUser) {
    return serviceUtils.createErrorResult(messages.auth.EMAIL_TAKEN, ServiceErrorCode.Conflict);
  }

  const hashedPassword = await encryptionUtils.hash(password);

  const createdUser = await db.user.create({
    data: {
      email,
      password: hashedPassword,
      role: Role.User,
      firstName,
      lastName,
    },
  });

  loggerUtils.info('User registered', createdUser);

  return serviceUtils.createSuccessResult('User registered successfully', {});
}

/**
 * Refresh access token using refresh token
 */
export async function refreshToken(refreshToken: string): Promise<ServiceResult<TokenResponse>> {
  return serviceUtils.createErrorResult(
    messages.server.NOT_IMPLEMENTED,
    ServiceErrorCode.NotImplemented
  );
}

/**
 * Validate access token and get user data
 */
export async function validateToken(token: string): Promise<ServiceResult<AuthUser>> {
  return serviceUtils.createErrorResult(
    messages.server.NOT_IMPLEMENTED,
    ServiceErrorCode.NotImplemented
  );
}

/**
 * Logout user (blacklist token)
 */
export async function logout(token: string): Promise<ServiceResult<null>> {
  return serviceUtils.createErrorResult(
    messages.server.NOT_IMPLEMENTED,
    ServiceErrorCode.NotImplemented
  );
}

/**
 * Handle Google OAuth authentication
 */
export async function googleAuth(
  profile: Partial<GoogleUser>
): Promise<ServiceResult<TokenResponse>> {
  const { id } = profile;
  assert(id, 'Google ID is required');
  assert(profile.email, 'Email is required');
  assert(profile.given_name, 'First name is required');
  assert(profile.family_name, 'Last name is required');

  const existingUser = await db.user.findFirst({ where: { googleId: id } });

  const tokens = tokenUtils.generateTokens(
    existingUser ??
      (await db.user.create({
        data: {
          email: profile.email,
          role: Role.User,
          firstName: profile.given_name,
          lastName: profile.family_name,
          googleId: id,
        },
      }))
  );

  loggerUtils.info('User authenticated with Google', tokens);

  return serviceUtils.createSuccessResult('User authenticated with Google', tokens);
}
