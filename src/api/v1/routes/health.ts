/**
 * Health Check Routes
 *
 * Endpoints for application health monitoring and status checks.
 */

import { Hono } from 'hono';
import { healthController } from '@/controllers/health.controller';

// Create router for health-related endpoints
const healthRouter = new Hono();

/**
 * @route GET /health
 * @description Get basic health status of the API
 * @access Public
 */
healthRouter.get('/', healthController.getStatus);

/**
 * @route GET /health/db
 * @description Check database connection
 * @access Public
 */
healthRouter.get('/db', healthController.checkDatabase);

export { healthRouter };
