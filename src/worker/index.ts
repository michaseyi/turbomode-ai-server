import { Worker } from 'bullmq';
import { redis } from '@/lib/cache';
import { loggerUtils } from '@/utils';
import { EmailJobData, GmailMessageJobData } from '@/types/queue.type';
import { integrationService, mailService } from '@/services';
import { Message } from '@google-cloud/pubsub';
import { config } from '@/config';
import { pubsub } from '@/lib/pubsub';

type BullMqWorkerHandler<T> = (job: { data: T }) => Promise<any>;

type PubSubWorkerHandler = (message: Message) => Promise<any>;

export function createBullMqWorker<T>(queueName: string, handler: BullMqWorkerHandler<T>) {
  new Worker<T>(
    queueName,
    async job => {
      await handler(job);
    },
    { connection: redis }
  );

  loggerUtils.info(`bullmq worker for ${queueName} is running`);
}

export function createPubSubWorker(topic: string, handler: PubSubWorkerHandler) {
  const sub = pubsub.subscription(config.env.GOOGLE_PUBSUB_INCOMING_MAIL_SUB);

  sub.on('message', handler);

  loggerUtils.info(`pubsub worker for ${topic} is running`);
}

createBullMqWorker<GmailMessageJobData>('gmail-message', job =>
  integrationService.processGmailMessage(job.data)
);

createBullMqWorker<EmailJobData>('email', job => mailService.send(job.data));

createPubSubWorker(config.env.GOOGLE_PUBSUB_INCOMING_MAIL_TOPIC, integrationService.onGmailHistory);
