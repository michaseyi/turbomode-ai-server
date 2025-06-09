import { noteController } from '@/controllers';
import { authMiddleware } from '@/middlewares';
import { userValidation } from '@/validation';
import { baseValidation } from '@/validation/base.validation';
import { createRoute, OpenAPIHono } from '@hono/zod-openapi';
import { controllerUtils, routeUtils } from '@/utils';

export const noteRouter = new OpenAPIHono({
  defaultHook: controllerUtils.validationHook,
});

noteRouter.use(authMiddleware.ensureAuthenticated);

noteRouter.openapi(
  createRoute({
    method: 'post',
    path: '/',
    description: 'Create a new note',
    tags: ['Note'],
    responses: {
      200: {
        description: 'Success',
        content: {
          'application/json': {
            schema: controllerUtils.resolveApiResponseSchema(userValidation.fetchedNoteSchema),
          },
        },
      },
      ...routeUtils.errorResponses,
    },
  }),
  noteController.createNote
);

noteRouter.openapi(
  createRoute({
    method: 'get',
    path: '/',
    description: 'Get notes',
    tags: ['Note'],
    request: {
      query: userValidation.queryNotesSchema,
    },
    responses: {
      200: {
        description: 'Notes retrieved successfully.',
        content: {
          'application/json': {
            schema: controllerUtils.resolvePaginatedApiResponseSchema(
              userValidation.fetchedNoteSchema
            ),
          },
        },
      },
      400: {
        description: 'Failed to retrieve notes due to validation error.',
        content: {
          'application/json': {
            schema: baseValidation.apiErrorResponse,
          },
        },
      },
    },
  }),
  noteController.fetchNotes
);

noteRouter.openapi(
  createRoute({
    method: 'get',
    path: '/{noteId}',
    description: 'Fetch note',
    tags: ['Note'],
    request: {
      params: userValidation.noteParamSchema,
    },
    responses: {
      200: {
        description: 'Success',
        content: {
          'application/json': {
            schema: controllerUtils.resolveApiResponseSchema(userValidation.detailedNoteSchema),
          },
        },
      },
      ...routeUtils.errorResponses,
    },
  }),
  noteController.fetchNote
);

noteRouter.openapi(
  createRoute({
    method: 'patch',
    path: '/{noteId}',
    description: 'Update a note',
    tags: ['Note'],
    request: {
      required: true,
      params: userValidation.noteParamSchema,
      body: {
        content: {
          'application/json': {
            schema: userValidation.updateNoteSchema,
          },
        },
      },
    },
    responses: {
      200: {
        description: 'Success',
        content: {
          'application/json': {
            schema: baseValidation.apiResponse,
          },
        },
      },
      ...routeUtils.errorResponses,
    },
    middleware: authMiddleware.ensureAuthenticated,
  }),
  noteController.updateNote
);

noteRouter.openapi(
  createRoute({
    method: 'delete',
    path: '/{noteId}',
    description: 'Delete a note',
    tags: ['Note'],
    request: {
      params: userValidation.noteParamSchema,
    },
    responses: {
      200: {
        description: 'Success',
        content: {
          'application/json': {
            schema: baseValidation.apiResponse,
          },
        },
      },
      ...routeUtils.errorResponses,
    },
  }),
  noteController.deleteNote
);
