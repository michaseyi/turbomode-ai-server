import { db } from '@/lib/db';
import { apiUtils } from '@/utils';
import { z } from 'zod';
import { actionValidation, baseValidation } from '@/validation';

export const getActions = apiUtils.buildPaginatedRouteHandler({
  model: db.action,
  schema: {
    query: baseValidation.apiQuery as any, // todo: fix this type issue later
    response: actionValidation.fetchedAction,
  },
  fetchOptions: user => ({ userId: user.id }),
});

export const getAction = apiUtils.buildRouteHandler({
  model: db.action,
  schema: {
    query: z.object({}),
    response: z.object({}),
  },
  fetchOptions: user => ({ userId: user.id }),
});
