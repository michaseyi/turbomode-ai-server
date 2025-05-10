import { EmailProcessOption, IntegrationType } from '@prisma/client';
import { z } from 'zod';

export const integrationValidation = {
  addGmailIntegration: z.object({
    code: z.string(),
  }),

  modifyGmailIntegration: z.object({
    processAttachment: z.boolean().optional(),
    processThreadHistory: z.boolean().optional(),
    specificAddresses: z.string().optional(),
    instruction: z.string().optional(),
    emailProcessOption: z
      .enum([
        EmailProcessOption.All,
        EmailProcessOption.ExceptSpecific,
        EmailProcessOption.FromSpecific,
      ])
      .optional(),
  }),

  fetchedGmailIntegration: z.object({
    id: z.string(),
    enabled: z.boolean(),
    type: z.enum([IntegrationType.GMAIL, IntegrationType.ZOOM, IntegrationType.SLACK]),
    gmail: z.object({
      email: z.string().email(),
      processAttachment: z.boolean(),
      processThreadHistory: z.boolean(),
      instruction: z.string().min(0),
      specificAddresses: z.string().nullable(),
      emailProcessOption: z.enum([
        EmailProcessOption.All,
        EmailProcessOption.ExceptSpecific,
        EmailProcessOption.FromSpecific,
      ]),
    }),
    createdAt: z.date(),
    updatedAt: z.date(),
  }),

  integrationBaseParams: z.object({
    integrationId: z.string(),
  }),
};
