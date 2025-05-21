import { authMiddleware } from '@/middlewares';
import { actionValidation, baseValidation } from '@/validation';
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

  async c => {
    const user = c.get('user')!;

    const result = await actionService.streamAction(user.id, c.req.param('actionId'));

    if (!result.ok) {
      return controllerUtils.createErrorResponse(c, result.message, 400);
    }

    if (typeof result.data === 'boolean') {
      return controllerUtils.createSuccessWithoutDataResponse(c, result.message, 200);
    }

    const messageStream = result.data;

    return streamSSE(c, async stream => {
      for await (const message of messageStream) {
        stream.writeSSE(message);
      }
    });
  }
);
