import { Worker } from 'bullmq';
import { redis } from '@/lib/cache';
import { loggerUtils } from '@/utils';
import {
  EmailJobData,
  GmailMessageJobData,
  GmailPushJobData,
  InvokeAssistantJobData,
} from '@/types/queue.type';
import { actionService, integrationService, mailService } from '@/services';
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
  ).on('active', () => {
    loggerUtils.info(`[${queueName}] processing new job`);
  });

  loggerUtils.info(`bullmq worker for ${queueName} is running`);
}

export function createPubSubWorker(topic: string, handler: PubSubWorkerHandler) {
  const sub = pubsub.subscription(config.env.GOOGLE_PUBSUB_INCOMING_MAIL_SUB, {
    flowControl: { maxMessages: 10 },
  });

  sub.on('message', handler);

  loggerUtils.info(`pubsub worker for ${topic} is running`);
}

createBullMqWorker<GmailMessageJobData>('gmail-message', job =>
  integrationService.processGmailMessage(job.data)
);

createBullMqWorker<EmailJobData>('email', job => mailService.send(job.data));

createBullMqWorker<InvokeAssistantJobData>('invoke-assistant', job =>
  actionService.invokeBgAssistant(job.data)
);

createBullMqWorker<GmailPushJobData>('gmail-pubsub-push', job =>
  integrationService.processGmailHistory(job.data)
);

createPubSubWorker(config.env.GOOGLE_PUBSUB_INCOMING_MAIL_TOPIC, integrationService.onGmailHistory);
