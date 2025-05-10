import { PrismaClient } from '@prisma/client';
import { loggerUtils } from '@/utils';
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

    // db.$on('query', e => {
    //   loggerUtil.debug('prisma query', e);
    // });

    db.$on('error', e => {
      loggerUtils.error('prisma error', e);
    });

    db.$on('info', e => {
      loggerUtils.info('prisma info', e);
    });

    db.$on('warn', e => {
      loggerUtils.warn('prisma warning', e);
    });

    loggerUtils.info('database connection established');
  } catch (error) {
    loggerUtils.error('failed to connect to database:', error);
    process.exit(1);
  }
}
