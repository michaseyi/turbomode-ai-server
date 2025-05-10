import { Context } from 'hono';
import { authService, userService } from '@/services';
import { LoginPayload, RegisterPayload } from '@/types/auth.type';
import { messages } from '@/config/constants';
import assert from 'assert';
import { controllerUtils } from '@/utils';

/**
 * Login with email and password
 */
export async function login(c: Context<{}, any, { out: { json: LoginPayload } }>) {
  const body = c.req.valid('json');
  const result = await authService.login(body);

  if (!result.ok) {
    return controllerUtils.createErrorResponse(c, result.error.message, 400);
  }

  return controllerUtils.createSuccessResponse(c, result.message, result.data, 200);
}

/**
 * Register a new user
 */
export async function register(c: Context<{}, any, { out: { json: RegisterPayload } }>) {
  const body = c.req.valid('json');
  const result = await authService.register(body);

  if (!result.ok) {
    return controllerUtils.createErrorResponse(c, result.error.message, 400);
  }

  return controllerUtils.createSuccessWithoutDataResponse(c, result.message, 201);
}

/**
 * Refresh access token
 */
export async function refreshToken(c: Context) {
  const token = controllerUtils.getRefreshToken(c);

  if (!token) {
    return controllerUtils.createErrorResponse(c, messages.auth.MISSING_TOKEN, 401);
  }

  const result = await authService.refreshToken(token);

  if (!result.ok) {
    return controllerUtils.createErrorResponse(c, result.error.message, 400);
  }

  return controllerUtils.createSuccessResponse(c, result.message, result.data, 200);
}

/**
 * Logout user
 */
export async function logout(c: Context) {
  const token = controllerUtils.getAccessToken(c);

  if (!token) {
    return controllerUtils.createErrorResponse(c, messages.auth.MISSING_TOKEN, 401);
  }

  await authService.logout(token);

  return controllerUtils.createSuccessWithoutDataResponse(c, 'Logout successful', 200);
}

/**
 * Get current authenticated user
 */
export async function getCurrentUser(c: Context) {
  const user = c.get('user')!;

  const result = await userService.getUser(user.id);

  if (!result.ok) {
    return controllerUtils.createErrorResponse(c, result.error.message, 400);
  }

  return controllerUtils.createSuccessResponse(c, 'User fetched', result.data, 200);
}

/**
 * Handle Google OAuth callback
 */
export async function googleCallback(c: Context) {
  const user = c.get('user-google');
  assert(user, 'User data is required');

  const result = await authService.googleAuth(user);

  if (!result.ok) {
    return controllerUtils.createErrorResponse(c, result.error.message, 400);
  }

  return controllerUtils.createSuccessResponse(c, result.message, result.data, 200);
}
