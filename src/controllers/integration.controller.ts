import { integrationService } from '@/services';
import {
  AddGoogleIntegrationPayload,
  IntegrationBaseParams,
  ModifyGmailIntegrationPayload,
} from '@/types/integration.type';
import { controllerUtils } from '@/utils';
import { Context } from 'hono';

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
