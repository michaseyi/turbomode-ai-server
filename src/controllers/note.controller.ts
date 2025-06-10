import { noteService } from '@/services';
import { controllerUtils } from '@/utils';
import { userValidation } from '@/validation';
import { Context } from 'hono';
import { z } from 'zod';

export async function createNote(c: Context) {
  const user = c.get('user')!;

  const result = await noteService.createNote(user.id);

  if (!result.ok) {
    return controllerUtils.createErrorResponse(c, result.message, 400);
  }

  return controllerUtils.createSuccessResponse(c, result.message, result.data, 200);
}

export async function searchNotes(
  c: Context<
    any,
    any,
    {
      out: {
        query: z.infer<typeof userValidation.searchNotesSchema>;
      };
    }
  >
) {
  const user = c.get('user')!;

  const query = c.req.valid('query');

  const result = await noteService.searchNotes(user.id, query);

  if (!result.ok) {
    return controllerUtils.createErrorResponse(c, result.message, 400);
  }

  return controllerUtils.createPaginatedResponse(
    c,
    result.message,
    result.data.data,
    result.data.pagination
  );
}

export async function fetchNotes(
  c: Context<
    any,
    any,
    {
      out: {
        query: z.infer<typeof userValidation.queryNotesSchema>;
      };
    }
  >
) {
  const user = c.get('user')!;

  const query = c.req.valid('query');

  const result = await noteService.fetchNotes(user.id, query);

  if (!result.ok) {
    return controllerUtils.createErrorResponse(c, result.message, 400);
  }

  return controllerUtils.createPaginatedResponse(
    c,
    result.message,
    result.data.data,
    result.data.pagination
  );
}

export async function updateNote(
  c: Context<
    any,
    any,
    {
      out: {
        param: z.infer<typeof userValidation.noteParamSchema>;
        json: z.infer<typeof userValidation.updateNoteSchema>;
      };
    }
  >
) {
  const user = c.get('user')!;
  const body = c.req.valid('json');
  const { noteId } = c.req.valid('param');

  const result = await noteService.updateNote(user.id, noteId, body);

  if (!result.ok) {
    return controllerUtils.createErrorResponse(c, result.message, 400);
  }

  return controllerUtils.createSuccessResponse(c, result.message, result.data, 200);
}

export async function fetchNote(
  c: Context<
    any,
    any,
    {
      out: {
        param: z.infer<typeof userValidation.noteParamSchema>;
      };
    }
  >
) {
  const user = c.get('user')!;
  const { noteId } = c.req.valid('param');

  const result = await noteService.fetchNote(user.id, noteId);

  if (!result.ok) {
    return controllerUtils.createErrorResponse(c, result.message, 400);
  }

  return controllerUtils.createSuccessResponse(c, result.message, result.data, 200);
}

export async function deleteNote(
  c: Context<
    any,
    any,
    {
      out: {
        param: z.infer<typeof userValidation.noteParamSchema>;
      };
    }
  >
) {
  const user = c.get('user')!;
  const { noteId } = c.req.valid('param');

  const result = await noteService.deleteNote(user.id, noteId);

  if (!result.ok) {
    return controllerUtils.createErrorResponse(c, result.message, 400);
  }

  return controllerUtils.createSuccessWithoutDataResponse(c, result.message, 200);
}
