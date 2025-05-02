import { startApp } from '@/app';
import { logger } from '@/utils/logger';

process.on('unhandledRejection', (reason: unknown, promise: Promise<unknown>) => {
  logger.error('Unhandled Rejection at:', promise, 'reason:', reason);
});

startApp().catch((error: Error) => {
  logger.error('Failed to start server:', error);
  process.exit(1);
});
