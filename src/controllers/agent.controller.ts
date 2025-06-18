import { agentService } from '@/services';
import { controllerUtils } from '@/utils';
import { agentValidation } from '@/validation';
import { Context } from 'hono';
import { z } from 'zod';

export async function invokeAgent(
  c: Context<
    any,
    any,
    {
      out: {
        json: z.infer<typeof agentValidation.invokeAgentSchema>;
      };
    }
  >
) {
  const props = c.req.valid('json');
  const user = c.get('user')!;

  const result = await agentService.invokeAgent(user.id, props);

  if (!result.ok) {
    return controllerUtils.createErrorResponse(c, result.message, 400);
  }

  return controllerUtils.createSuccessResponse(c, result.message, result.data, 200);
}

export async function listAgents(c: Context) {
  const user = c.get('user')!;

  const result = await agentService.listAgents(user.id);

  if (!result.ok) {
    return controllerUtils.createErrorResponse(c, result.message, 400);
  }

  return controllerUtils.createSuccessResponse(c, result.message, result.data, 200);
}
