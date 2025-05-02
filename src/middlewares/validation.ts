import { Context, Next, MiddlewareHandler } from 'hono';
import { ERROR_MESSAGES } from '@/config/constants.js';
import z from 'zod';
import { BaseController } from '@/controllers/base.controller';

export class ValidationMiddleware extends BaseController {
  validateRequest<BodyT, ParamT, QueryT>({
    body,
    params,
    query,
  }: {
    body?: z.ZodType<BodyT>;
    params?: z.ZodType<ParamT>;
    query?: z.ZodType<QueryT>;
  }): MiddlewareHandler {
    return async (c: Context, next: Next) => {
      const errors: Record<string, string[]> = {};

      let hasErrors = false;

      if (body) {
        try {
          const reqBody = await c.req.json();
          const result = body.safeParse(reqBody);

          if (!result.success) {
            result.error.errors.forEach(error => {
              const field = error.path[0] || 'body';
              if (!errors[field]) {
                errors[field] = [];
              }
              errors[field].push(error.message);
            });

            hasErrors = true;
          } else {
            c.set('body', result.data);
          }
        } catch (error) {
          errors.body = ['Invalid JSON data'];
          hasErrors = true;
        }
      }

      if (params) {
        const urlParams = c.req.param();
        const result = params.safeParse(urlParams);
        if (!result.success) {
          result.error.errors.forEach(error => {
            const field = error.path[0] || 'params';
            if (!errors[field]) {
              errors[field] = [];
            }
            errors[field].push(error.message);
          });

          hasErrors = true;
        } else {
          c.set('params', result.data);
        }
      }

      if (query) {
        const queryParams = c.req.query();
        const result = query.safeParse(queryParams);
        if (!result.success) {
          result.error.errors.forEach(error => {
            const field = error.path[0] || 'query';
            if (!errors[field]) {
              errors[field] = [];
            }
            errors[field].push(error.message);
          });

          hasErrors = true;
        } else {
          c.set('query', result.data);
        }
      }

      if (hasErrors) {
        return this.sendError(c, ERROR_MESSAGES.SERVER.BAD_REQUEST, 400, errors);
      }
      return await next();
    };
  }
}

export const validationMiddleware = new ValidationMiddleware();
