import { integrationController } from '@/controllers';
import { authMiddleware } from '@/middlewares';
import { integrationValidation } from '@/validation';
import { baseValidation } from '@/validation/base.validation';
import { createRoute, OpenAPIHono } from '@hono/zod-openapi';
import { controllerUtils, routeUtils } from '@/utils';

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
      ...routeUtils.errorResponses,
    },
  }),
  integrationController.getGoogleCalendarIntegration
);

integrationRouter.openapi(
  createRoute({
    method: 'patch',
    path: '/gmail/{integrationId}',
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
        description: 'Success',
        content: {
          'application/json': {
            schema: baseValidation.apiResponse,
          },
        },
      },
      ...routeUtils.errorResponses,
    },
  }),
  integrationController.modifyGmailIntegration
);

integrationRouter.openapi(
  createRoute({
    method: 'delete',
    path: '/gmail/{integrationId}',
    description: 'Delete a gmail integration',
    tags: ['Integration'],
    request: {
      params: integrationValidation.integrationBaseParams,
    },
    responses: {
      200: {
        description: 'Success',
        content: {
          'application/json': {
            schema: baseValidation.apiResponse,
          },
        },
      },
      ...routeUtils.errorResponses,
    },
  }),
  integrationController.deleteGmailIntegration
);

integrationRouter.openapi(
  createRoute({
    method: 'delete',
    path: '/google-calendar/{integrationId}',
    description: 'Delete a google calendar integration',
    tags: ['Integration'],
    request: {
      params: integrationValidation.integrationBaseParams,
    },
    responses: {
      200: {
        description: 'Success',
        content: {
          'application/json': {
            schema: baseValidation.apiResponse,
          },
        },
      },
      ...routeUtils.errorResponses,
    },
  }),
  integrationController.deleteGoogleCalendarIntegration
);

integrationRouter.openapi(
  createRoute({
    method: 'post',
    path: '/gmail/{integrationId}/enable',
    description: 'Enable a gmail integration',
    tags: ['Integration'],
    request: {
      params: integrationValidation.integrationBaseParams,
    },
    responses: {
      200: {
        description: 'Success',
        content: {
          'application/json': {
            schema: baseValidation.apiResponse,
          },
        },
      },
      ...routeUtils.errorResponses,
    },
  }),
  integrationController.enableGmailIntegration
);

integrationRouter.openapi(
  createRoute({
    method: 'post',
    path: '/gmail/{integrationId}/disable',
    description: 'Disable a gmail integration',
    tags: ['Integration'],
    request: {
      params: integrationValidation.integrationBaseParams,
    },
    responses: {
      200: {
        description: 'Success',
        content: {
          'application/json': {
            schema: baseValidation.apiResponse,
          },
        },
      },
      ...routeUtils.errorResponses,
    },
  }),
  integrationController.disableGmailIntegration
);

integrationRouter.openapi(
  createRoute({
    method: 'get',
    path: '/gmail/{integrationId}/messages',
    description: 'Fetch gmail messages',
    tags: ['Integration'],
    request: {
      params: integrationValidation.integrationBaseParams,
      query: integrationValidation.gmailQuery,
    },
    responses: {
      200: {
        description: 'Success',
        content: {
          'application/json': {
            schema: controllerUtils.resolvePaginatedApiResponseSchema(
              integrationValidation.mailMessageSchema
            ),
          },
        },
      },
      ...routeUtils.errorResponses,
    },
  }),

  integrationController.fetchGmailMessages
);

// integrationRouter.openapi(
//   createRoute({
//     method: 'get',
//     path: '/gmail/{integrationId}/messages/search',
//     description: 'Semantic search over gmail messages',
//     tags: ['Integration'],
//     request: {
//       params: integrationValidation.integrationBaseParams,
//     },
//     responses: {
//       200: {
//         description: 'Success',
//         content: {
//           'application/json': {
//             schema: baseValidation.apiResponse,
//           },
//         },
//       },
//       ...routeUtils.errorResponses,
//     },
//   })
// );

// integrationRouter.openapi(
//   createRoute({
//     method: 'post',
//     path: '/gmail/{integrationId}/messages/send',
//     description: 'Send or reply a gmail message',
//     tags: ['Integration'],
//     request: {
//       params: integrationValidation.gmailIntegrationParamSchema,
//     },
//     responses: {
//       200: {
//         description: 'Success',
//         content: {
//           'application/json': {
//             schema: baseValidation.apiResponse,
//           },
//         },
//       },
//       ...routeUtils.errorResponses,
//     },
//   })
// );

integrationRouter.openapi(
  createRoute({
    method: 'post',
    path: '/gmail/{integrationId}/messages/sync',
    description: 'Manually sync gmail messages',
    tags: ['Integration'],
    request: {
      params: integrationValidation.integrationBaseParams,
    },
    responses: {
      200: {
        description: 'Success',
        content: {
          'application/json': {
            schema: baseValidation.apiResponse,
          },
        },
      },
      ...routeUtils.errorResponses,
    },
  }),
  integrationController.syncGmailMessages
);

integrationRouter.openapi(
  createRoute({
    method: 'get',
    path: '/gmail/{integrationId}/messages/{messageId}',
    description: 'Fetch gmail message',
    tags: ['Integration'],
    request: {
      params: integrationValidation.gmailIntegrationParamSchema,
    },
    responses: {
      200: {
        description: 'Success',
        content: {
          'application/json': {
            schema: controllerUtils.resolveApiResponseSchema(
              integrationValidation.fullMailMessageSchema
            ),
          },
        },
      },
      ...routeUtils.errorResponses,
    },
  }),
  integrationController.fetchGmailMessage
);

integrationRouter.openapi(
  createRoute({
    method: 'get',
    path: '/google-calendar/{integrationId}/events',
    description: 'Get calendar events',
    tags: ['Integration'],
    request: {
      query: integrationValidation.fetchCalendarEventQuery,
      params: integrationValidation.integrationBaseParams,
    },
    responses: {
      200: {
        description: 'Success',
        content: {
          'application/json': {
            schema: controllerUtils.resolveApiResponseSchema(
              integrationValidation.fetchedCalendarEvent.array()
            ),
          },
        },
      },
      ...routeUtils.errorResponses,
    },
  }),
  integrationController.fetchCalendarEvent
);

integrationRouter.openapi(
  createRoute({
    method: 'post',
    path: '/google-calendar/{integrationId}/events/sync',
    description: 'Sync calendar events',
    tags: ['Integration'],
    request: {
      required: true,
      body: {
        content: {
          'application/json': {
            schema: integrationValidation.fetchCalendarEventQuery,
          },
        },
      },
      params: integrationValidation.integrationBaseParams,
    },
    responses: {
      200: {
        description: 'Success',
        content: {
          'application/json': {
            schema: baseValidation.apiResponse,
          },
        },
      },
      ...routeUtils.errorResponses,
    },
  }),
  integrationController.syncCalendarEvent
);
