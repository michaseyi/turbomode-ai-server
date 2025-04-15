/**
 * Configuration module
 * 
 * Central export point for all application configuration.
 * Handles environment variables, authentication settings, and application constants.
 */

import { env } from './env';
import { authConfig } from './auth';
import * as constants from './constants';

export { env, authConfig, constants };

/**
 * Application configuration
 */
export const config = {
  server: {
    port: env.PORT,
    apiPrefix: env.API_PREFIX,
    environment: env.NODE_ENV,
    timeout: env.REQUEST_TIMEOUT,
    cors: {
      origin: env.CORS_ORIGIN,
      credentials: true,
    },
  },
  database: {
    url: env.DATABASE_URL,
  },
  auth: authConfig,
};

export default config;

