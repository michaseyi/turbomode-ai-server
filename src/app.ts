import { Hono } from 'hono';
import { serve } from '@hono/node-server';
import { cors } from 'hono/cors';
import { prettyJSON } from 'hono/pretty-json';
import { v1Router } from '@/api/v1/index.js';
import { initPrisma, disconnectPrisma } from '@/services/index.js';
import { requestLogger, logger } from '@/middlewares/logger.js';
import { errorMiddleware, notFoundMiddleware } from '@/middlewares/error.js';

// Create Hono app instance
const app = new Hono();

// Apply middleware
app.use('*', logger());
app.use('*', cors());

// Root endpoint
app.get('/', c => {
  return c.json({
    name: 'Turbomode AI Server',
    version: process.env.npm_package_version || '1.0.0',
    environment: process.env.NODE_ENV || 'development',
  });
});

// Simple health check endpoint
app.get('/health', c => {
  return c.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
  });
});

// Mount API routes
app.route('/api/v1', v1Router);

// Define port from environment or default
const PORT = process.env.PORT || 3000;

// Check environment variables
function checkEnvironment() {
  const requiredEnvVars = ['DATABASE_URL'];
  const missingEnvVars = requiredEnvVars.filter(env => !process.env[env]);

  if (missingEnvVars.length > 0) {
    console.error(`Missing required environment variables: ${missingEnvVars.join(', ')}`);
    console.error('Please set these variables in your .env file or environment');
    return false;
  }

  return true;
}

// Handle graceful shutdown
function setupGracefulShutdown(server: any) {
  const shutdown = async (signal: string) => {
    console.info(`${signal} received, shutting down gracefully...`);

    // Close server first to stop accepting new connections
    if (server) {
      server.close(() => {
        console.info('HTTP server closed');
      });
    }

    // Disconnect from database
    try {
      await disconnectPrisma();
      console.info('Database connections closed');
    } catch (error) {
      console.error('Error during database disconnection:', error);
    }

    // Exit process
    process.exit(0);
  };

  // Listen for termination signals
  process.on('SIGTERM', () => shutdown('SIGTERM'));
  process.on('SIGINT', () => shutdown('SIGINT'));
}

// Start server function
export async function startServer() {
  try {
    // Check environment variables
    if (!checkEnvironment()) {
      process.exit(1);
    }

    // Initialize database connection
    await initPrisma();

    console.info(`Server starting on http://localhost:${PORT}`);

    // Start HTTP server
    const server = serve({
      fetch: app.fetch,
      port: Number(PORT),
    });

    // Setup graceful shutdown
    setupGracefulShutdown(server);

    return server;
  } catch (error) {
    console.error('Failed to start server:', error);
    process.exit(1);
  }
}

// Start the server if this file is executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  startServer().catch(error => {
    console.error('Unhandled error during server startup:', error);
    process.exit(1);
  });
}

export default app;
