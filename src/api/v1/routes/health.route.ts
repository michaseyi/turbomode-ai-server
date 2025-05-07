import { healthController } from '@/controllers';
import { controllerUtil } from '@/utils';
import { createRoute, OpenAPIHono, z } from '@hono/zod-openapi';

export const healthRouter = new OpenAPIHono();

healthRouter.openapi(
  createRoute({
    method: 'get',
    path: '/',
    description: 'Get basic health status of the API',
    tags: ['Health'],
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
  }),

  healthController.getStatus
);
