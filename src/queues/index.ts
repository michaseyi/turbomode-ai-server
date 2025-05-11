import { redis } from '@/lib/cache';
import { EmailJobData, GmailMessageJobData } from '@/types/queue.type';
import { Queue } from 'bullmq';

export const emailQueue = new Queue<EmailJobData>('email', {
  connection: redis,
});

export const gmailMessageQueue = new Queue<GmailMessageJobData>('gmail-message', {
  connection: redis,
});

export const invokeAgentQueue = new Queue('invoke-agent', {
  connection: redis,
});
