import { Role } from '@prisma/client';
import { z } from 'zod';

export const userValidation = {
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
};
