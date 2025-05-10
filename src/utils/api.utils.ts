import { ApiQuery } from '@/types';

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
