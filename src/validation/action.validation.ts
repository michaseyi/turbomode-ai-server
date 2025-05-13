import { z } from 'zod';

export const actionValidation = {
  fetchedAction: z.object({
    id: z.string(),
    title: z.string(),
    active: z.boolean(),
    createdAt: z.date(),
    updatedAt: z.date(),
  }),
};
