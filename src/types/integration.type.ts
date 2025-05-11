import { integrationValidation } from '@/validation';
import { z } from 'zod';

export type AddGmailIntegrationPayload = z.infer<typeof integrationValidation.addGmailIntegration>;

export type ModifyGmailIntegrationPayload = z.infer<
  typeof integrationValidation.modifyGmailIntegration
>;

export type FetchedGmailIntegration = z.infer<typeof integrationValidation.fetchedGmailIntegration>;

export type IntegrationBaseParams = z.infer<typeof integrationValidation.integrationBaseParams>;

export type GmailPushNotification = z.infer<typeof integrationValidation.gmailPush>;

export type MailMessage = {
  from: string | null;
  to: string | null;
  subject: string | null;
  date: string | null;
  body: string;
};
