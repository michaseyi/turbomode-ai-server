import { authController } from '@/controllers';
import { authMiddleware } from '@/middlewares/auth';
import { googleAuth } from '@hono/oauth-providers/google';
import { authConfig } from '@/config';
import { authValidation, baseValidation, resolveApiResponse } from '@/validation';
import { createRoute, OpenAPIHono, z } from '@hono/zod-openapi';

const authRouter = new OpenAPIHono();

authRouter.openapi(
  createRoute({
    method: 'post',
    path: '/login',
    description: 'Authenticate user with email and password',
    tags: ['Auth'],
    request: {
      body: {
        content: {
          'application/json': {
            schema: authValidation.loginCredentials,
          },
        },
      },
    },
    responses: {
      200: {
        description: 'Successful login',
        content: {
          'application/json': {
            schema: resolveApiResponse(authValidation.loginResponse),
          },
        },
      },

      400: {
        description: 'Invalid credentials',
        content: {
          'application/json': {
            schema: baseValidation.apiErrorResponse,
          },
        },
      },
    },
  }),
  async c => authController.login(c)
);

authRouter.openapi(
  createRoute({
    method: 'post',
    path: '/register',
    description: 'Register a new user with email, password and basic information.',
    tags: ['Auth'],
    request: {
      body: {
        content: {
          'application/json': {
            schema: authValidation.registrationCredentials,
          },
        },
      },
    },
    responses: {
      201: {
        description: 'User successfully registered.',
        content: {
          'application/json': {
            schema: baseValidation.apiDatalessResponse,
          },
        },
      },
      400: {
        description: 'Registration failed due to validation error or duplicate email.',
        content: {
          'application/json': {
            schema: baseValidation.apiErrorResponse,
          },
        },
      },
    },
  }),
  c => authController.register(c)
);

/**
 * @route POST /auth/refresh
 * @description Refresh access token using refresh token
 * @access Public
 */
authRouter.post('/refresh', c => authController.refreshToken(c));

/**
 * @route POST /auth/logout
 * @description Logout user and invalidate tokens
 * @access Private
 */
authRouter.post('/logout', authMiddleware.ensureAuthenticated, c => authController.logout(c));

/**
 * @route GET /auth/me
 * @description Get current authenticated user
 * @access Private
 */

authRouter.openapi(
  createRoute({
    method: 'get',
    path: '/me',
    description: '',
    tags: ['Auth'],
    responses: {
      200: {
        description: '',
        content: {
          'application/json': {
            schema: z.any(),
          },
        },
      },
    },

    middleware: [(c, n) => authMiddleware.ensureAuthenticated(c, n)],
  }),
  c => authController.getCurrentUser(c)
);

authRouter.openapi(
  createRoute({
    method: 'get',
    path: '/oauth/google',
    description: '',
    tags: ['Auth'],
    responses: {
      200: {
        description: '',
        content: {
          'application/json': {
            schema: resolveApiResponse(authValidation.loginResponse),
          },
        },
      },
      400: {
        description: 'Invalid credentials',
        content: {
          'application/json': {
            schema: baseValidation.apiErrorResponse,
          },
        },
      },
    },
    middleware: googleAuth({
      client_id: authConfig.google.clientID,
      client_secret: authConfig.google.clientSecret,
      scope: ['profile', 'email', 'openid'],
    }),
  }),
  c => authController.googleCallback(c)
);

export { authRouter };
