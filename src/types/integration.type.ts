import { integrationValidation } from '@/validation';
import { z } from 'zod';

export type AddGmailIntegrationPayload = z.infer<typeof integrationValidation.addGmailIntegration>;

export type ModifyGmailIntegrationPayload = z.infer<
  typeof integrationValidation.modifyGmailIntegration
>;

export type FetchedGmailIntegration = z.infer<typeof integrationValidation.fetchedGmailIntegration>;

export type IntegrationBaseParams = z.infer<typeof integrationValidation.integrationBaseParams>;
