import { authController } from '@/controllers';
import { authMiddleware } from '@/middlewares';
import { googleAuth } from '@hono/oauth-providers/google';
import { authConfig } from '@/config';
import { authValidation, baseValidation } from '@/validation';
import { createRoute, OpenAPIHono, z } from '@hono/zod-openapi';
import { controllerUtil } from '@/utils';

export const authRouter = new OpenAPIHono();

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
            schema: controllerUtil.resolveApiResponseSchema(authValidation.loginResponse),
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
  authController.login
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
  authController.register
);

authRouter.openapi(
  createRoute({
    method: 'post',
    path: '/refresh',
    description: 'Refresh access tokens',
    tags: ['Auth'],
    responses: {
      200: {
        description: '',
        content: {
          'application/json': {
            schema: controllerUtil.resolveApiResponseSchema(authValidation.loginResponse),
          },
        },
      },

      401: {
        description: 'Missing or invalid refresh token',
        content: {
          'application/json': {
            schema: baseValidation.apiErrorResponse,
          },
        },
      },

      400: {
        description: '',
        content: {
          'application/json': {
            schema: baseValidation.apiErrorResponse,
          },
        },
      },
    },
  }),
  authController.refreshToken
);

authRouter.openapi(
  createRoute({
    method: 'post',
    path: '/logout',
    description: 'Logout user and invalidate tokens',
    tags: ['Auth'],
    responses: {
      200: {
        description: 'Logout successful',
        content: {
          'application/json': {
            schema: baseValidation.apiDatalessResponse,
          },
        },
      },

      401: {
        description: 'Missing or invalid access token',
        content: {
          'application/json': {
            schema: baseValidation.apiErrorResponse,
          },
        },
      },
    },
    middleware: authMiddleware.ensureAuthenticated,
  }),
  authController.logout
);

authRouter.openapi(
  createRoute({
    method: 'get',
    path: '/me',
    description: 'Get current authenticated user',
    tags: ['Auth'],
    responses: {
      200: {
        description: '',
        content: {
          'application/json': {
            schema: controllerUtil.resolveApiResponseSchema(z.object({})),
          },
        },
      },
    },

    middleware: authMiddleware.ensureAuthenticated,
  }),
  authController.getCurrentUser
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
          'text/html': {
            schema: z.string(),
          },
        },
      },
      400: {
        description: 'Oauth error',
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
  authController.googleCallback
);
