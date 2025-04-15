import z from 'zod';

const authValidation = {
  login: z.object({
    email: z.string().email(),
    password: z.string(),
  }),
};

export { authValidation };
