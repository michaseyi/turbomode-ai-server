import { AuthUser, TokenResponse, LoginPayload, RegisterPayload } from '@/types/auth.type';
import { messages } from '@/config/constants';
import { ServiceErrorCode, ServiceResult } from '@/types';
import { encryptionUtil, loggerUtil, serviceUtil, tokenUtil } from '@/utils';
import { GoogleUser } from '@hono/oauth-providers/google';
import assert from 'assert';
import { db } from '@/db';

/**
 * Login with email and password
 */
export async function login(payload: LoginPayload): Promise<ServiceResult<TokenResponse>> {
  const { email, password } = payload;

  const existingUser = await db.user.findUnique({ where: { email } });

  if (!existingUser) {
    return serviceUtil.createErrorResult(
      messages.auth.INVALID_CREDENTIALS,
      ServiceErrorCode.InvalidCredentials
    );
  }

  if (!existingUser.password) {
    return serviceUtil.createErrorResult(
      messages.auth.OAUTH_ACCOUNT_EXISTS,
      ServiceErrorCode.NotImplemented
    );
  }

  const isPasswordValid = await encryptionUtil.compareHash(password, existingUser.password);

  if (!isPasswordValid) {
    return serviceUtil.createErrorResult(
      messages.auth.INVALID_CREDENTIALS,
      ServiceErrorCode.InvalidCredentials
    );
  }

  const tokens = tokenUtil.generateTokens(existingUser);

  loggerUtil.info('Successful user login', tokens);

  return serviceUtil.createSuccessResult('Login successful', tokens);
}

/**
 * Register a new user
 */
export async function register(payload: RegisterPayload): Promise<ServiceResult<{}>> {
  const { email, password, firstName, lastName } = payload;

  const existingUser = await db.user.findUnique({ where: { email } });

  if (existingUser) {
    return serviceUtil.createErrorResult(messages.auth.EMAIL_TAKEN, ServiceErrorCode.Conflict);
  }

  const hashedPassword = await encryptionUtil.hash(password);

  const createdUser = await db.user.create({
    data: {
      email,
      password: hashedPassword,
      firstName,
      lastName,
    },
  });

  loggerUtil.info('User registered', createdUser);

  return serviceUtil.createSuccessResult('User registered successfully', {});
}

/**
 * Refresh access token using refresh token
 */
export async function refreshToken(refreshToken: string): Promise<ServiceResult<TokenResponse>> {
  return serviceUtil.createErrorResult(
    messages.server.NOT_IMPLEMENTED,
    ServiceErrorCode.NotImplemented
  );
}

/**
 * Validate access token and get user data
 */
export async function validateToken(token: string): Promise<ServiceResult<AuthUser>> {
  return serviceUtil.createErrorResult(
    messages.server.NOT_IMPLEMENTED,
    ServiceErrorCode.NotImplemented
  );
}

/**
 * Logout user (blacklist token)
 */
export async function logout(token: string): Promise<ServiceResult<null>> {
  return serviceUtil.createErrorResult(
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

  const tokens = tokenUtil.generateTokens(
    existingUser ??
      (await db.user.create({
        data: {
          email: profile.email,
          firstName: profile.given_name,
          lastName: profile.family_name,
          googleId: id,
        },
      }))
  );

  loggerUtil.info('User authenticated with Google', tokens);

  return serviceUtil.createSuccessResult('User authenticated with Google', tokens);
}
