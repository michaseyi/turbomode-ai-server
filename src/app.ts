import { serve, ServerType } from '@hono/node-server';
import { v1 } from '@/api/v1';
import { initPrisma, disconnectPrisma } from '@/services';
import { logger } from '@/utils/logger';
import config from '@/config';
import { env } from '@/config/env';
import '@/lib/agents/turbo-mode-agent';
import { errorMiddleware, loggerMiddleware } from '@/middlewares';
import { OpenAPIHono } from '@hono/zod-openapi';
import { cors } from 'hono/cors';
import { timing } from 'hono/timing';
import { prettyJSON } from 'hono/pretty-json';

const app = new OpenAPIHono();

app.use(cors());
app.use(timing());
app.use(prettyJSON({ space: 2 }));

app.use(loggerMiddleware.requestLogger);

app.get('/', c => {
  return c.json({
    name: env.SERVICE_NAME,
    environment: env.NODE_ENV,
  });
});

app.route('/api/v1', v1);

app.doc('/api/docs', {
  openapi: '3.0.0',
  info: {
    version: '1.0.0',
    title: env.SERVICE_NAME,
  },
});

app.onError((e, c) => errorMiddleware.errorHandler(e, c));
app.notFound(c => errorMiddleware.notFoundHandler(c));

function setupGracefulShutdown(server: ServerType) {
  const shutdown = async (signal: string) => {
    logger.info(`${signal} received, shutting down gracefully...`);

    if (server) {
      server.close(() => {
        logger.info('http server closed');
      });
    }

    try {
      await disconnectPrisma();
      logger.info('database connections closed');
    } catch (error) {
      logger.error('error during database disconnection', error);
    }

    process.exit(0);
  };

  process.on('SIGTERM', () => shutdown('sigterm'));
  process.on('SIGINT', () => shutdown('sigint'));
}

export async function startApp() {
  try {
    await initPrisma();

    logger.info(`server starting on http://localhost:${config.server.port}`);

    const server = serve({
      fetch: app.fetch,
      port: config.server.port,
    });

    setupGracefulShutdown(server);

    return server;
  } catch (error) {
    logger.error('failed to start server:', error);
    process.exit(1);
  }
}

if (import.meta.url === `file://${process.argv[1]}`) {
  startApp().catch(error => {
    logger.error('unhandled error during server startup', error);
    process.exit(1);
  });
}
