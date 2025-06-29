import { env } from '@/config';
import { loggerUtils } from '@/utils';
import { Redis } from 'ioredis';

export const redis = new Redis(env.REDIS_URL, {
  maxRetriesPerRequest: null,
});

redis
  .ping()
  .then(() => {
    loggerUtils.info('redis connection established');
  })
  .catch(() => {
    loggerUtils.error('error connecting to redis');
  });
