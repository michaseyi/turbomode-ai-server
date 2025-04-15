import { Hono } from 'hono';
import { HTTPException } from 'hono/http-exception';
import { logger } from 'hono/logger';
import { timing } from 'hono/timing';
import { prettyJSON } from 'hono/pretty-json';

// Import route modules from the routes directory
import { mountRoutes, routeGroups } from '@/api/v1/routes';
import { config } from '@/config';

/**
 * V1 API Router
 * Handles all v1 API routes and provides consistent error handling
 */
export const v1Router = new Hono();

// Apply global middleware
v1Router.use('*', logger());
v1Router.use('*', timing());
v1Router.use('*', prettyJSON({ space: 2 }));

/**
 * @route GET /api/v1
 * @description API version information endpoint
 * @access Public
 */
v1Router.get('/', c => {
  return c.json({
    name: 'Turbomode API',
    version: 'v1',
    status: 'active',
    environment: config.server.environment,
    documentation: '/api/v1/docs',
    timestamp: new Date().toISOString(),
    routes: routeGroups.map(group => ({
      path: `/api/v1${group.path}`,
      description: group.description
    }))
  });
});

// Mount all route groups dynamically
mountRoutes(v1Router);

// Add global error handler for v1 routes
v1Router.onError((err, c) => {
  console.error('API Error:', err);

  if (err instanceof HTTPException) {
    return err.getResponse();
  }

  return c.json(
    {
      error: {
        message: 'Internal Server Error',
        status: 500,
      },
    },
    500
  );
});

// 404 handler for v1 routes
v1Router.notFound(c => {
  return c.json(
    {
      error: {
        message: 'Not Found',
        status: 404,
        path: c.req.path,
      },
    },
    404
  );
});
