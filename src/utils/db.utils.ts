import { db } from '@/lib/db';
import { ApiQuery } from '@/types';
import { apiUtils } from '@/utils';

export async function paginate<
  TModel,
  TArgs extends { where: Partial<TModel> } = { where: Partial<TModel> },
>(
  model: {
    findMany: (args: TArgs) => Promise<TModel[]>;
    count: (args: any) => Promise<number>;
  },
  query: ApiQuery<Partial<TModel>>
) {
  const { limit, page } = query;

  const pageSize = limit ?? 10;
  const currentPage = page ?? 1;

  const { where, orderBy, skip, take } = apiUtils.parseQuery<Partial<TModel>>({
    ...query,
    limit: pageSize,
    page: currentPage,
  });

  const [items, total] = await Promise.all([
    model.findMany({ where: where, orderBy, skip, take } as any as TArgs),
    model.count({ where: where }),
  ]);

  return {
    data: items,
    pagination: {
      total,
      page: currentPage,
      limit: pageSize,
    },
  };
}

// function _<
//   T,
//   U extends T extends { findMany: (d?: infer _) => infer J } ? Awaited<J> : never,
//   V extends T extends { findMany: (d?: infer T) => Promise<U> } ? T : never,
// >(a: T, b: V): U {
//   return {} as any;
// }
