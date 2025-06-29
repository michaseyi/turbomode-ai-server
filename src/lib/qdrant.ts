import { config } from '@/config';
import { loggerUtils } from '@/utils';
import { QdrantClient } from '@qdrant/js-client-rest';

export const qdrantClient = new QdrantClient({
  url: config.env.QDRANT_URL,
  apiKey: config.env.QDRANT_API_KEY,
});

qdrantClient
  .versionInfo()
  .then(() => {
    loggerUtils.info('connected to qdrant');
  })
  .catch(error => {
    loggerUtils.error('failed to connect to qdrant', { error });
  });
