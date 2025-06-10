import { authMiddleware } from '@/middlewares';
import { actionValidation } from '@/validation';
import { baseValidation } from '@/validation/base.validation';
import { createRoute, OpenAPIHono, z } from '@hono/zod-openapi';
import { controllerUtils, routeUtils } from '@/utils';
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
      query: baseValidation.apiQuery,
    },
    responses: {
      200: {
        description: 'Success',
        content: {
          'application/json': {
            schema: controllerUtils.resolvePaginatedApiResponseSchema(
              actionValidation.fetchedAction
            ),
          },
        },
      },
      ...routeUtils.errorResponses,
    },
  }),
  actionController.getActions
);

actionRouter.openapi(
  createRoute({
    method: 'post',
    path: '/',
    description: 'Create action',
    tags: ['Action'],
    responses: {
      200: {
        description: 'Success',
        content: {
          'application/json': {
            schema: controllerUtils.resolveApiResponseSchema(actionValidation.createdActionSchema),
          },
        },
      },
      ...routeUtils.errorResponses,
    },
  }),
  actionController.createAction
);

actionRouter.openapi(
  createRoute({
    method: 'get',
    path: '/{actionId}/stream',
    description: 'Stream action',
    tags: ['Action'],
    request: {
      params: actionValidation.paramSchema,
      query: actionValidation.streamQuery,
    },
    responses: {
      200: {
        description: 'Success',
        content: {
          'application/json': {
            schema: baseValidation.apiResponse,
          },

          'text/event-stream': {
            schema: z.string(),
          },
        },
      },
      ...routeUtils.errorResponses,
    },
  }),

  actionController.streamAction
);

actionRouter.openapi(
  createRoute({
    method: 'get',
    path: '/{actionId}/history',
    description: 'Get action message history',
    tags: ['Action'],
    request: {
      params: actionValidation.paramSchema,
    },
    responses: {
      200: {
        description: 'Success',
        content: {
          'application/json': {
            schema: controllerUtils.resolveApiResponseSchema(actionValidation.chatMessage.array()),
          },
        },
      },
      ...routeUtils.errorResponses,
    },
  }),

  actionController.fetchActionMessageHistory
);
