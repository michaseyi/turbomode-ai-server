import { z } from 'zod';

export { authValidation } from '@/validation/auth.validation';
export { integrationValidation } from '@/validation/integration.validation';
export { userValidation } from '@/validation/user.validation';

export const baseValidation = {
  apiErrorResponse: z.object({
    success: z.literal(false),
    error: z.object({
      message: z.string(),
      details: z.record(z.string(), z.array(z.string())).optional(),
    }),
  }),

  apiDatalessResponse: z.object({
    success: z.literal(true),
    message: z.string(),
  }),
};
