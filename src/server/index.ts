import { startApp } from '@/server/app';
import { loggerUtils } from '@/utils';

import '@/worker'; // run worker alongside server for testing

process.on('unhandledRejection', (reason: unknown, promise: Promise<unknown>) => {
  loggerUtils.error('unhandled rejection at', promise, 'reason:', reason);
});

startApp().catch((error: Error) => {
  loggerUtils.error('failed to start server', error);
  process.exit(1);
});
