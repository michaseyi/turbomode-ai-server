import { z } from 'zod';

export const agentValidation = {
  invokeAgentSchema: z.object({}),

  invokeAgentResponseSchema: z.object({}),

  listAgentsResponseSchema: z.object({}),
};
