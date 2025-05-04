import z from 'zod';

const authValidation = {
  loginCredentials: z.object({
    email: z.string().email(),
    password: z.string(),
  }),

  loginResponse: z.object({
    accessToken: z.string(),
    refreshToken: z.string(),
    expiresIn: z.number(),
    tokenType: z.string().default('Bearer'),
  }),

  registrationCredentials: z.object({
    email: z.string().email(),
    password: z.string(),
    firstName: z.string().min(1),
    lastName: z.string().min(1),
  }),
};

export { authValidation };
