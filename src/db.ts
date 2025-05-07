import { PrismaClient } from '@prisma/client';
import { loggerUtil } from '@/utils';
export * from '@prisma/client';

export const db = new PrismaClient({
  log: [
    { emit: 'event', level: 'query' },
    { emit: 'event', level: 'error' },
    { emit: 'event', level: 'info' },
    { emit: 'event', level: 'warn' },
  ],
});

export async function disconnectDb(): Promise<void> {
  await db.$disconnect();
}

export async function initDb(): Promise<void> {
  try {
    await db.$connect();

    db.$on('query', e => {
      loggerUtil.debug('prisma query', e);
    });

    db.$on('error', e => {
      loggerUtil.error('prisma error', e);
    });

    db.$on('info', e => {
      loggerUtil.info('prisma info', e);
    });

    db.$on('warn', e => {
      loggerUtil.warn('prisma warning', e);
    });

    loggerUtil.info('database connection established');
  } catch (error) {
    loggerUtil.error('failed to connect to database:', error);
    process.exit(1);
  }
}
