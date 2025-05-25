import { z } from 'zod';

export { authValidation } from '@/validation/auth.validation';
export { integrationValidation } from '@/validation/integration.validation';
export { userValidation } from '@/validation/user.validation';
export { actionValidation } from '@/validation/action.validation';

export const baseValidation = {
  apiErrorResponse: z.object({
    success: z.literal(false),
    error: z.object({
      message: z.string(),
      details: z.record(z.string(), z.array(z.string())).optional(),
    }),
  }),

  apiResponse: z.object({
    success: z.literal(true),
    message: z.string(),
  }),

  apiPaginatedResponse: z.object({
    success: z.literal(true),
    message: z.string(),
    pagination: z.object({
      total: z.number(),
      page: z.number(),
      limit: z.number(),
      pages: z.number(),
      hasMore: z.boolean(),
    }),
  }),

  apiQuery: z.object({
    limit: z.coerce.number().max(100).optional().default(10),
    page: z.coerce.number().optional().default(1),
    sortOrder: z.enum(['asc', 'desc']).optional().default('desc'),
    rangeFrom: z.string().optional(),
    rangeTo: z.string().optional(),
    sortBy: z.string().optional().default('createdAt'),
    rangeField: z.string().optional(),
  }),
};
