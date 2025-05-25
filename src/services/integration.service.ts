import { emailDataSourceTemplate } from '@/lib/assistant/prompts';
import { db, EmailProcessOption, IntegrationType } from '@/lib/db';
import { gmailMessageQueue, gmailPubSubQueue, invokeAgentQueue } from '@/queues';
import { ServiceErrorCode, ServiceResult } from '@/types';
import {
  AddGoogleIntegrationPayload,
  FetchedGmailIntegration,
  ModifyGmailIntegrationPayload,
} from '@/types/integration.type';
import { GmailMessageJobData, GmailPushJobData } from '@/types/queue.type';
import { googleUtils, loggerUtils, serviceUtils } from '@/utils';
import { integrationValidation } from '@/validation';
import { Message } from '@google-cloud/pubsub';
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

export async function listIntegrations(
  userId: string
): Promise<ServiceResult<Array<z.infer<typeof integrationValidation.fetchedIntegrations>>>> {
  const res = await db.integration.findMany({
    where: { userId },
    include: {
      gmail: { select: { id: true, email: true } },
      gCalendar: { select: { id: true, email: true } },
    },
  });

  return serviceUtils.createSuccessResult(
    'Integrations fetched',
    integrationValidation.fetchedIntegrations.array().parse(res)
  );
}

export async function getGoogleCalendarIntegrations(
  userId: string
): Promise<
  ServiceResult<z.infer<typeof integrationValidation.fetchedGoogleCalendarIntegration>[]>
> {
  const res = await db.integration.findMany({
    where: { userId, type: IntegrationType.Gcalendar },
    include: { gCalendar: { omit: { accessToken: true, refreshToken: true } } },
  });

  return serviceUtils.createSuccessResult(
    'Integrations fetched',
    integrationValidation.fetchedGoogleCalendarIntegration.array().parse(res)
  );
}

export async function onGmailHistory(message: Message): Promise<ServiceResult> {
  let data;

  loggerUtils.info('incoming pubsub message');
  try {
    data = integrationValidation.gmailPush.parse(JSON.parse(message.data.toString()));
    await gmailPubSubQueue.add('gmail-pubsub', data);
    loggerUtils.info(`${data.historyId} from ${data.emailAddress}`);
    return serviceUtils.createSuccessResult('Gmail pubsub pushed to queue', undefined);
  } catch (error) {
    loggerUtils.info('pubsub received invalid message', { message: message.data.toString() });
    message.ack();
    return serviceUtils.createSuccessResult('Gmail pubsub processed', undefined);
  }
}

export async function processGmailHistory(data: GmailPushJobData): Promise<ServiceResult> {
  const { historyId, emailAddress } = data;
  const integration = await db.gmailIntegration.findUnique({ where: { email: emailAddress } });

  if (!integration) {
    return serviceUtils.createSuccessResult('Gmail pubsub processed', undefined);
  }

  const oauth = googleUtils.createOauthClient();

  oauth.setCredentials({
    access_token: integration.accessToken,
    refresh_token: integration.refreshToken,
  });

  const gmail = google.gmail({ version: 'v1', auth: oauth });

  const response = await gmail.users.history.list({
    userId: 'me',
    startHistoryId: historyId,
    historyTypes: ['messageAdded'],
  });

  const history = response.data.history || [];
  const messageIds = history.flatMap(record => (record.messages || []).map(({ id }) => id!));

  if (messageIds.length) {
    loggerUtils.debug('queueing some messages', messageIds);
  }

  await gmailMessageQueue.addBulk(
    messageIds.map(id => ({
      name: 'process-message',
      data: {
        messageId: id,
        integrationId: integration.integrationId,
        email: emailAddress,
      },
      opts: {
        jobId: `${emailAddress}:${id}`,
        removeOnComplete: {
          age: 60 * 10, // 10 minutes
        },
        removeOnFail: {
          age: 60 * 10, // 10 minutes
        },
      },
    }))
  );

  loggerUtils.info('finished processing pubsub message');

  return serviceUtils.createSuccessResult('Gmail pubsub processed', undefined);
}

export async function processGmailMessage(data: GmailMessageJobData): Promise<ServiceResult> {
  loggerUtils.info('processing gmail action request');

  const integration = await db.integration.findUnique({
    where: { id: data.integrationId, type: IntegrationType.Gmail },
    include: {
      user: true,
      gmail: true,
    },
  });

  if (!integration || !integration.gmail) {
    return serviceUtils.createSuccessResult('Invalid message', undefined);
  }

  // get full message
  const oauth = googleUtils.createOauthClient();

  oauth.setCredentials({
    access_token: integration.gmail.accessToken,
    refresh_token: integration.gmail.refreshToken,
  });

  const gmail = google.gmail({ version: 'v1', auth: oauth });

  const message = await gmail.users.messages.get({
    userId: 'me',
    id: data.messageId,
    format: 'full',
  });

  const parsedMessage = googleUtils.parseGmailMessage(message.data);

  console.log(parsedMessage);

  // if there are not instructions skip processing email? because of ambiguity?
  if (!integration.gmail.instruction.length) {
    loggerUtils.debug('skipping email - no instructions');
    return serviceUtils.createSuccessResult('Skipped email message', undefined);
  }

  if (integration.gmail.emailProcessOption !== EmailProcessOption.All && parsedMessage.from) {
    // check if the email should be processed
    const valueSpec = integration.gmail.specificAddresses;
    const from = parsedMessage.from;

    if (valueSpec) {
      const regex = new RegExp(valueSpec, 'i');
      const matches = regex.test(from);

      if (
        (integration.gmail.emailProcessOption === EmailProcessOption.FromSpecific && !matches) ||
        (integration.gmail.emailProcessOption === EmailProcessOption.ExceptSpecific && matches)
      ) {
        loggerUtils.debug('skipping email', { from, valueSpec, matches });

        return serviceUtils.createSuccessResult('Skipping email message', undefined);
      }
    }
  }

  const template = await emailDataSourceTemplate.invoke({
    userInstruction: integration.gmail.instruction || '',
    mail: JSON.stringify(parsedMessage),
  });

  // invoke agent
  invokeAgentQueue.add('invoke-assistant', {
    userId: integration.user.id,
    prompt: template.messages[0], // build prompt from mail message, and user specific instructions
    context: {
      gmail: {
        messageId: data.messageId,
      },
    },
  });

  loggerUtils.info('done processing gmail action request');
  return serviceUtils.createSuccessResult('Agent triggered', undefined);
}

export async function addGoogleCalendarIntegration(
  userId: string,
  { code }: AddGoogleIntegrationPayload
): Promise<ServiceResult> {
  const user = await db.user.findUnique({ where: { id: userId } });

  if (!user) {
    return serviceUtils.createErrorResult('User does not exist', ServiceErrorCode.Bad);
  }

  if (await db.integration.count({ where: { type: IntegrationType.Gcalendar, userId } })) {
    return serviceUtils.createErrorResult(
      'Google calendar already integreated',
      ServiceErrorCode.Bad
    );
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
    return serviceUtils.createErrorResult('Email not included in scope', ServiceErrorCode.Bad);
  }

  const refreshToken = tokens.refresh_token;
  const accessToken = tokens.access_token;

  return await db.$transaction(async tx => {
    const integration = await tx.integration.create({
      data: {
        type: IntegrationType.Gcalendar,
        enabled: true,
        userId: user.id,
      },
    });

    await tx.googleCalendarIntegration.create({
      data: {
        email,
        refreshToken,
        accessToken,
        integrationId: integration.id,
      },
    });

    return serviceUtils.createSuccessResult('Google calendar added', undefined);
  });
}

export async function disableGoogleCalendarIntegration(
  userId: string,
  integrationId: string
): Promise<ServiceResult> {
  const integration = await db.integration.findUnique({
    where: { id: integrationId, userId, type: IntegrationType.Gcalendar },
    include: { gCalendar: true },
  });

  if (!integration || !integration.gCalendar) {
    return serviceUtils.createErrorResult('Integration not found', ServiceErrorCode.NotFound);
  }

  await db.integration.update({ where: { id: integration.id }, data: { enabled: false } });
  return serviceUtils.createSuccessResult('Integration disabled', undefined);
}

export async function enableGoogleCalendarIntegration(
  userId: string,
  integrationId: string
): Promise<ServiceResult> {
  const integration = await db.integration.findUnique({
    where: { id: integrationId, userId, type: IntegrationType.Gcalendar },
    include: { gCalendar: true },
  });

  if (!integration || !integration.gCalendar) {
    return serviceUtils.createErrorResult('Integration not found', ServiceErrorCode.NotFound);
  }

  await db.integration.update({ where: { id: integration.id }, data: { enabled: true } });
  return serviceUtils.createSuccessResult('Integration enabled', undefined);
}

export async function deleteGoogleCalendarIntegration(
  userId: string,
  integrationId: string
): Promise<ServiceResult> {
  const integration = await db.integration.findUnique({
    where: { id: integrationId, userId, type: IntegrationType.Gcalendar },
    include: { gCalendar: true },
  });

  if (!integration || !integration.gCalendar) {
    return serviceUtils.createErrorResult('Integration not found', ServiceErrorCode.NotFound);
  }

  const oauth = googleUtils.createOauthClient();
  loggerUtils.debug('setting tokens...');

  oauth.setCredentials({
    access_token: integration.gCalendar.accessToken,
    refresh_token: integration.gCalendar.refreshToken,
  });

  try {
    // revoke tokens
    loggerUtils.debug('revoking tokens...');
    await googleUtils.revokeToken(integration.gCalendar.refreshToken);
  } catch (error) {
    loggerUtils.error('google service error', error);
  }
  loggerUtils.debug('cleaning from db...');
  await db.integration.delete({ where: { id: integration.id } });

  return serviceUtils.createSuccessResult('Integration removed', undefined);
}
