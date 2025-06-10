import { db } from '@/lib/db';
import { PaginatedT, ServiceErrorCode, ServiceResult } from '@/types';
import { apiUtils, dbUtils, serviceUtils } from '@/utils';
import { userValidation } from '@/validation';
import { z } from 'zod';
import '@/lib/vector-store';
import { notesVectorStore } from '@/lib/vector-store';
import { Document } from '@langchain/core/documents';
import { IndexNoteJobData } from '@/types/queue.type';
import { indexNoteQueue } from '@/queues';
import { convertNoteQueryToPrismaWhere } from '@/utils/api.utils';

export async function createNote(
  userId: string
): Promise<ServiceResult<z.infer<typeof userValidation.fetchedNoteSchema>>> {
  const note = await db.note.create({
    data: {
      userId,
      title: 'Untitled Note',
      content: [],
    },
  });

  return serviceUtils.createSuccessResult(
    'Note created',
    userValidation.fetchedNoteSchema.parse(note)
  );
}

export async function fetchNotes(
  userId: string,
  query: z.infer<typeof userValidation.queryNotesSchema>
): Promise<ServiceResult<PaginatedT<z.infer<typeof userValidation.fetchedNoteSchema>>>> {
  const { data, pagination } = await dbUtils.paginateV2(
    db.note,
    { ...(<any>query), userId },
    { omit: { content: true } }
  );

  return serviceUtils.createSuccessResult('Notes fetched', {
    data: userValidation.fetchedNoteSchema.array().parse(data),
    pagination,
  });
}

export async function fetchNote(
  userId: string,
  noteId: string
): Promise<ServiceResult<z.infer<typeof userValidation.detailedNoteSchema>>> {
  const note = await db.note.findUnique({ where: { userId, id: noteId } });

  if (!note) {
    return serviceUtils.createErrorResult('Note not found', ServiceErrorCode.NotFound);
  }

  return serviceUtils.createSuccessResult(
    'Note fetched',
    userValidation.detailedNoteSchema.parse(note)
  );
}

export async function updateNote(
  userId: string,
  noteId: string,
  updates: z.infer<typeof userValidation.updateNoteSchema>
): Promise<ServiceResult> {
  const note = await db.note.findUnique({ where: { userId, id: noteId }, select: { id: true } });

  if (!note) {
    return serviceUtils.createErrorResult('Note not found', ServiceErrorCode.NotFound);
  }

  await db.note.update({ where: { id: note.id, userId }, data: updates });

  await indexNoteQueue.add('index-note', { userId, noteId });

  return serviceUtils.createSuccessResult('Note updated', undefined);
}

export async function deleteNote(userId: string, noteId: string): Promise<ServiceResult> {
  const note = await db.note.findUnique({ where: { userId, id: noteId }, select: { id: true } });

  if (!note) {
    return serviceUtils.createErrorResult('Note not found', ServiceErrorCode.NotFound);
  }

  await db.$transaction(async tx => {
    await tx.note.delete({ where: { id: note.id, userId } });
    await notesVectorStore.delete({ ids: [note.id] });
  });

  return serviceUtils.createSuccessResult('Note deleted', undefined);
}

export function formatNoteContent(blocks: any): string {
  function formatBlock(block: any): string {
    const contents = block.content;

    const out = contents
      .filter(content => content.type === 'text')
      .map(content => content.text)
      .join(' ');

    return out;
  }

  const out = blocks
    .filter(block => 'content' in block)
    .map(formatBlock)
    .join(' ');
  return out;
}

export async function indexNoteJob(data: IndexNoteJobData) {
  const { userId, noteId } = data;

  const note = await db.note.findUnique({
    where: { userId, id: noteId },
  });

  if (!note) {
    throw new Error('Note not found');
  }

  const content = formatNoteContent(note.content);

  await db.note.update({
    where: { userId, id: noteId },
    data: {
      snippet: content.substring(0, 200),
    },
  });

  const document: Document = {
    pageContent: content,
    metadata: {
      title: note.title,
      snippet: note.snippet,
      archived: note.archived,
      pinned: note.pinned,
      favorite: note.favorite,
      createdAt: note.createdAt.toISOString(),
      updatedAt: note.updatedAt.toISOString(),
      userId: userId,
    },
    id: note.id,
  };

  await notesVectorStore.addDocuments([document]);

  return serviceUtils.createSuccessResult('Note indexed', undefined);
}

export async function searchNotes(
  userId: string,
  query: z.infer<typeof userValidation.searchNotesSchema>,
  options?: { includeContent?: boolean }
): Promise<ServiceResult<PaginatedT<z.infer<typeof userValidation.fetchedNoteSchema>>>> {
  const text = query.text;

  const { where } = apiUtils.buildNotesQuery(text);

  const shouldIncludeContent = options?.includeContent ?? false;

  if (!where.content?.contains.length) {
    const { data, pagination } = await dbUtils.paginateV2(
      db.note,
      {
        ...convertNoteQueryToPrismaWhere(where),
        userId,
      },
      { omit: { content: !shouldIncludeContent } }
    );

    return serviceUtils.createSuccessResult('Notes fetched', {
      data: userValidation.fetchedNoteSchema.array().parse(data),
      pagination,
    });
  }

  const filter = apiUtils.convertToQdrantFilter(where);

  filter.must = [...(filter.must || []), { key: 'metadata.userId', match: { value: userId } }];

  const value = await notesVectorStore.similaritySearch(
    where.content?.contains || '',
    query.limit,
    filter
  );

  const ids = value.map(v => v.id!);

  let data = await db.note.findMany({
    where: { userId, id: { in: ids } },
    omit: { content: !shouldIncludeContent },
  });

  const idToNote = new Map(data.map(note => [note.id, note]));
  data = ids.map(id => idToNote.get(id)).filter((note): note is (typeof data)[0] => Boolean(note));

  return serviceUtils.createSuccessResult('Notes fetched', {
    data: userValidation.fetchedNoteSchema.array().parse(data),
    pagination: {
      limit: query.limit,
      page: 1,
      total: data.length,
    },
  });
}
