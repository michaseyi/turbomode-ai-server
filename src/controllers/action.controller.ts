import { db } from '@/lib/db';
import { apiUtils, controllerUtils, encryptionUtils } from '@/utils';
import { z } from 'zod';
import { actionValidation, baseValidation } from '@/validation';
import { Context } from 'hono';
import { actionService } from '@/services';
import { streamSSE } from 'hono/streaming';

export const getActions = apiUtils.buildPaginatedRouteHandler({
  model: db.action,
  schema: {
    query: baseValidation.apiQuery as any, // todo: fix this type issue later
    response: actionValidation.fetchedAction,
  },
  fetchOptions: user => ({ userId: user.id }),
});

export const getAction = apiUtils.buildRouteHandler({
  model: db.action,
  schema: {
    query: z.object({}),
    response: z.object({}),
  },
  fetchOptions: user => ({ userId: user.id }),
});

export async function streamAction2(
  c: Context<
    any,
    any,
    {
      out: {
        query: z.infer<typeof actionValidation.streamQuery>;
        param: z.infer<typeof actionValidation.paramSchema>;
      };
    }
  >
) {
  const user = c.get('user')!;

  const { actionId } = c.req.valid('param');

  const query = c.req.valid('query');

  const result = await actionService.streamAction(
    user.id,
    actionId,
    query.prompt || null,
    c.req.raw.signal
  );

  if (!result.ok) {
    return controllerUtils.createErrorResponse(c, result.message, 400);
  }

  if (typeof result.data === 'boolean') {
    return controllerUtils.createSuccessWithoutDataResponse(c, result.message, 200);
  }

  const messageStream = result.data;
  return streamSSE(c, async stream => {
    for await (const message of messageStream) {
      await stream.writeSSE(message);
    }
  });
}

export async function streamAction(
  c: Context<
    any,
    any,
    {
      out: {
        query: z.infer<typeof actionValidation.streamQuery>;
        param: z.infer<typeof actionValidation.paramSchema>;
      };
    }
  >
) {
  const user = c.get('user')!;
  const { actionId } = c.req.valid('param');
  const query = c.req.valid('query');

  const result = await actionService.streamAction(
    user.id,
    actionId,
    query.prompt || null,
    c.req.raw.signal
  );

  if (!result.ok) {
    return controllerUtils.createErrorResponse(c, result.message, 400);
  }

  if (typeof result.data === 'boolean') {
    return controllerUtils.createSuccessWithoutDataResponse(c, result.message, 200);
  }

  const messageStream = result.data;

  return streamSSE(c, async stream => {
    const pingInterval = 3_000; // 3 seconds
    let isClosed = false;

    const pingTimer = setInterval(async () => {
      console.log('nice');
      if (!isClosed) {
        try {
          await stream.write(`:ping\n\n`);
        } catch (e) {
          clearInterval(pingTimer);
        }
      }
    }, pingInterval);

    try {
      for await (const message of messageStream) {
        await stream.writeSSE(message);
      }
    } finally {
      isClosed = true;
      clearInterval(pingTimer);
    }
  });
}

export async function fetchActionMessageHistory(
  c: Context<any, any, { out: { param: z.infer<typeof actionValidation.paramSchema> } }>
) {
  const user = c.get('user')!;

  const { actionId } = c.req.valid('param');

  const result = await actionService.fetchActionMessageHistory(user.id, actionId);

  if (!result.ok) {
    return controllerUtils.createErrorResponse(c, result.message, 400);
  }

  return controllerUtils.createSuccessResponse(c, result.message, result.data, 200);
}

export async function createAction(c: Context) {
  const user = c.get('user')!;

  const result = await actionService.createAction(user.id);

  if (!result.ok) {
    return controllerUtils.createErrorResponse(c, result.message, 400);
  }

  return controllerUtils.createSuccessResponse(c, result.message, result.data, 200);
}
