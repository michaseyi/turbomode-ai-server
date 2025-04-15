import { PrismaClient } from '@prisma/client';

// Create a singleton instance of the Prisma client
export const prisma = new PrismaClient({
  log: process.env.NODE_ENV === 'development' ? ['query', 'error', 'warn'] : ['error'],
});

/**
 * Base service class that provides access to the Prisma client
 * All service classes should extend this base class
 */
export class BaseService {
  protected prisma: PrismaClient;

  constructor() {
    this.prisma = prisma;
  }

  /**
   * Clean up resources when the service is no longer needed
   */
  async disconnect(): Promise<void> {
    await this.prisma.$disconnect();
  }
}

/**
 * Handles graceful shutdown of the Prisma client
 */
export async function disconnectPrisma(): Promise<void> {
  await prisma.$disconnect();
}

// Initialize Prisma connection on startup
export async function initPrisma(): Promise<void> {
  try {
    await prisma.$connect();
    console.info('Database connection established');
  } catch (error) {
    console.error('Failed to connect to database:', error);
    process.exit(1);
  }
}
