import { serve, ServerType } from '@hono/node-server';
import { v1 } from '@/api/v1';
import { loggerUtil } from '@/utils';
import { config } from '@/config';
import { errorMiddleware, loggerMiddleware } from '@/middlewares';
import { OpenAPIHono } from '@hono/zod-openapi';
import { cors } from 'hono/cors';
import { timing } from 'hono/timing';
import { prettyJSON } from 'hono/pretty-json';
import { disconnectDb, initDb } from '@/db';

import '@/lib/agents/turbo-mode-agent';

const app = new OpenAPIHono();

app.use(cors());
app.use(timing());
app.use(prettyJSON({ space: 2 }));

app.use(loggerMiddleware.requestLogger);

app.get('/', c => {
  return c.json({
    name: config.app.name,
    environment: config.app.environment,
  });
});

app.route('/api/v1', v1);

app.doc('/api/docs', {
  openapi: '3.0.0',
  info: {
    version: '1.0.0',
    title: config.app.name,
  },
});

app.onError((e, c) => errorMiddleware.errorHandler(e, c));
app.notFound(c => errorMiddleware.notFoundHandler(c));

function setupGracefulShutdown(server: ServerType) {
  const shutdown = async (signal: string) => {
    loggerUtil.info(`${signal} received, shutting down gracefully...`);

    if (server) {
      server.close(() => {
        loggerUtil.info('http server closed');
      });
    }

    try {
      await disconnectDb();
      loggerUtil.info('database connections closed');
    } catch (error) {
      loggerUtil.error('error during database disconnection', error);
    }

    process.exit(0);
  };

  process.on('SIGTERM', () => shutdown('sigterm'));
  process.on('SIGINT', () => shutdown('sigint'));
}

export async function startApp() {
  try {
    await initDb();

    loggerUtil.info(`${config.app.name} starting on http://localhost:${config.app.port}`);

    const server = serve({
      fetch: app.fetch,
      port: config.app.port,
    });

    setupGracefulShutdown(server);

    return server;
  } catch (error) {
    loggerUtil.error('failed to start server', error);
    process.exit(1);
  }
}

if (import.meta.url === `file://${process.argv[1]}`) {
  startApp().catch(error => {
    loggerUtil.error('unhandled error during server startup', error);
    process.exit(1);
  });
}
