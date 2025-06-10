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

export function buildNotesQuery(query: string): { where: QueryResult } {
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
  const orClauses = queries.map(q => buildNotesQuery(q).where);
  return { where: { OR: orClauses } };
}
type PrismaWhereClause = {
  archived?: boolean;
  pinned?: boolean;
  favorite?: boolean;
  createdAt?: {
    gte?: Date;
    lte?: Date;
  };
  updatedAt?: {
    gte?: Date;
    lte?: Date;
  };
  content?: {
    contains: string;
    mode: 'insensitive';
  };
  title?: {
    contains: string;
    mode: 'insensitive';
  };
  // tags?:
  //   | {
  //       has: string;
  //     }
  //   | {
  //       hasEvery: string[];
  //     };
  // folder?: string;
  // type?: string;
  // hasAttachment?: boolean;
  // wordCount?: {
  //   gte?: number;
  //   lte?: number;
  // };
  OR?: PrismaWhereClause[];
  NOT?: PrismaWhereClause;
};

export function convertNoteQueryToPrismaWhere(query: QueryResult): PrismaWhereClause {
  const result: PrismaWhereClause = {};

  if (query.archived !== undefined) result.archived = query.archived;
  if (query.pinned !== undefined) result.pinned = query.pinned;
  if (query.favorite !== undefined) result.favorite = query.favorite;
  // if (query.hasAttachment !== undefined) result.hasAttachment = query.hasAttachment;

  // if (query.folder !== undefined) result.folder = query.folder;
  // if (query.type !== undefined) result.type = query.type;

  // Handle date fields - convert strings to Date objects
  if (query.createdAt) {
    result.createdAt = {};
    if (query.createdAt.gte) result.createdAt.gte = new Date(query.createdAt.gte);
    if (query.createdAt.lte) result.createdAt.lte = new Date(query.createdAt.lte);
  }

  if (query.updatedAt) {
    result.updatedAt = {};
    if (query.updatedAt.gte) result.updatedAt.gte = new Date(query.updatedAt.gte);
    if (query.updatedAt.lte) result.updatedAt.lte = new Date(query.updatedAt.lte);
  }

  if (query.content) {
    result.content = {
      contains: query.content.contains,
      mode: query.content.mode,
    };
  }

  if (query.title) {
    result.title = {
      contains: query.title.contains,
      mode: query.title.mode,
    };
  }

  // if (query.tags) {
  //   result.tags = query.tags;
  // }

  // if (query.wordCount) {
  //   result.wordCount = {};
  //   if (query.wordCount.gte !== undefined) result.wordCount.gte = query.wordCount.gte;
  //   if (query.wordCount.lte !== undefined) result.wordCount.lte = query.wordCount.lte;
  // }

  if (query.OR) {
    result.OR = query.OR.map(orQuery => convertNoteQueryToPrismaWhere(orQuery));
  }

  if (query.NOT) {
    result.NOT = convertNoteQueryToPrismaWhere(query.NOT);
  }

  return result;
}

type QdrantFilter = {
  should?: QdrantCondition[];
  must?: QdrantCondition[];
  must_not?: QdrantCondition[];
};

type QdrantCondition =
  | {
      key: string;
      match?: {
        value: string | number | boolean;
      };
      range?: {
        gte?: number;
        lte?: number;
        gt?: number;
        lt?: number;
      };
    }
  | {
      should?: QdrantCondition[];
      must?: QdrantCondition[];
      must_not?: QdrantCondition[];
    };

export function convertToQdrantFilter(query: QueryResult): QdrantFilter {
  const must: QdrantCondition[] = [];

  if (query.archived !== undefined) {
    must.push({
      key: 'metadata.archived',
      match: { value: query.archived },
    });
  }

  if (query.pinned !== undefined) {
    must.push({
      key: 'metadata.pinned',
      match: { value: query.pinned },
    });
  }

  if (query.favorite !== undefined) {
    must.push({
      key: 'metadata.favorite',
      match: { value: query.favorite },
    });
  }

  // if (query.hasAttachment !== undefined) {
  //   must.push({
  //     key: 'hasAttachment',
  //     match: { value: query.hasAttachment },
  //   });
  // }

  // if (query.folder !== undefined) {
  //   must.push({
  //     key: 'folder',
  //     match: { value: query.folder },
  //   });
  // }

  // if (query.type !== undefined) {
  //   must.push({
  //     key: 'type',
  //     match: { value: query.type },
  //   });
  // }

  if (query.createdAt) {
    const condition: any = { key: 'metadata.createdAt', range: {} };
    if (query.createdAt.gte) {
      condition.range.gte = new Date(query.createdAt.gte).toISOString();
    }
    if (query.createdAt.lte) {
      condition.range.lte = new Date(query.createdAt.lte).toISOString();
    }
    must.push(condition);
  }

  if (query.updatedAt) {
    const condition: any = { key: 'metadata.updatedAt', range: {} };
    if (query.updatedAt.gte) {
      condition.range.gte = new Date(query.updatedAt.gte).toISOString();
    }
    if (query.updatedAt.lte) {
      condition.range.lte = new Date(query.updatedAt.lte).toISOString();
    }
    must.push(condition);
  }

  // if (query.tags) {
  //   if ('has' in query.tags) {
  //     must.push({
  //       key: 'tags',
  //       match: { value: query.tags.has },
  //     });
  //   } else if ('hasEvery' in query.tags) {
  //     query.tags.hasEvery.forEach(tag => {
  //       must.push({
  //         key: 'tags',
  //         match: { value: tag },
  //       });
  //     });
  //   }
  // }

  // if (query.wordCount) {
  //   const condition: any = { key: 'wordCount', range: {} };
  //   if (query.wordCount.gte !== undefined) {
  //     condition.range.gte = query.wordCount.gte;
  //   }
  //   if (query.wordCount.lte !== undefined) {
  //     condition.range.lte = query.wordCount.lte;
  //   }
  //   must.push(condition);
  // }

  const result: QdrantFilter = {};

  if (must.length > 0) {
    result.must = must;
  }

  if (query.OR) {
    result.should = query.OR.map(orQuery => {
      const orFilter = convertToQdrantFilter(orQuery);
      return orFilter.must?.[0] || { key: 'empty', match: { value: true } };
    });
  }

  if (query.NOT) {
    const notFilter = convertToQdrantFilter(query.NOT);
    if (notFilter.must) {
      result.must_not = notFilter.must;
    }
  }

  return result;
}
