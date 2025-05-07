import { controllerUtil } from '@/utils';
import { Context } from 'hono';

/**
 * Get basic health status
 */
export async function getStatus(c: Context) {
  return controllerUtil.createSuccessResponse(
    c,
    'Health check successful',
    {
      timestamp: new Date().toISOString(),
      environment: process.env.NODE_ENV || 'development',
      uptime: process.uptime(),
    },
    200
  );
}
