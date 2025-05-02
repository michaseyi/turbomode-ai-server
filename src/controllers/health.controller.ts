import { Context } from 'hono';
import { BaseController } from '@/controllers/base.controller';
import { prisma } from '@/services';

/**
 * HealthController handles health check endpoints
 * Demonstrates the controller pattern in the application
 */
export class HealthController extends BaseController {
  /**
   * Get basic health status
   */
  async getStatus(c: Context) {
    return this.sendSuccess(c, {
      status: 'ok',
      timestamp: new Date().toISOString(),
      environment: process.env.NODE_ENV || 'development',
      uptime: process.uptime(),
    });
  }

  /**
   * Check database connection
   */
  async checkDatabase(c: Context) {
    try {
      // Simple query to check DB connection
      const result = await prisma.$queryRaw`SELECT 1 as connected`;

      return this.sendSuccess(c, {
        database: 'connected',
        details: result,
      });
    } catch (error) {
      console.error('Database health check failed:', error);

      return this.sendError(c, 'Database connection failed', 503 as 503);
    }
  }
}

// Export singleton instance
export const healthController = new HealthController();
