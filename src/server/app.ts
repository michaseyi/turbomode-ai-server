import { serve, ServerType } from '@hono/node-server';
import { v1 } from '@/api/v1';
import { loggerUtils } from '@/utils';
import { config } from '@/config';
import { errorMiddleware, loggerMiddleware } from '@/middlewares';
import { OpenAPIHono } from '@hono/zod-openapi';
import { cors } from 'hono/cors';
import { timing } from 'hono/timing';
import { prettyJSON } from 'hono/pretty-json';
import { disconnectDb, initDb } from '@/lib/db';

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
    loggerUtils.info(`${signal} received, shutting down gracefully...`);

    if (server) {
      server.close(() => {
        loggerUtils.info('http server closed');
      });
    }

    try {
      await disconnectDb();
      loggerUtils.info('database connections closed');
    } catch (error) {
      loggerUtils.error('error during database disconnection', error);
    }

    process.exit(0);
  };

  process.on('SIGTERM', () => shutdown('sigterm'));
  process.on('SIGINT', () => shutdown('sigint'));
}

export async function startApp() {
  try {
    await initDb();

    loggerUtils.info(`${config.app.name} starting on http://localhost:${config.app.port}`);

    const server = serve({
      fetch: app.fetch,
      port: config.app.port,
      hostname: '0.0.0.0',
    });

    setupGracefulShutdown(server);

    return server;
  } catch (error) {
    loggerUtils.error('failed to start server', error);
    process.exit(1);
  }
}
