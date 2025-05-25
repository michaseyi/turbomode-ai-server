import { integrationController } from '@/controllers';
import { authMiddleware } from '@/middlewares';
import { baseValidation, integrationValidation } from '@/validation';
import { createRoute, OpenAPIHono } from '@hono/zod-openapi';
import { controllerUtils } from '@/utils';

export const integrationRouter = new OpenAPIHono({
  defaultHook: controllerUtils.validationHook,
});

integrationRouter.use(authMiddleware.ensureAuthenticated);

integrationRouter.openapi(
  createRoute({
    method: 'post',
    path: '/gmail',
    description: 'Create new gmail integration',
    tags: ['Integration'],
    request: {
      body: {
        required: true,
        content: {
          'application/json': {
            schema: integrationValidation.addGoogleIntegration,
          },
        },
      },
    },
    responses: {
      201: {
        description: '',
        content: {
          'application/json': {
            schema: controllerUtils.resolveApiResponseSchema(
              integrationValidation.fetchedGmailIntegration
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
  integrationController.addGmailIntegration
);

integrationRouter.openapi(
  createRoute({
    method: 'get',
    path: '/',
    description: 'Get integrations',
    tags: ['Integration'],
    responses: {
      200: {
        description: '',
        content: {
          'application/json': {
            schema: controllerUtils.resolveApiResponseSchema(
              integrationValidation.fetchedIntegrations.array()
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
  integrationController.listIntegrations
);

integrationRouter.openapi(
  createRoute({
    method: 'post',
    path: '/google-calendar',
    description: 'Create new google calendar integration',
    tags: ['Integration'],
    request: {
      body: {
        required: true,
        content: {
          'application/json': {
            schema: integrationValidation.addGoogleIntegration,
          },
        },
      },
    },
    responses: {
      201: {
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
  integrationController.addGoogleCalendarIntegration
);

integrationRouter.openapi(
  createRoute({
    method: 'get',
    path: '/gmail',
    description: 'Get gmail integrations',
    tags: ['Integration'],
    responses: {
      200: {
        description: '',
        content: {
          'application/json': {
            schema: controllerUtils.resolveApiResponseSchema(
              integrationValidation.fetchedGmailIntegration.array()
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
  integrationController.getGmailIntegration
);

integrationRouter.openapi(
  createRoute({
    method: 'get',
    path: '/google-calendar',
    description: 'Get google calendar integrations',
    tags: ['Integration'],
    responses: {
      200: {
        description: '',
        content: {
          'application/json': {
            schema: controllerUtils.resolveApiResponseSchema(
              integrationValidation.fetchedGoogleCalendarIntegration.array()
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
  integrationController.getGoogleCalendarIntegration
);

integrationRouter.openapi(
  createRoute({
    method: 'patch',
    path: '/gmail/:integrationId',
    description: 'Update a gmail integration',
    tags: ['Integration'],
    request: {
      params: integrationValidation.integrationBaseParams,
      body: {
        required: true,
        content: {
          'application/json': {
            schema: integrationValidation.modifyGmailIntegration,
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
  integrationController.modifyGmailIntegration
);

integrationRouter.openapi(
  createRoute({
    method: 'delete',
    path: '/gmail/:integrationId',
    description: 'Delete a gmail integration',
    tags: ['Integration'],
    request: {
      params: integrationValidation.integrationBaseParams,
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
  integrationController.deleteGmailIntegration
);

integrationRouter.openapi(
  createRoute({
    method: 'delete',
    path: '/google-calendar/:integrationId',
    description: 'Delete a google calendar integration',
    tags: ['Integration'],
    request: {
      params: integrationValidation.integrationBaseParams,
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
  integrationController.deleteGoogleCalendarIntegration
);

integrationRouter.openapi(
  createRoute({
    method: 'post',
    path: '/gmail/:integrationId/enable',
    description: 'Enable a gmail integration',
    tags: ['Integration'],
    request: {
      params: integrationValidation.integrationBaseParams,
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
  integrationController.enableGmailIntegration
);

integrationRouter.openapi(
  createRoute({
    method: 'post',
    path: '/gmail/:integrationId/disable',
    description: 'Disable a gmail integration',
    tags: ['Integration'],
    request: {
      params: integrationValidation.integrationBaseParams,
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
  integrationController.disableGmailIntegration
);
