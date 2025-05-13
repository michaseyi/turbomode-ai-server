import { authMiddleware } from '@/middlewares';
import { actionValidation, baseValidation } from '@/validation';
import { createRoute, OpenAPIHono, z } from '@hono/zod-openapi';
import { apiUtils, controllerUtils } from '@/utils';
import { actionController } from '@/controllers';

export const actionRouter = new OpenAPIHono({
  defaultHook: controllerUtils.validationHook,
});

actionRouter.use(authMiddleware.ensureAuthenticated);

actionRouter.openapi(
  createRoute({
    method: 'get',
    path: '/',
    description: 'Get actions',
    tags: ['Action'],
    request: {
      params: baseValidation.apiQuery,
    },
    responses: {
      200: {
        description: '',
        content: {
          'application/json': {
            schema: controllerUtils.resolvePaginatedApiResponseSchema(
              actionValidation.fetchedAction
            ),
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
  actionController.getActions
);

actionRouter.openapi(
  createRoute({
    method: 'post',
    path: '/',
    description: 'Create new action',
    tags: ['Action'],
    request: {
      body: {
        required: true,
        content: {
          'application/json': {
            schema: z.object({}),
          },
        },
      },
    },
    responses: {
      200: {
        description: '',
        content: {
          'application/json': {
            schema: baseValidation.apiResponse,
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
  controllerUtils.placeholder
);

actionRouter.openapi(
  createRoute({
    method: 'post',
    path: '/:actionId',
    description: 'Interact with an action',
    tags: ['Action'],
    request: {},
    responses: {
      200: {
        description: '',
        content: {
          'application/json': {
            schema: baseValidation.apiResponse,
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
  controllerUtils.placeholder
);

actionRouter.openapi(
  createRoute({
    method: 'delete',
    path: '/:actionId',
    description: 'Delete action',
    tags: ['Action'],
    request: {},
    responses: {
      200: {
        description: '',
        content: {
          'application/json': {
            schema: baseValidation.apiResponse,
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
  controllerUtils.placeholder
);
