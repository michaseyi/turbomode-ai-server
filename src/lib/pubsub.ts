import { config } from '@/config';
import { PubSub } from '@google-cloud/pubsub';

export const pubsub = new PubSub({
  keyFile: config.env.GOOGLE_APPLICATION_CREDENTIALS,
});
