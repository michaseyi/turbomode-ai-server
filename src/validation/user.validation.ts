import { Role } from '@prisma/client';
import { z } from 'zod';
import { baseValidation } from './base.validation';
const detailedNoteSchema = z.object({
  id: z.string(),
  title: z.string(),
  content: z.any(),
  snippet: z.string().optional().nullable(),
  archived: z.boolean(),
  pinned: z.boolean(),
  favorite: z.boolean(),
  createdAt: z.date(),
  updatedAt: z.date(),
});

export const userValidation = {
  noteParamSchema: z.object({
    noteId: z.string(),
  }),

  fetchedUser: z.object({
    id: z.string(),
    firstName: z.string(),
    lastName: z.string(),
    role: z.enum([Role.Admin, Role.User]),
    email: z.string().email(),
    profileImage: z.string().nullable(),
    createdAt: z.date(),
    updatedAt: z.date(),
    isEmailVerified: z.boolean(),
  }),

  queryNotesSchema: baseValidation.apiQuery.extend({
    archived: z.coerce.boolean().optional(),
    pinned: z.coerce.boolean().optional(),
    favorite: z.coerce.boolean().optional(),
  }),

  searchNotesSchema: baseValidation.apiQuery.extend({
    text: z.string(),
    archived: z.coerce.boolean().optional(),
    pinned: z.coerce.boolean().optional(),
    favorite: z.coerce.boolean().optional(),
  }),

  detailedNoteSchema,

  updateNoteSchema: detailedNoteSchema
    .pick({
      title: true,
      content: true,
      archived: true,
      pinned: true,
      favorite: true,
    })
    .deepPartial(),

  fetchedNoteSchema: detailedNoteSchema
    .pick({
      id: true,
      title: true,
      snippet: true,
      archived: true,
      pinned: true,
      favorite: true,
      createdAt: true,
      updatedAt: true,
    })
    .extend({
      content: z.any().optional().nullable(),
    }),
};
