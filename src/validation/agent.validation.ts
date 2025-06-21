import { z } from 'zod';

const noteContextSchema = z.object({
  type: z.literal('note'),
  noteId: z.string(),
});

const emailContextSchema = z.object({
  type: z.literal('email'),
  integrationId: z.string(),
  messageId: z.string(),
});

const calendarContextSchema = z.object({
  type: z.literal('calendar'),
  integrationId: z.string(),
  eventId: z.string(),
});

const actionContextSchema = z.object({
  type: z.literal('action'),
  actionId: z.string(),
});

const fileContextSchema = z.object({
  type: z.literal('file'),
  fileId: z.string(),
});

const contextSchema = z.union([
  noteContextSchema,
  emailContextSchema,
  calendarContextSchema,
  actionContextSchema,
  fileContextSchema,
]);

export const agentValidation = {
  invokeAgentSchema: z.object({
    agentId: z.string(),
    context: z.array(contextSchema),
    prompt: z.string().optional(),
  }),

  invokeAgentResponseSchema: z.object({}),

  listAgentsResponseSchema: z
    .object({
      id: z.string(),
      name: z.string(),
      description: z.string(),
    })
    .array(),
};
