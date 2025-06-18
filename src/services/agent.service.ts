import { ServiceErrorCode, ServiceResult } from '@/types';
import { serviceUtils } from '@/utils';
import { agentValidation } from '@/validation';
import { z } from 'zod';

export async function invokeAgent(
  userId: string,
  props: z.infer<typeof agentValidation.invokeAgentSchema>
): Promise<ServiceResult<z.infer<typeof agentValidation.invokeAgentResponseSchema>>> {
  return serviceUtils.createErrorResult('Not implemented', ServiceErrorCode.NotImplemented);
}

export async function listAgents(
  userId: string
): Promise<ServiceResult<z.infer<typeof agentValidation.listAgentsResponseSchema>>> {
  return serviceUtils.createErrorResult('Not implemented', ServiceErrorCode.NotImplemented);
}
