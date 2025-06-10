import { EmailProcessOption, IntegrationType } from '@prisma/client';
import { z } from 'zod';
import { baseValidation } from './base.validation';

const baseFetchedIntegration = z.object({
  id: z.string(),
  enabled: z.boolean(),
  createdAt: z.date(),
  updatedAt: z.date(),
});

const fetchedIntegrations = z.union([
  baseFetchedIntegration.extend({
    type: z.literal(IntegrationType.Gcalendar),
    gCalendar: z.object({
      email: z.string().email(),
    }),
  }),
  baseFetchedIntegration.extend({
    type: z.literal(IntegrationType.Gmail),
    gmail: z.object({
      email: z.string().email(),
    }),
  }),
]);

const fullMailMessageSchema = z.object({
  id: z.string(),
  snippet: z.string().nullable(),
  from: z.string().nullable(),
  to: z.string().array(),
  subject: z.string().nullable(),
  cc: z.string().array(),
  bcc: z.string().array(),
  body: z.string().nullable(),
  isUnread: z.boolean(),
  internalDate: z.date(),
  createdAt: z.date(),
  updatedAt: z.date(),
});

export const integrationValidation = {
  fullMailMessageSchema,

  mailMessageSchema: fullMailMessageSchema.omit({ body: true }),

  gmailPush: z.object({
    emailAddress: z.string().email(),
    historyId: z.coerce.string(),
  }),

  addGoogleIntegration: z.object({
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
    type: z.literal(IntegrationType.Gmail),
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

  fetchedGoogleCalendarIntegration: z.object({
    id: z.string(),
    enabled: z.boolean(),
    type: z.literal(IntegrationType.Gcalendar),
    gCalendar: z.object({
      email: z.string().email(),
    }),
    createdAt: z.date(),
    updatedAt: z.date(),
  }),

  integrationBaseParams: z.object({
    integrationId: z.string(),
  }),

  gmailIntegrationParamSchema: z.object({
    integrationId: z.string(),
    messageId: z.string(),
  }),

  fetchedIntegrations,

  fetchedCalendarEvent: z.object({
    id: z.string(),
    eventId: z.string(),
    startTime: z.date(),
    endTime: z.date(),
    location: z.string().nullable(),
    summary: z.string().nullable(),
    description: z.string().nullable(),
    htmlLink: z.string().nullable(),
    status: z.string().nullable(),
  }),

  fetchCalendarEventQuery: z.object({
    date: z.string().datetime(),
  }),

  gmailQuery: baseValidation.apiQuery.extend({}),

  sendMailMessageSchema: z
    .object({
      to: z.string().email().optional(),
      messageId: z.string().optional(),
      subject: z.string().optional(),
      body: z.string().optional(),
      cc: z.string().array().optional(),
      bcc: z.string().array().optional(),
    })
    .refine(data => (data.to && !data.messageId) || (!data.to && data.messageId), {
      message: 'Either "to" or "messageId" must be provided, but not both.',
      path: ['to', 'messageId'],
    }),
};
