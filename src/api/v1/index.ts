import { Hono } from 'hono';
import { HTTPException } from 'hono/http-exception';
import { logger as honoLogger } from 'hono/logger';
import { timing } from 'hono/timing';
import { prettyJSON } from 'hono/pretty-json';

import { mountRoutes, routeGroups } from '@/api/v1/routes';
import { config } from '@/config';
import { cors } from 'hono/cors';
import { logger } from '@/utils/logger';
import { loggerMiddleware } from '@/middlewares';

export const v1Router = new Hono();

v1Router.use(cors());
v1Router.use(timing());
v1Router.use(prettyJSON({ space: 2 }));

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
      description: group.description,
    })),
  });
});

mountRoutes(v1Router);

export function mounteV1Router(app: Hono) {
  app.use(loggerMiddleware.requestLogger);

  app.route('/api/v1', v1Router);

  app.onError((err, c) => {
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

  app.notFound(c => {
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
}
