import { Hono, MiddlewareHandler } from 'hono';
import { healthRouter } from '@/api/v1/routes/health';
import { authRouter } from '@/api/v1/routes/auth';
import { docsRouter } from '@/api/v1/routes/docs';

export { healthRouter, authRouter };

export interface RouteGroup {
  router: Hono;
  path: string;
  description: string;
  middleware?: MiddlewareHandler[];
}

export const routeGroups: RouteGroup[] = [
  {
    router: healthRouter,
    path: '/health',
    description: 'Health check endpoints',
  },
  {
    router: authRouter,
    path: '/auth',
    description: 'Authentication endpoints',
  },

  {
    router: docsRouter,
    path: '/docs',
    description: 'Documentation endpoints',
  },
];

/**
 * Mount all route groups to a parent router
 *
 * @param parentRouter The parent router to mount routes on
 */
export function mountRoutes(parentRouter: Hono): void {
  for (const group of routeGroups) {
    if (group.middleware && group.middleware.length > 0) {
      parentRouter.use(group.path, ...group.middleware);
    }
    parentRouter.route(group.path, group.router);
  }
}
