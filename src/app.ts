import { Hono } from 'hono';
import { serve, ServerType } from '@hono/node-server';
import { mounteV1Router } from '@/api/v1';
import { initPrisma, disconnectPrisma } from '@/services';
import { logger } from '@/utils/logger';
import config from '@/config';
import { env } from '@/config/env';
import '@/lib/agents/turbo-mode-agent';

const app = new Hono();

mounteV1Router(app);

app.get('/', c => {
  return c.json({
    name: 'Turbomode AI Server',
    environment: env.NODE_ENV,
  });
});

function setupGracefulShutdown(server: ServerType) {
  const shutdown = async (signal: string) => {
    logger.info(`${signal} received, shutting down gracefully...`);

    if (server) {
      server.close(() => {
        logger.info('HTTP server closed');
      });
    }

    try {
      await disconnectPrisma();
      logger.info('Database connections closed');
    } catch (error) {
      logger.error('Error during database disconnection:', error);
    }

    process.exit(0);
  };

  process.on('SIGTERM', () => shutdown('SIGTERM'));
  process.on('SIGINT', () => shutdown('SIGINT'));
}

export async function startApp() {
  try {
    await initPrisma();

    logger.info(`Server starting on http://localhost:${config.server.port}`);

    const server = serve({
      fetch: app.fetch,
      port: config.server.port,
    });

    setupGracefulShutdown(server);

    return server;
  } catch (error) {
    logger.error('Failed to start server:', error);
    process.exit(1);
  }
}

if (import.meta.url === `file://${process.argv[1]}`) {
  startApp().catch(error => {
    logger.error('Unhandled error during server startup:', error);
    process.exit(1);
  });
}
