import { env } from '@/config/env';
import { authConfig } from '@/config/auth';
import * as constants from '@/config/constants';

export { env, authConfig, constants };

export const config = {
  app: {
    name: env.SERVICE_NAME,
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
  constants,
  env,
};
