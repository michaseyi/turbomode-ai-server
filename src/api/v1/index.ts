import { Hono } from 'hono';
import { HTTPException } from 'hono/http-exception';

// Import route modules from the routes directory
import { healthRouter } from '@/api/v1/health';

/**
 * V1 API Router
 * Handles all v1 API routes and provides consistent error handling
 */
export const v1Router = new Hono();

/**
 * @route GET /api/v1
 * @description API version information endpoint
 * @access Public
 */
v1Router.get('/', c => {
  return c.json({
    version: 'v1',
    status: 'active',
    documentation: '/api/v1/docs',
  });
});

// Mount route groups
v1Router.route('/health', healthRouter);

// Mount additional route groups as they are created
// v1Router.route('/users', userRouter);
// v1Router.route('/auth', authRouter);

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
