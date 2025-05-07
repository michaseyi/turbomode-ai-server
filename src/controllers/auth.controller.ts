import { Context } from 'hono';
import { authService } from '@/services';
import { LoginPayload, RegisterPayload } from '@/types/auth.type';
import { messages } from '@/config/constants';
import assert from 'assert';
import { controllerUtil } from '@/utils';

/**
 * Login with email and password
 */
export async function login(c: Context<{}, any, { out: { json: LoginPayload } }>) {
  const body = c.req.valid('json');
  const result = await authService.login(body);

  if (!result.ok) {
    return controllerUtil.createErrorResponse(c, result.error.message, 400);
  }

  return controllerUtil.createSuccessResponse(c, result.message, result.data, 200);
}

/**
 * Register a new user
 */
export async function register(c: Context<{}, any, { out: { json: RegisterPayload } }>) {
  const body = c.req.valid('json');
  const result = await authService.register(body);

  if (!result.ok) {
    return controllerUtil.createErrorResponse(c, result.error.message, 400);
  }

  return controllerUtil.createSuccessWithoutDataResponse(c, result.message, 201);
}

/**
 * Refresh access token
 */
export async function refreshToken(c: Context) {
  const token = controllerUtil.getRefreshToken(c);

  if (!token) {
    return controllerUtil.createErrorResponse(c, messages.auth.MISSING_TOKEN, 401);
  }

  const result = await authService.refreshToken(token);

  if (!result.ok) {
    return controllerUtil.createErrorResponse(c, result.error.message, 400);
  }

  return controllerUtil.createSuccessResponse(c, result.message, result.data, 200);
}

/**
 * Logout user
 */
export async function logout(c: Context) {
  const token = controllerUtil.getAccessToken(c);

  if (!token) {
    return controllerUtil.createErrorResponse(c, messages.auth.MISSING_TOKEN, 401);
  }

  await authService.logout(token);

  return controllerUtil.createSuccessWithoutDataResponse(c, 'Logout successful', 200);
}

/**
 * Get current authenticated user
 */
export async function getCurrentUser(c: Context) {
  return controllerUtil.createSuccessResponse(c, 'User fetched', {}, 200);
}

/**
 * Handle Google OAuth callback
 */
export async function googleCallback(c: Context) {
  const user = c.get('user-google');
  assert(user, 'User data is required');

  const result = await authService.googleAuth(user);

  if (!result.ok) {
    return controllerUtil.createErrorResponse(c, result.error.message, 400);
  }

  const { accessToken, refreshToken } = result.data;

  const template = `\
<!doctype html>
<html lang="en">
  <head>
    <title>Logging in...</title>
  </head>
  <body>
    <script>
      window.opener.postMessage(
        {
          accessToken: "${accessToken}",
          refreshToken: "${refreshToken}",
        },
        'http://localhost:3000'
      );
      window.close();
    </script>
  </body>
</html>`;

  return c.html(template, 200);
}
