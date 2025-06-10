import { db, IntegrationType } from '@/lib/db';
import { syncGmailMessageQueue } from '@/queues';
import { PaginatedT, ServiceErrorCode, ServiceResult } from '@/types';
import {
  AddGoogleIntegrationPayload,
  FetchedGmailIntegration,
  ModifyGmailIntegrationPayload,
} from '@/types/integration.type';
import { GmailMessageSyncJobData } from '@/types/queue.type';
import { dbUtils, googleUtils, loggerUtils, serviceUtils } from '@/utils';
import { integrationValidation } from '@/validation';
import { google } from 'googleapis';
import { z } from 'zod';

export async function addGmailIntegration(
  userId: string,
  { code }: AddGoogleIntegrationPayload
): Promise<ServiceResult<FetchedGmailIntegration>> {
  const user = await db.user.findUnique({ where: { id: userId } });

  if (!user) {
    return serviceUtils.createErrorResult('User does not exist', ServiceErrorCode.Bad);
  }

  const oauth2Client = googleUtils.createOauthClient();

  loggerUtils.debug('getting tokens...');

  let tokens;

  try {
    const res = await oauth2Client.getToken(code);
    tokens = res.tokens;
  } catch (error) {
    return serviceUtils.createErrorResult('Invalid token', ServiceErrorCode.Bad);
  }

  if (!tokens.refresh_token || !tokens.access_token) {
    return serviceUtils.createErrorResult('Invalid token', ServiceErrorCode.Bad);
  }

  loggerUtils.debug('setting tokens...');
  oauth2Client.setCredentials(tokens);

  const oauth2 = google.oauth2({ version: 'v2', auth: oauth2Client });

  loggerUtils.debug('getting email info...');
  let email;

  try {
    const { data } = await oauth2.userinfo.get();
    email = data.email;
  } catch (error) {
    return serviceUtils.createErrorResult('Invalid token', ServiceErrorCode.Bad);
  }

  if (!email) {
    // should not occur excepts email was not included in the scope
    return serviceUtils.createErrorResult('Email not included in scope', ServiceErrorCode.Bad);
  }

  // check if email is already used as a source
  if (await db.gmailIntegration.count({ where: { email } })) {
    return serviceUtils.createErrorResult(
      'Email is already used as a source',
      ServiceErrorCode.Conflict
    );
  }

  const refreshToken = tokens.refresh_token;
  const accessToken = tokens.access_token;

  return await db.$transaction(async tx => {
    const integration = await tx.integration.create({
      data: {
        type: IntegrationType.Gmail,
        enabled: true,
        userId: user.id,
      },
    });

    const gmailIntegration = await tx.gmailIntegration.create({
      data: {
        email,
        instruction: '', // will be updated later by the user
        refreshToken,
        accessToken,
        integrationId: integration.id,
      },
    });

    // setup watch on email
    loggerUtils.debug('registering watch...');
    await googleUtils.watchMail(oauth2Client);

    return serviceUtils.createSuccessResult(
      'Gmail integration added',
      integrationValidation.fetchedGmailIntegration.parse({
        ...integration,
        gmail: gmailIntegration,
      })
    );
  });
}

export async function modifyGmailIntegration(
  userId: string,
  integrationId: string,
  updates: ModifyGmailIntegrationPayload
): Promise<ServiceResult> {
  const integration = await db.integration.findUnique({
    where: { id: integrationId, userId, type: IntegrationType.Gmail },
    include: { gmail: true },
  });

  if (!integration || !integration.gmail) {
    return serviceUtils.createErrorResult('Integration not found', ServiceErrorCode.NotFound);
  }

  await db.gmailIntegration.update({ where: { id: integration.gmail.id }, data: updates });
  return serviceUtils.createSuccessResult('Integration modified', undefined);
}

export async function deleteGmailIntegration(
  userId: string,
  integrationId: string
): Promise<ServiceResult> {
  const integration = await db.integration.findUnique({
    where: { id: integrationId, userId, type: IntegrationType.Gmail },
    include: { gmail: true },
  });

  if (!integration || !integration.gmail) {
    return serviceUtils.createErrorResult('Integration not found', ServiceErrorCode.NotFound);
  }

  const oauth = googleUtils.createOauthClient();
  loggerUtils.debug('setting tokens...');
  oauth.setCredentials({
    access_token: integration.gmail.accessToken,
    refresh_token: integration.gmail.refreshToken,
  });

  try {
    // disable watch
    loggerUtils.debug('unwatching mail...');
    await googleUtils.unWatchMail(oauth);

    // revoke tokens
    loggerUtils.debug('revoking tokens...');
    await googleUtils.revokeToken(integration.gmail.refreshToken);
  } catch (error) {
    loggerUtils.error('google service error', error);
  }
  // delete integration
  loggerUtils.debug('cleaning from db...');
  await db.integration.delete({ where: { id: integration.id } });

  return serviceUtils.createSuccessResult('Integration removed', undefined);
}

export async function enableGmailIntegration(
  userId: string,
  integrationId: string
): Promise<ServiceResult> {
  const integration = await db.integration.findUnique({
    where: { id: integrationId, userId, type: IntegrationType.Gmail },
    include: { gmail: true },
  });

  if (!integration || !integration.gmail) {
    return serviceUtils.createErrorResult('Integration not found', ServiceErrorCode.NotFound);
  }

  const refreshToken = integration.gmail.refreshToken;
  const accessToken = integration.gmail.accessToken;

  await db.$transaction(async tx => {
    // set status to active
    await tx.integration.update({ where: { id: integration.id }, data: { enabled: true } });

    // register watch
    const oauth = googleUtils.createOauthClient();
    oauth.setCredentials({
      access_token: accessToken,
      refresh_token: refreshToken,
    });

    await googleUtils.watchMail(oauth);
  });
  return serviceUtils.createSuccessResult('Integration enabled', undefined);
}

export async function disableGmailIntegration(
  userId: string,
  integrationId: string
): Promise<ServiceResult> {
  const integration = await db.integration.findUnique({
    where: { id: integrationId, userId, type: IntegrationType.Gmail },
    include: { gmail: true },
  });

  if (!integration || !integration.gmail) {
    return serviceUtils.createErrorResult('Integration not found', ServiceErrorCode.NotFound);
  }

  const refreshToken = integration.gmail.refreshToken;
  const accessToken = integration.gmail.accessToken;

  await db.$transaction(async tx => {
    // set status to inactive
    await tx.integration.update({ where: { id: integration.id }, data: { enabled: false } });

    // remove watch
    const oauth = googleUtils.createOauthClient();
    oauth.setCredentials({
      access_token: accessToken,
      refresh_token: refreshToken,
    });

    await googleUtils.unWatchMail(oauth);
  });
  return serviceUtils.createSuccessResult('Integration disabled', undefined);
}

export async function getGmailIntegrations(
  userId: string
): Promise<ServiceResult<FetchedGmailIntegration[]>> {
  const res = await db.integration.findMany({
    where: { userId, type: IntegrationType.Gmail },
    include: { gmail: { omit: { accessToken: true, refreshToken: true } } },
  });

  return serviceUtils.createSuccessResult(
    'Integrations fetched',
    integrationValidation.fetchedGmailIntegration.array().parse(res)
  );
}

export async function syncGmailMessages(userId: string, integrationId: string) {
  const integration = await db.integration.findUnique({
    where: {
      id: integrationId,
      userId,
      type: IntegrationType.Gmail,
    },

    include: { gmail: true },
  });

  if (!integration || !integration.gmail) {
    return serviceUtils.createErrorResult('Integration not found', ServiceErrorCode.NotFound);
  }

  await syncGmailMessageQueue.add('sync-messages', {
    gmailIntegrationId: integration.gmail.id,
  });

  return serviceUtils.createSuccessResult('Gmail sync started', undefined);
}

export async function syncGmailMessagesJobHandler(data: GmailMessageSyncJobData) {
  const { gmailIntegrationId } = data;

  const gmailIntegration = await db.gmailIntegration.findUnique({
    where: { id: gmailIntegrationId },
  });

  if (!gmailIntegration) {
    loggerUtils.error('Gmail integration not found', { gmailIntegrationId });
    throw new Error('Gmail integration not found');
  }

  const oauth = googleUtils.createOauthClient();

  oauth.setCredentials({
    access_token: gmailIntegration.accessToken,
    refresh_token: gmailIntegration.refreshToken,
  });

  const gmail = google.gmail({ version: 'v1', auth: oauth });

  loggerUtils.debug('beginning syncing gmail messages...');

  let lastHistoryId = gmailIntegration.lastHistoryId;

  if (!lastHistoryId) {
    loggerUtils.warn('No last history ID found, syncing all messages...');
  }

  // on each call

  await gmail.users.messages.list({
    userId: 'me',
    labelIds: ['INBOX'],
    // ...(lastHistoryId ? {} : {}),
  });
}

export async function sendGmailMessage(
  userId: string,
  integrationId: string,
  payload: z.infer<typeof integrationValidation.sendMailMessageSchema>
): Promise<ServiceResult> {
  const integration = await db.integration.findUnique({
    where: {
      id: integrationId,
      userId,
      type: IntegrationType.Gmail,
    },

    include: { gmail: true },
  });
  if (!integration || !integration.gmail) {
    return serviceUtils.createErrorResult('Integration not found', ServiceErrorCode.NotFound);
  }

  return serviceUtils.createSuccessResult('Gmail message sent', undefined);
}

export async function fetchGmailMessages(
  userId: string,
  integrationId: string,
  query: z.infer<typeof integrationValidation.gmailQuery>
): Promise<ServiceResult<PaginatedT<z.infer<typeof integrationValidation.mailMessageSchema>>>> {
  const integration = await db.integration.findUnique({
    where: {
      id: integrationId,
      userId,
      type: IntegrationType.Gmail,
    },

    include: { gmail: true },
  });

  if (!integration || !integration.gmail) {
    return serviceUtils.createErrorResult('Integration not found', ServiceErrorCode.NotFound);
  }

  const { data, pagination } = await dbUtils.paginateV2(
    db.gmailMessage,
    {
      ...(<any>query),
      gmailIntegrationId: integration.gmail.id,
    },
    {
      omit: {
        body: true,
      },
    }
  );

  return serviceUtils.createSuccessResult('Gmail messages fetched', {
    data,
    pagination,
  });
}

export async function fetchGmailMessage(
  userId: string,
  integrationId: string,
  messageId: string
): Promise<ServiceResult<z.infer<typeof integrationValidation.fullMailMessageSchema>>> {
  const integration = await db.integration.findUnique({
    where: {
      id: integrationId,
      userId,
      type: IntegrationType.Gmail,
    },

    include: { gmail: true },
  });

  if (!integration || !integration.gmail) {
    return serviceUtils.createErrorResult('Integration not found', ServiceErrorCode.NotFound);
  }

  const message = await db.gmailMessage.findUnique({
    where: {
      id: messageId,
      gmailIntegrationId: integration.gmail.id,
    },
  });

  if (!message) {
    return serviceUtils.createErrorResult('Message not found', ServiceErrorCode.NotFound);
  }

  return serviceUtils.createSuccessResult(
    'Gmail message fetched',
    integrationValidation.fullMailMessageSchema.parse(message)
  );
}
