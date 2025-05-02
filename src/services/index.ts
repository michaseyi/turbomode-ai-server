import { ServiceResult } from '@/types';
import { logger } from '@/utils/logger';
import { PrismaClient } from '@prisma/client';

export const prisma = new PrismaClient({
  log: [
    {
      emit: 'event',
      level: 'query',
    },
    {
      emit: 'event',
      level: 'error',
    },
    {
      emit: 'event',
      level: 'info',
    },
    {
      emit: 'event',
      level: 'warn',
    },
  ],
});

export class BaseService {
  protected db: PrismaClient;

  constructor() {
    this.db = prisma;
  }

  success<T>(data: T): ServiceResult<T> {
    return {
      success: true,
      data,
    };
  }

  error<T>(message: string, details?: Record<string, string[]>): ServiceResult<T> {
    return {
      success: false,
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
      logger.debug('Prisma query', e);
    });

    prisma.$on('error', e => {
      logger.error('Prisma error', e);
    });

    prisma.$on('info', e => {
      logger.info('Prisma info', e);
    });

    prisma.$on('warn', e => {
      logger.warn('Prisma warning', e);
    });

    logger.info('Database connection established');
  } catch (error) {
    logger.error('Failed to connect to database:', error);
    process.exit(1);
  }
}
