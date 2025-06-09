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

type QueryResult = {
  archived?: boolean;
  pinned?: boolean;
  favorite?: boolean;
  createdAt?: { gte?: string; lte?: string };
  updatedAt?: { gte?: string; lte?: string };
  content?: { contains: string; mode: 'insensitive' };
  title?: { contains: string; mode: 'insensitive' };
  tags?: { has: string } | { hasEvery: string[] };
  folder?: string;
  type?: string;
  hasAttachment?: boolean;
  wordCount?: { gte?: number; lte?: number };
  OR?: QueryResult[];
  NOT?: QueryResult;
};

export function buildQuery(query: string): { where: QueryResult } {
  const where: QueryResult = {};
  const tokens = query.match(/([\w-]+:[^\s]+)|("[^"]+")|([^\s]+)/g) || [];
  let freeText: string[] = [];
  let notClauses: QueryResult[] = [];

  tokens.forEach(token => {
    // for not
    if (token.startsWith('-')) {
      const notToken = token.substring(1);
      const notClause = processSingleToken(notToken);
      if (Object.keys(notClause).length > 0) {
        notClauses.push(notClause);
      }
      return;
    }

    if (token.toUpperCase() === 'OR') {
      return;
    }

    const processed = processSingleToken(token);
    if (processed.freeText) {
      freeText.push(processed.freeText);
    } else {
      Object.assign(where, processed);
    }
  });

  if (freeText.length) {
    where.content = { contains: freeText.join(' '), mode: 'insensitive' };
  }

  if (notClauses.length > 0) {
    where.NOT = notClauses.length === 1 ? notClauses[0] : { OR: notClauses };
  }

  return { where };
}

function processSingleToken(token: string): QueryResult & { freeText?: string } {
  const result: QueryResult & { freeText?: string } = {};

  if (token.startsWith('is:')) {
    const status = token.replace('is:', '');
    switch (status) {
      case 'archived':
        result.archived = true;
        break;
      case 'pinned':
        result.pinned = true;
        break;
      case 'favorite':
      case 'starred':
        result.favorite = true;
        break;
      case 'unarchived':
        result.archived = false;
        break;
      case 'unpinned':
        result.pinned = false;
        break;
    }
  } else if (token.startsWith('has:')) {
    const has = token.replace('has:', '');
    if (has === 'attachment') {
      result.hasAttachment = true;
    }
  } else if (token.startsWith('tag:') || token.startsWith('#')) {
    const tag = token.startsWith('#') ? token.substring(1) : token.replace('tag:', '');
    result.tags = { has: tag };
  } else if (token.startsWith('in:')) {
    result.folder = token.replace('in:', '');
  } else if (token.startsWith('type:')) {
    result.type = token.replace('type:', '');
  } else if (token.startsWith('title:')) {
    const titleText = token.replace('title:', '').replace(/"/g, '');
    result.title = { contains: titleText, mode: 'insensitive' };
  } else if (token.startsWith('content:')) {
    result.freeText = token.replace('content:', '').replace(/"/g, '');
  } else if (token.startsWith('after:')) {
    result.createdAt = result.createdAt || {};
    result.createdAt.gte = token.replace('after:', '');
  } else if (token.startsWith('before:')) {
    result.createdAt = result.createdAt || {};
    result.createdAt.lte = token.replace('before:', '');
  } else if (token.startsWith('modified:') || token.startsWith('updated:')) {
    const dateValue = token.replace(/^(modified:|updated:)/, '');
    result.updatedAt = { gte: dateValue, lte: dateValue };
  } else if (token.startsWith('modified-after:') || token.startsWith('updated-after:')) {
    const dateValue = token.replace(/^(modified-after:|updated-after:)/, '');
    result.updatedAt = result.updatedAt || {};
    result.updatedAt.gte = dateValue;
  } else if (token.startsWith('modified-before:') || token.startsWith('updated-before:')) {
    const dateValue = token.replace(/^(modified-before:|updated-before:)/, '');
    result.updatedAt = result.updatedAt || {};
    result.updatedAt.lte = dateValue;
  } else if (token.startsWith('words:')) {
    const wordSpec = token.replace('words:', '');
    if (wordSpec.startsWith('>')) {
      result.wordCount = { gte: parseInt(wordSpec.substring(1)) };
    } else if (wordSpec.startsWith('<')) {
      result.wordCount = { lte: parseInt(wordSpec.substring(1)) };
    } else {
      const count = parseInt(wordSpec);
      if (!isNaN(count)) {
        result.wordCount = { gte: count, lte: count };
      }
    }
  } else {
    result.freeText = token.replace(/"/g, '');
  }

  return result;
}

export function buildOrQuery(queries: string[]): { where: QueryResult } {
  const orClauses = queries.map(q => buildQuery(q).where);
  return { where: { OR: orClauses } };
}
