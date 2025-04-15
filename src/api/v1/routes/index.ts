/**
 * API Route Exports
 *
 * Central export point for all API route groups and middleware.
 * This file simplifies importing routes in the main router.
 */

import { Hono } from 'hono';
import type { MiddlewareHandler } from 'hono';

// Import route groups
import { healthRouter } from '@/api/v1/routes/health';
import { authRouter } from '@/api/v1/routes/auth';

/**
 * Re-export all routers
 *
 * Usage:
 * import { healthRouter, authRouter } from './routes';
 * v1Router.route('/health', healthRouter);
 * v1Router.route('/auth', authRouter);
 */
export { healthRouter, authRouter };

/**
 * Route group interface for consistent typing
 */
export interface RouteGroup {
  router: Hono;
  path: string;
  description: string;
  middleware?: MiddlewareHandler[];
}

/**
 * API Route Groups with metadata
 *
 * Used for dynamic route mounting and documentation.
 * Each entry contains the router, path, and optional middleware.
 */
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
  // Add additional route groups here
];

/**
 * Mount all route groups to a parent router
 *
 * @param parentRouter The parent router to mount routes on
 */
export function mountRoutes(parentRouter: Hono): void {
  for (const group of routeGroups) {
    if (group.middleware && group.middleware.length > 0) {
      // Apply middleware first if provided
      parentRouter.use(group.path, ...group.middleware);
    }
    // Mount the router
    parentRouter.route(group.path, group.router);
  }
}
