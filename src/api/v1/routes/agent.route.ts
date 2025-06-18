import { authMiddleware } from '@/middlewares';
import { createRoute, OpenAPIHono } from '@hono/zod-openapi';
import { controllerUtils, routeUtils } from '@/utils';
import { agentValidation } from '@/validation';
import { agentController } from '@/controllers';

export const agentRouter = new OpenAPIHono({
  defaultHook: controllerUtils.validationHook,
});

agentRouter.use(authMiddleware.ensureAuthenticated);

agentRouter.openapi(
  createRoute({
    method: 'get',
    path: '/',
    description: 'List all agents',
    tags: ['Agent'],
    responses: {
      200: {
        description: 'Success',
        content: {
          'application/json': {
            schema: controllerUtils.resolveApiResponseSchema(
              agentValidation.listAgentsResponseSchema
            ),
          },
        },
      },
      ...routeUtils.errorResponses,
    },
  }),
  agentController.listAgents
);

agentRouter.openapi(
  createRoute({
    method: 'post',
    path: '/invoke',
    description: 'Invoke agent',
    tags: ['Agent'],
    request: {
      body: {
        required: true,
        content: {
          'application/json': {
            schema: agentValidation.invokeAgentSchema,
          },
        },
      },
    },
    responses: {
      200: {
        description: 'Success',
        content: {
          'application/json': {
            schema: controllerUtils.resolveApiResponseSchema(
              agentValidation.invokeAgentResponseSchema
            ),
          },
        },
      },
      ...routeUtils.errorResponses,
    },
  }),
  agentController.invokeAgent
);
