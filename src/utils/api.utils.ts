import { controllerUtils, dbUtils } from '@/utils';
import { Context } from 'hono';
import { ApiQuery } from '@/types';
import { z } from 'zod';

export function parseQuery<T extends Record<string, any>>(query: ApiQuery<T>) {
  const {
    limit = 10,
    page = 1,
    rangeField,
    rangeFrom,
    rangeTo,
    sortBy,
    sortOrder = 'asc',
    ...rest
  } = query;

  const rawFilters = rest as Partial<T>;
  const where: Record<string, any> = { ...rawFilters };

  if (rangeField && (rangeFrom || rangeTo)) {
    where[rangeField as string] = {};
    if (rangeFrom) where[rangeField as string].gte = rangeFrom;
    if (rangeTo) where[rangeField as string].lte = rangeTo;
  }

  const orderBy = sortBy ? { [sortBy]: sortOrder } : undefined;

  return {
    where,
    orderBy,
    skip: (page - 1) * limit,
    take: limit,
  };
}

type RouteOptions<U, T extends ApiQuery<U>, V> = {
  model: any; // e.g., db.user
  schema: {
    query: z.ZodType<T>;
    response: z.ZodType<V>;
  };
  fetchOptions?: (user: any, query: T) => any; // filter builder
};

export const buildRouteHandler = <U, T extends ApiQuery<U>, V>(options: RouteOptions<U, T, V>) => {
  const { model, schema, fetchOptions = () => ({}) } = options;

  return async function handler(
    c: Context<{}, any, { out: { param: z.infer<typeof schema.query> } }>
  ) {
    const user = c.get('user')!;
    const query = c.req.valid('param');

    const data = await model.findUnique({
      where: {
        ...fetchOptions(user, query),
      },
    });

    if (!data) {
      return controllerUtils.createErrorResponse(c, 'Not found', 404);
    }

    return controllerUtils.createSuccessResponse(c, '', schema.response.parse(data), 200);
  };
};

export const buildPaginatedRouteHandler = <U, T extends ApiQuery<U>, V>(
  options: RouteOptions<U, T, V>
) => {
  const { model, schema, fetchOptions = () => ({}) } = options;

  return async function handler(
    c: Context<{}, any, { out: { query: z.infer<typeof schema.query> } }>
  ) {
    const user = c.get('user')!;
    const query = c.req.valid('query');

    const result = await dbUtils.paginate<U>(model, {
      ...query,
      ...fetchOptions(user, query),
    });
    return controllerUtils.createPaginatedResponse(
      c,
      '',
      schema.response.array().parse(result.data),
      result.pagination
    );
  };
};
