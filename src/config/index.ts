import { env } from './env';
import { authConfig } from './auth';
import * as constants from './constants';

export { env, authConfig, constants };

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
