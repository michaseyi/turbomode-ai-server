import { z } from 'zod';

export const actionValidation = {
  fetchedAction: z.object({
    id: z.string(),
    title: z.string(),
    active: z.boolean(),
    createdAt: z.date(),
    updatedAt: z.date(),
  }),

  createAction: z.object({
    content: z.string().optional(),
  }),

  actionMessage: z.object({ event: z.string(), data: z.string() }),
};

