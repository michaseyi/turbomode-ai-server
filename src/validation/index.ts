import { z } from 'zod';

export { authValidation } from '@/validation/auth';

export function resolveApiResponse<T>(schema: z.ZodType<T>) {
  return z.object({
    success: z.literal(true),
    message: z.string(),
    data: schema,
  });
}

export function resolvePaginatedApiResponse<T>(schema: z.ZodType<T>) {
  return z.object({
    success: z.literal(true),
    message: z.string(),
    data: schema.array(),
    pagination: z.object({
      total: z.number(),
      page: z.number(),
      limit: z.number(),
      pages: z.number(),
      hasMore: z.boolean(),
    }),
  });
}

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
