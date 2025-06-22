import { ActionTrigger } from '@prisma/client';
import { z } from 'zod';
import { agentValidation } from './agent.validation';

export const actionValidation = {
  fetchedAction: z.object({
    id: z.string(),
    title: z.string(),
    active: z.boolean(),
    createdAt: z.date(),
    updatedAt: z.date(),
  }),

  streamQuery: z.object({
    prompt: z.string().optional(),
    context: z
      .string()
      .transform(val => {
        const parsed = JSON.parse(val);
        return agentValidation.invokeAgentSchema.pick({ context: true }).parse({
          context: parsed,
        }).context;
      })
      .optional(),
  }),

  createAction: z.object({
    content: z.string().optional(),
  }),

  actionMessage: z.object({ event: z.string(), data: z.string() }),

  paramSchema: z.object({
    actionId: z.string(),
  }),

  chatMessage: z.object({
    id: z.string(),
    role: z.enum(['user', 'assistant', 'system', 'tool']),
    content: z.string(),
    timestamp: z.date(),
    metadata: z.record(z.string(), z.any()),
  }),

  createdActionSchema: z.object({
    id: z.string(),
    trigger: z.nativeEnum(ActionTrigger),
    title: z.string(),
    createdAt: z.date(),
    updatedAt: z.date(),
    active: z.boolean(),
  }),
};
