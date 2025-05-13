import { integrationValidation } from '@/validation';
import { z } from 'zod';

export type EmailJobData = {
  to: string;
  subject: string;
  template: string;
  context?: Record<string, any>;
};

export type GmailMessageJobData = {
  messageId: string;
  email: string;
  integrationId: string;
};

export type InvokeAssistantJobData = {
  userId: string;
  prompt: string;
};

export type GmailPushJobData = z.infer<typeof integrationValidation.gmailPush>;
