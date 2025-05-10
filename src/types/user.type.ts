import { userValidation } from '@/validation';
import { z } from 'zod';

export type FetchedUser = z.infer<typeof userValidation.fetchedUser>;
