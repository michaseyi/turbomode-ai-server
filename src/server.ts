/**
 * Main server entry point
 *
 * This file is the primary entry point for starting the application
 * and is used by both development and production scripts.
 */

import { startServer } from '@/app';

// Catch unhandled rejections
process.on('unhandledRejection', (reason: unknown, promise: Promise<unknown>) => {
  console.error('Unhandled Rejection at:', promise, 'reason:', reason);
});

// Run the server
startServer().catch((error: Error) => {
  console.error('Failed to start server:', error);
  process.exit(1);
});
