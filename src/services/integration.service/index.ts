import { emailDataSourceTemplate } from '@/lib/assistant/prompts';
import { db, EmailProcessOption, IntegrationType } from '@/lib/db';
import { gmailMessageQueue, gmailPubSubQueue, invokeAgentQueue } from '@/queues';
import { ServiceResult } from '@/types';
import { GmailMessageJobData, GmailPushJobData } from '@/types/queue.type';
import { googleUtils, loggerUtils, serviceUtils } from '@/utils';
import { integrationValidation } from '@/validation';
import { Message } from '@google-cloud/pubsub';
import { google } from 'googleapis';
import { z } from 'zod';

export * from './gmail-integration.service';
export * from './gcalendar-integration.service';

export async function listIntegrations(
  userId: string
): Promise<ServiceResult<Array<z.infer<typeof integrationValidation.fetchedIntegrations>>>> {
  const res = await db.integration.findMany({
    where: { userId },
    include: {
      gmail: {
        select: {
          id: true,
          email: true,
          messageLabels: {
            select: {
              labelId: true,
              labelName: true,
            },
          },
        },
      },
      gCalendar: { select: { id: true, email: true } },
    },
  });

  return serviceUtils.createSuccessResult(
    'Integrations fetched',
    integrationValidation.fetchedIntegrations.array().parse(res)
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
