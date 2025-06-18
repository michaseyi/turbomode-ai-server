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
import { Auth, gmail_v1, google } from 'googleapis';
import _ from 'lodash';
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

  const oauth = googleUtils.createOauthClient();
  oauth.setCredentials({
    access_token: integration.gmail.accessToken,
    refresh_token: integration.gmail.refreshToken,
  });

  const gmail = google.gmail({ version: 'v1', auth: oauth });

  let raw;

  const options: {
    threadId?: string;
  } = {};

  if ('messageId' in payload) {
    const messageId = payload.messageId;
    const message = await db.gmailMessage.findUnique({
      where: {
        gmailIntegrationId: integration.gmail.id,
        id: messageId,
      },
    });

    if (!message) {
      return serviceUtils.createErrorResult(
        'Reference message not found',
        ServiceErrorCode.NotFound
      );
    }

    options.threadId = message.threadId!;

    raw = googleUtils.createRawEmail({
      to: message.to[0],
      body: payload.body,
      from: integration.gmail.email,
      subject: '',
    });
  } else {
    raw = googleUtils.createRawEmail({
      to: payload.to[0],
      body: payload.body,
      from: integration.gmail.email,
      subject: payload.subject,
    });
  }

  try {
    await gmail.users.messages.send({
      userId: 'me',
      requestBody: {
        ...options,
        raw,
      },
    });

    return serviceUtils.createSuccessResult('Gmail message sent', undefined);
  } catch (error) {
    loggerUtils.error('Error sending Gmail message', { error });
    throw new Error('Unexpected error sending gmail message');
  }
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

  const labelId = query.labelId;

  const queryWithoutLabelId = _.omit(query, ['labelId']);

  const { data, pagination } = await dbUtils.paginateV2(
    db.gmailMessage,
    {
      ...(<any>queryWithoutLabelId),
      gmailIntegrationId: integration.gmail.id,

      labelIds: labelId
        ? {
            hasSome: [labelId],
          }
        : undefined,
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

  // fetch labels

  const labelsResponse = await gmail.users.labels.list({
    userId: 'me',
  });

  if (labelsResponse.status !== 200) {
    loggerUtils.error('Failed to fetch Gmail labels', {
      gmailIntegrationId,
      status: labelsResponse.status,
    });
    throw new Error('Failed to fetch Gmail labels');
  }

  const labels = labelsResponse.data.labels || [];

  for (const label of labels) {
    await db.gmailMessageLabel.upsert({
      where: {
        gmailIntegrationId,
        id: label.id!,
      },
      update: {
        labelName: label.name!,
      },
      create: {
        gmailIntegrationId,
        labelId: label.id!,
        labelName: label.name!,
      },
    });
  }

  loggerUtils.debug('Beginning Gmail messages sync...', { gmailIntegrationId });

  try {
    let lastHistoryId = gmailIntegration.lastHistoryId;

    if (!lastHistoryId) {
      loggerUtils.info('No history ID found, performing initial full sync');
      await performFullSync(gmail, gmailIntegrationId);
    } else {
      loggerUtils.info('Performing incremental sync', { lastHistoryId });
      await performIncrementalSync(gmail, gmailIntegrationId, lastHistoryId);
    }

    loggerUtils.info('Gmail sync completed successfully', { gmailIntegrationId });
  } catch (error) {
    loggerUtils.error('Gmail sync failed', { gmailIntegrationId, error });
    throw error;
  }
}

async function performFullSync(gmail: gmail_v1.Gmail, gmailIntegrationId: string) {
  let pageToken: string | undefined | null;
  let messageCount = 0;
  let currentHistoryId: string | null | undefined;

  do {
    const response = await gmail.users.messages.list({
      userId: 'me',
      labelIds: ['INBOX'],
      maxResults: 100,
      pageToken: pageToken!,
    });

    if (
      !currentHistoryId &&
      response.data.resultSizeEstimate &&
      response.data.resultSizeEstimate > 0
    ) {
      currentHistoryId = response.data.messages?.[0]?.historyId;
    }

    if (response.data.messages && response.data.messages.length > 0) {
      await processMessages(gmail, response.data.messages, gmailIntegrationId);
      messageCount += response.data.messages.length;
    }

    pageToken = response.data.nextPageToken;

    loggerUtils.debug(`Processed ${messageCount} messages so far`);
  } while (pageToken);

  if (currentHistoryId) {
    await db.gmailIntegration.update({
      where: { id: gmailIntegrationId },
      data: {
        lastHistoryId: currentHistoryId,
        lastSyncAt: new Date(),
      },
    });
  }

  loggerUtils.info(`Full sync completed: ${messageCount} messages processed`);
}

async function performIncrementalSync(
  gmail: gmail_v1.Gmail,
  gmailIntegrationId: string,
  startHistoryId: string
) {
  try {
    const profile = await gmail.users.getProfile({ userId: 'me' });
    const currentHistoryId = profile.data.historyId;

    if (startHistoryId === currentHistoryId) {
      loggerUtils.info('No changes detected, sync up to date');
      return;
    }

    loggerUtils.info(`Syncing changes from ${startHistoryId} to ${currentHistoryId}`);

    let pageToken: string | undefined | null;
    let changesProcessed = 0;

    do {
      const historyResponse = await gmail.users.history.list({
        userId: 'me',
        startHistoryId: startHistoryId,
        labelId: 'INBOX',
        historyTypes: ['messageAdded', 'messageDeleted', 'labelAdded', 'labelRemoved'],
        maxResults: 100,
        pageToken: pageToken!,
      });

      if (historyResponse.data.history) {
        for (const historyRecord of historyResponse.data.history) {
          await processHistoryRecord(gmail, historyRecord, gmailIntegrationId);
          changesProcessed++;
        }
      }

      pageToken = historyResponse.data.nextPageToken;
    } while (pageToken);

    await db.gmailIntegration.update({
      where: { id: gmailIntegrationId },
      data: {
        lastHistoryId: currentHistoryId,
        lastSyncAt: new Date(),
      },
    });

    loggerUtils.info(`Incremental sync completed: ${changesProcessed} changes processed`);
  } catch (error: any) {
    if (error.code === 404) {
      loggerUtils.warn('History not found, falling back to full sync');
      await performFullSync(gmail, gmailIntegrationId);
    } else {
      throw error;
    }
  }
}

async function processHistoryRecord(
  gmail: gmail_v1.Gmail,
  historyRecord: gmail_v1.Schema$History,
  gmailIntegrationId: string
) {
  if (historyRecord.messagesAdded) {
    const messages = historyRecord.messagesAdded.map(item => item.message);
    await processMessages(gmail, messages, gmailIntegrationId);
  }

  if (historyRecord.messagesDeleted) {
    for (const deletedItem of historyRecord.messagesDeleted) {
      if (deletedItem.message?.id) {
        await deleteMessage(deletedItem.message.id, gmailIntegrationId);
      }
    }
  }

  if (historyRecord.labelsAdded) {
    for (const labelItem of historyRecord.labelsAdded) {
      if (labelItem.labelIds?.includes('INBOX')) {
        await processMessages(gmail, [labelItem.message], gmailIntegrationId);
      }
    }
  }

  if (historyRecord.labelsRemoved) {
    for (const labelItem of historyRecord.labelsRemoved) {
      if (labelItem.labelIds?.includes('INBOX')) {
        if (labelItem.message?.id) {
          await deleteMessage(labelItem.message.id, gmailIntegrationId);
        }
      }
    }
  }
}

async function processMessages(
  gmail: gmail_v1.Gmail,
  messages: (gmail_v1.Schema$Message | undefined)[],
  gmailIntegrationId: string
) {
  const batchSize = 10;

  for (let i = 0; i < messages.length; i += batchSize) {
    const batch = messages.slice(i, i + batchSize);

    await Promise.all(
      batch.map(async message => {
        if (!message || !message.id) {
          loggerUtils.warn('Skipping invalid message', { message });
          return;
        }

        try {
          const fullMessage = await gmail.users.messages.get({
            userId: 'me',
            id: message.id,
            format: 'full',
          });

          await saveOrUpdateMessage(fullMessage.data, gmailIntegrationId);
        } catch (error) {
          loggerUtils.error(`Failed to process message ${message.id}`, {
            error,
            messageId: message.id,
          });
        }
      })
    );

    if (i + batchSize < messages.length) {
      await new Promise(resolve => setTimeout(resolve, 100));
    }
  }
}

async function saveOrUpdateMessage(
  messageData: gmail_v1.Schema$Message,
  gmailIntegrationId: string
) {
  const parsedMessage = googleUtils.parseGmailMessage(messageData);

  const { from, subject, to, body } = parsedMessage;

  // const receivedAt = date ? new Date(date) : new Date();

  await db.gmailMessage.upsert({
    where: {
      messageId: messageData.id!,
    },
    create: {
      messageId: messageData.id!,
      gmailIntegrationId: gmailIntegrationId,
      threadId: messageData.threadId,
      subject: subject,
      from: from,
      to: to ? [to] : [],
      body: body,
      labelIds: messageData.labelIds || [],
      // historyId: messageData.historyId,
      internalDate: new Date(parseInt(messageData.internalDate!)),
      snippet: messageData.snippet || '',
    },
    update: {
      labelIds: messageData.labelIds || [],
      // historyId: messageData.historyId,
    },
  });
}

async function deleteMessage(messageId: string, gmailIntegrationId: string) {
  await db.gmailMessage.deleteMany({
    where: {
      messageId,
      gmailIntegrationId: gmailIntegrationId,
    },
  });

  loggerUtils.debug(`Deleted message ${messageId}`);
}

export async function refreshTokenIfNeeded(oauth: Auth.OAuth2Client, gmailIntegrationId: string) {
  try {
    const { credentials } = await oauth.refreshAccessToken();

    if (credentials.access_token) {
      await db.gmailIntegration.update({
        where: { id: gmailIntegrationId },
        data: {
          accessToken: credentials.access_token,
          ...(credentials.refresh_token && { refreshToken: credentials.refresh_token }),
        },
      });

      oauth.setCredentials(credentials);
    }
  } catch (error: any) {
    loggerUtils.error('Failed to refresh token', { gmailIntegrationId, error });
    throw new Error('Authentication failed - token refresh required');
  }
}
