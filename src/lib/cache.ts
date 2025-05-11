import { loggerUtils } from '@/utils';
import { Redis } from 'ioredis';

export const redis = new Redis({
  host: 'localhost',
  port: 6379,
  db: 0,
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
