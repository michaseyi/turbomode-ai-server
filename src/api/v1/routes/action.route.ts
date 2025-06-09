import { authMiddleware } from '@/middlewares';
import { actionValidation } from '@/validation';
import { baseValidation } from '@/validation/base.validation';
import { createRoute, OpenAPIHono, z } from '@hono/zod-openapi';
import { apiUtils, controllerUtils } from '@/utils';
import { actionController } from '@/controllers';
import { stream, streamSSE, streamText } from 'hono/streaming';
import { actionService } from '@/services';

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
    description: 'Create action',
    tags: ['Action'],
    responses: {
      200: {
        description: '',
        content: {
          'application/json': {
            schema: controllerUtils.resolveApiResponseSchema(actionValidation.createdActionSchema),
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
  actionController.createAction
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
    method: 'get',
    path: '/:actionId/stream',
    description: 'Stream action',
    tags: ['Action'],
    request: {
      params: actionValidation.paramSchema,
      query: actionValidation.streamQuery,
    },
    responses: {
      200: {
        description: '',
        content: {
          'application/json': {
            schema: baseValidation.apiResponse,
          },

          'text/event-stream': {
            schema: z.string(),
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

  actionController.streamAction
);

actionRouter.openapi(
  createRoute({
    method: 'get',
    path: '/:actionId/history',
    description: 'Get action message history',
    tags: ['Action'],
    request: {
      params: actionValidation.paramSchema,
    },
    responses: {
      200: {
        description: '',
        content: {
          'application/json': {
            schema: controllerUtils.resolveApiResponseSchema(actionValidation.chatMessage.array()),
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

  actionController.fetchActionMessageHistory
);
