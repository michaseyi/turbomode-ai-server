import { timeMs } from '@/config/constants';
import { redis } from '@/lib/cache';
import {
  EmailJobData,
  GmailMessageJobData,
  GmailPushJobData as GmailPubSubJobData,
  IndexNoteJobData,
  InvokeAssistantJobData,
  UserAssistantInvocationJobData,
} from '@/types/queue.type';
import { Queue } from 'bullmq';

export const emailQueue = new Queue<EmailJobData>('email', {
  connection: redis,
});

export const gmailPubSubQueue = new Queue<GmailPubSubJobData>('gmail-pubsub-push', {
  connection: redis,
  defaultJobOptions: {
    delay: timeMs.SECOND * 0, // allowing some time before polling gmail api for messages
  },
});

export const gmailMessageQueue = new Queue<GmailMessageJobData>('gmail-message', {
  connection: redis,
});

export const invokeAgentQueue = new Queue<InvokeAssistantJobData>('invoke-assistant', {
  connection: redis,
});

export const userAssistantInvocationQueue = new Queue<UserAssistantInvocationJobData>(
  'user-assistant-invocation',
  { connection: redis }
);

export const indexNoteQueue = new Queue<IndexNoteJobData>('index-note', {
  connection: redis,
});
