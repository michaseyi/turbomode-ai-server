import { integrationService } from '@/services';
import {
  AddGoogleIntegrationPayload,
  IntegrationBaseParams,
  ModifyGmailIntegrationPayload,
} from '@/types/integration.type';
import { controllerUtils } from '@/utils';
import { integrationValidation } from '@/validation';
import { Context } from 'hono';
import { z } from 'zod';

export async function addGmailIntegration(
  c: Context<{}, any, { out: { json: AddGoogleIntegrationPayload } }>
) {
  const user = c.get('user')!;

  const body = c.req.valid('json');

  const result = await integrationService.addGmailIntegration(user.id, body);

  if (!result.ok) {
    return controllerUtils.createErrorResponse(c, result.message, 400);
  }

  return controllerUtils.createSuccessResponse(c, result.message, result.data, 201);
}

export async function addGoogleCalendarIntegration(
  c: Context<{}, any, { out: { json: AddGoogleIntegrationPayload } }>
) {
  const user = c.get('user')!;

  const body = c.req.valid('json');

  const result = await integrationService.addGoogleCalendarIntegration(user.id, body);

  if (!result.ok) {
    return controllerUtils.createErrorResponse(c, result.message, 400);
  }

  return controllerUtils.createSuccessResponse(c, result.message, result.data, 201);
}

export async function modifyGmailIntegration(
  c: Context<
    {},
    any,
    { out: { json: ModifyGmailIntegrationPayload; param: IntegrationBaseParams } }
  >
) {
  const user = c.get('user')!;

  const body = c.req.valid('json');

  const { integrationId } = c.req.valid('param');

  const result = await integrationService.modifyGmailIntegration(user.id, integrationId, body);

  if (!result.ok) {
    return controllerUtils.createErrorResponse(c, result.message, 400);
  }

  return controllerUtils.createSuccessWithoutDataResponse(c, result.message, 200);
}

export async function deleteGmailIntegration(
  c: Context<{}, any, { out: { param: IntegrationBaseParams } }>
) {
  const user = c.get('user')!;

  const { integrationId } = c.req.valid('param');

  const result = await integrationService.deleteGmailIntegration(user.id, integrationId);

  if (!result.ok) {
    return controllerUtils.createErrorResponse(c, result.message, 400);
  }

  return controllerUtils.createSuccessWithoutDataResponse(c, result.message, 200);
}

export async function deleteGoogleCalendarIntegration(
  c: Context<{}, any, { out: { param: IntegrationBaseParams } }>
) {
  const user = c.get('user')!;

  const { integrationId } = c.req.valid('param');

  const result = await integrationService.deleteGoogleCalendarIntegration(user.id, integrationId);

  if (!result.ok) {
    return controllerUtils.createErrorResponse(c, result.message, 400);
  }

  return controllerUtils.createSuccessWithoutDataResponse(c, result.message, 200);
}

export async function enableGmailIntegration(
  c: Context<{}, any, { out: { param: IntegrationBaseParams } }>
) {
  const user = c.get('user')!;

  const { integrationId } = c.req.valid('param');

  const result = await integrationService.enableGmailIntegration(user.id, integrationId);

  if (!result.ok) {
    return controllerUtils.createErrorResponse(c, result.message, 400);
  }

  return controllerUtils.createSuccessWithoutDataResponse(c, result.message, 200);
}

export async function disableGmailIntegration(
  c: Context<{}, any, { out: { param: IntegrationBaseParams } }>
) {
  const user = c.get('user')!;

  const { integrationId } = c.req.valid('param');

  const result = await integrationService.disableGmailIntegration(user.id, integrationId);

  if (!result.ok) {
    return controllerUtils.createErrorResponse(c, result.message, 400);
  }

  return controllerUtils.createSuccessWithoutDataResponse(c, result.message, 200);
}
export async function enableGoogleCalendarIntegration(
  c: Context<{}, any, { out: { param: IntegrationBaseParams } }>
) {
  const user = c.get('user')!;

  const { integrationId } = c.req.valid('param');

  const result = await integrationService.enableGoogleCalendarIntegration(user.id, integrationId);

  if (!result.ok) {
    return controllerUtils.createErrorResponse(c, result.message, 400);
  }

  return controllerUtils.createSuccessWithoutDataResponse(c, result.message, 200);
}

export async function disableGoogleCalendarIntegration(
  c: Context<{}, any, { out: { param: IntegrationBaseParams } }>
) {
  const user = c.get('user')!;

  const { integrationId } = c.req.valid('param');

  const result = await integrationService.disableGoogleCalendarIntegration(user.id, integrationId);

  if (!result.ok) {
    return controllerUtils.createErrorResponse(c, result.message, 400);
  }

  return controllerUtils.createSuccessWithoutDataResponse(c, result.message, 200);
}

export async function getGmailIntegration(c: Context) {
  const user = c.get('user')!;

  const result = await integrationService.getGmailIntegrations(user.id);

  if (!result.ok) {
    return controllerUtils.createErrorResponse(c, result.message, 400);
  }

  return controllerUtils.createSuccessResponse(c, result.message, result.data, 200);
}

export async function getGoogleCalendarIntegration(c: Context) {
  const user = c.get('user')!;

  const result = await integrationService.getGoogleCalendarIntegrations(user.id);

  if (!result.ok) {
    return controllerUtils.createErrorResponse(c, result.message, 400);
  }

  return controllerUtils.createSuccessResponse(c, result.message, result.data, 200);
}

export async function listIntegrations(c: Context) {
  const user = c.get('user')!;

  const result = await integrationService.listIntegrations(user.id);

  if (!result.ok) {
    return controllerUtils.createErrorResponse(c, result.message, 400);
  }

  return controllerUtils.createSuccessResponse(c, result.message, result.data, 200);
}

export async function fetchCalendarEvent(
  c: Context<
    any,
    any,
    {
      out: {
        param: z.infer<typeof integrationValidation.integrationBaseParams>;
        query: z.infer<typeof integrationValidation.fetchCalendarEventQuery>;
      };
    }
  >
) {
  const user = c.get('user')!;
  const { integrationId } = c.req.valid('param');
  const query = c.req.valid('query');
  const result = await integrationService.fetchCalendarEvents(user.id, integrationId, query);

  if (!result.ok) {
    return controllerUtils.createErrorResponse(c, result.message, 400);
  }

  return controllerUtils.createSuccessResponse(c, result.message, result.data, 200);
}
export async function syncCalendarEvent(
  c: Context<
    any,
    any,
    {
      out: {
        param: z.infer<typeof integrationValidation.integrationBaseParams>;
        json: z.infer<typeof integrationValidation.fetchCalendarEventQuery>;
      };
    }
  >
) {
  const user = c.get('user')!;
  const { integrationId } = c.req.valid('param');
  const body = c.req.valid('json');
  const result = await integrationService.syncGoogleCalendarEventsForMonth(
    user.id,
    integrationId,
    body
  );

  if (!result.ok) {
    return controllerUtils.createErrorResponse(c, result.message, 400);
  }

  return controllerUtils.createSuccessResponse(c, result.message, result.data, 200);
}

export async function fetchGmailMessages(
  c: Context<
    any,
    any,
    {
      out: {
        param: z.infer<typeof integrationValidation.integrationBaseParams>;
        query: z.infer<typeof integrationValidation.gmailQuery>;
      };
    }
  >
) {
  const user = c.get('user')!;
  const { integrationId } = c.req.valid('param');
  const query = c.req.valid('query');

  const result = await integrationService.fetchGmailMessages(user.id, integrationId, query);

  if (!result.ok) {
    return controllerUtils.createErrorResponse(c, result.message, 400);
  }

  return controllerUtils.createPaginatedResponse(
    c,
    result.message,
    result.data.data,
    result.data.pagination
  );
}

export async function fetchGmailMessage(
  c: Context<
    any,
    any,
    {
      out: {
        param: z.infer<typeof integrationValidation.gmailIntegrationParamSchema>;
      };
    }
  >
) {
  const user = c.get('user')!;
  const { messageId, integrationId } = c.req.valid('param');

  const result = await integrationService.fetchGmailMessage(user.id, integrationId, messageId);

  if (!result.ok) {
    return controllerUtils.createErrorResponse(c, result.message, 400);
  }

  return controllerUtils.createSuccessResponse(c, result.message, result.data, 200);
}

export async function syncGmailMessages(
  c: Context<
    any,
    any,
    {
      out: {
        param: z.infer<typeof integrationValidation.integrationBaseParams>;
      };
    }
  >
) {
  const user = c.get('user')!;
  const { integrationId } = c.req.valid('param');

  const result = await integrationService.syncGmailMessages(user.id, integrationId);

  if (!result.ok) {
    return controllerUtils.createErrorResponse(c, result.message, 400);
  }

  return controllerUtils.createSuccessResponse(c, result.message, result.data, 200);
}

export async function sendGmailMessage(
  c: Context<
    any,
    any,
    {
      out: {
        param: z.infer<typeof integrationValidation.integrationBaseParams>;
        json: z.infer<typeof integrationValidation.sendMailMessageSchema>;
      };
    }
  >
) {
  const user = c.get('user')!;
  const { integrationId } = c.req.valid('param');
  const body = c.req.valid('json');

  const result = await integrationService.sendGmailMessage(user.id, integrationId, body);
  if (!result.ok) {
    return controllerUtils.createErrorResponse(c, result.message, 400);
  }

  return controllerUtils.createSuccessResponse(c, result.message, result.data, 200);
}
