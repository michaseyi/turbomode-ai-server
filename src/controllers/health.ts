import { Context } from 'hono';
import { BaseController } from '@/controllers/base';
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
    return this.sendSuccess(c, 'Health check successful', {
      status: 'ok',
      timestamp: new Date().toISOString(),
      environment: process.env.NODE_ENV || 'development',
      uptime: process.uptime(),
    });
  }
}

// Export singleton instance
export const healthController = new HealthController();
