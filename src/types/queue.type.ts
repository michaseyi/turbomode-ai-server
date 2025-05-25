import { integrationValidation } from '@/validation';
import { BaseMessage } from '@langchain/core/messages';
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
  prompt: BaseMessage;
  context: Record<string, any>;
};

export type UserAssistantInvocationJobData = {
  userId: string;
  actionId: string;
  prompt: BaseMessage;
  context?: Record<string, any>;
};

export type GmailPushJobData = z.infer<typeof integrationValidation.gmailPush>;
