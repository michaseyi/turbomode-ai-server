import { Hono } from 'hono';
import { healthController } from '@/controllers/health';
import { OpenAPIHono } from '@hono/zod-openapi';

const healthRouter = new OpenAPIHono();

/**
 * @route GET /health
 * @description Get basic health status of the API
 * @access Public
 */
healthRouter.get('/', healthController.getStatus);

export { healthRouter };
