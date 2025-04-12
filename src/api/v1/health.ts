import { Hono } from 'hono';
import { healthController } from '@/controllers/health.controller';

// Create a router for health-related endpoints
const healthRouter = new Hono();

/**
 * @route GET /api/v1/health
 * @description Get basic health status of the API
 * @access Public
 */
healthRouter.get('/', c => healthController.getStatus(c));

/**
 * @route GET /api/v1/health/db
 * @description Check database connection
 * @access Public
 */
healthRouter.get('/db', c => healthController.checkDatabase(c));

export { healthRouter };
