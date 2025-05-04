import { ServiceResult } from '@/types';
import { logger } from '@/utils/logger';
import { PrismaClient } from '@prisma/client';

export const prisma = new PrismaClient({
  log: [
    { emit: 'event', level: 'query' },
    { emit: 'event', level: 'error' },
    { emit: 'event', level: 'info' },
    { emit: 'event', level: 'warn' },
  ],
});

export class BaseService {
  protected db: PrismaClient;

  constructor() {
    this.db = prisma;
  }

  success<T>(message: string, data: T): ServiceResult<T> {
    return {
      ok: true,
      message,
      data,
    };
  }

  error<T>(message: string, details?: Record<string, string[]>): ServiceResult<T> {
    return {
      ok: false,
      message,
      error: {
        message,
        details,
      },
    };
  }
}

export async function disconnectPrisma(): Promise<void> {
  await prisma.$disconnect();
}

export async function initPrisma(): Promise<void> {
  try {
    await prisma.$connect();

    prisma.$on('query', e => {
      logger.debug('prisma query', e);
    });

    prisma.$on('error', e => {
      logger.error('prisma error', e);
    });

    prisma.$on('info', e => {
      logger.info('prisma info', e);
    });

    prisma.$on('warn', e => {
      logger.warn('prisma warning', e);
    });

    logger.info('database connection established');
  } catch (error) {
    logger.error('failed to connect to database:', error);
    process.exit(1);
  }
}
