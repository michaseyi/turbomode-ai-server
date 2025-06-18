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
      messageLabels: z
        .object({
          labelId: z.string(),
          labelName: z.string(),
        })
        .array(),
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
  labelIds: z.string().array(),
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

  gmailQuery: baseValidation.apiQuery.extend({
    sortBy: z.literal('internalDate').optional().default('internalDate'),
    labelId: z.string().optional(),
  }),

  sendMailMessageSchema: z.union([
    z.object({
      to: z.string().email().array(),
      subject: z.string(),
      body: z.string(),
    }),
    z.object({
      messageId: z.string(),
      body: z.string(),
    }),
  ]),
};
