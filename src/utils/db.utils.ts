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
  query: ApiQuery<Partial<TModel>>,
  options: any = {}
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
    model.findMany({ ...options, where: where, orderBy, skip, take } as any as TArgs),
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

type SingleArgFunctionReturnType<F, A> = F extends (value?: A) => infer U
  ? ReturnType<(value?: A) => U>
  : never;

export async function paginateV2<
  Model extends {
    findMany: (args?: any) => Promise<Array<any>>;
    count: (args?: any) => Promise<number>;
  },
  Args extends Model extends {
    findMany: (args?: { where?: infer In } & infer Options) => Promise<Array<infer Out>>;
  }
    ? { in: In; options: Options; out: Out }
    : never,
  In = Args['in'],
  Options = Omit<Args['options'], 'where'>,
  Out = Awaited<SingleArgFunctionReturnType<Model['findMany'], { where?: In } & Options>>[number],
>(model: Model, query: ApiQuery<Partial<In>>, options: Options) {
  const { limit, page } = query;

  const pageSize = limit ?? 10;
  const currentPage = page ?? 1;

  const { where, orderBy, skip, take } = apiUtils.parseQuery<Partial<In>>({
    ...query,
    limit: pageSize,
    page: currentPage,
  });

  const [items, total] = await Promise.all([
    model.findMany({ ...options, where: where, orderBy, skip, take }),
    model.count({ where: where }),
  ]);

  return {
    data: items as Out[],
    pagination: {
      total,
      page: currentPage,
      limit: pageSize,
    },
  };
}
