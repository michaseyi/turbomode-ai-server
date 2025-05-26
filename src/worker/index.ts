import { Worker } from 'bullmq';
import { redis } from '@/lib/cache';
import { loggerUtils } from '@/utils';
import {
  EmailJobData,
  GmailMessageJobData,
  GmailPushJobData,
  InvokeAssistantJobData,
  UserAssistantInvocationJobData,
} from '@/types/queue.type';
import { actionService, integrationService, mailService } from '@/services';
import { Message, Topic } from '@google-cloud/pubsub';
import { config } from '@/config';
import { pubsub } from '@/lib/pubsub';
import { startAgentStream } from '@/lib/stream-helper';
import { timeMs } from '@/config/constants';

type BullMqWorkerHandler<T> = (job: { data: T }) => Promise<any>;

type PubSubWorkerHandler = (message: Message) => Promise<any>;

export function createBullMqWorker<T>(queueName: string, handler: BullMqWorkerHandler<T>) {
  new Worker<T>(
    queueName,
    async job => {
      await handler(job);
    },
    { connection: redis }
  )
    .on('active', () => {
      loggerUtils.info(`[${queueName}] processing new job`);
    })
    .on('error', e => {
      loggerUtils.error(`[${queueName}] encountered error`, { e });
    })
    .on('failed', (_, e) => {
      loggerUtils.error(`[${queueName}] failed`, { e });
    })
    .on('completed', (_, result) => {
      loggerUtils.info(`[${queueName}] completed`, { result });
    });

  loggerUtils.info(`bullmq worker for ${queueName} is running`);
}

export function createPubSubWorker(topic: string, handler: PubSubWorkerHandler) {
  const sub = pubsub.subscription(config.env.GOOGLE_PUBSUB_INCOMING_MAIL_SUB, {
    // topic: new Topic(pubsub, topic),
  });

  sub.on('message', handler);

  loggerUtils.info(`pubsub worker for ${topic} is running`);
}

createBullMqWorker<GmailMessageJobData>('gmail-message', job =>
  integrationService.processGmailMessage(job.data)
);

createBullMqWorker<EmailJobData>('email', job => mailService.send(job.data));

createBullMqWorker<InvokeAssistantJobData>('invoke-assistant', job =>
  actionService.invokeAssistant(job.data)
);

createBullMqWorker<GmailPushJobData>('gmail-pubsub-push', job =>
  integrationService.processGmailHistory(job.data)
);

createBullMqWorker<UserAssistantInvocationJobData>('user-assistant-invocation', job =>
  actionService.requestCompletion(job.data)
);

createPubSubWorker(config.env.GOOGLE_PUBSUB_INCOMING_MAIL_TOPIC, integrationService.onGmailHistory);
