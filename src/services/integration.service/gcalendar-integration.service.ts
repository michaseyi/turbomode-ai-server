import { db, IntegrationType } from '@/lib/db';
import { ServiceErrorCode, ServiceResult } from '@/types';
import { AddGoogleIntegrationPayload } from '@/types/integration.type';
import { googleUtils, loggerUtils, serviceUtils } from '@/utils';
import { integrationValidation } from '@/validation';
import { google } from 'googleapis';
import moment from 'moment';
import { z } from 'zod';

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

export async function fetchCalendarEvents(
  userId: string,
  integrationId: string,
  data: z.infer<typeof integrationValidation.fetchCalendarEventQuery>
): Promise<ServiceResult<Array<z.infer<typeof integrationValidation.fetchedCalendarEvent>>>> {
  const { date: month } = data;
  const start = moment(month).startOf('month');
  const end = moment(month).endOf('month');

  const integration = await db.integration.findUnique({
    where: { userId, id: integrationId },
    include: {
      gCalendar: {
        include: {
          events: {
            where: {
              startTime: {
                gte: start.toDate(),
                lte: end.toDate(),
              },
            },
          },
        },
      },
    },
  });

  const events = integration?.gCalendar?.events;

  if (!events) {
    return serviceUtils.createErrorResult('Integration not found', ServiceErrorCode.Bad);
  }

  const tranformedEvents = [...events];

  return serviceUtils.createSuccessResult(
    'Events fetched',
    integrationValidation.fetchedCalendarEvent.array().parse(tranformedEvents)
  );
}

export async function syncGoogleCalendarEventsForMonth(
  userId: string,
  integrationId: string,
  data: z.infer<typeof integrationValidation.fetchCalendarEventQuery>
): Promise<ServiceResult> {
  const integration = await db.integration.findUnique({
    where: { id: integrationId, userId, type: IntegrationType.Gcalendar },
    include: { gCalendar: true },
  });

  if (!integration?.gCalendar) {
    return serviceUtils.createErrorResult('Integration not found', ServiceErrorCode.Bad);
  }

  const oauth2Client = googleUtils.createOauthClient();

  const { accessToken, refreshToken } = integration.gCalendar;

  oauth2Client.setCredentials({ access_token: accessToken, refresh_token: refreshToken });

  const calendar = google.calendar({ version: 'v3', auth: oauth2Client });

  const { date: month } = data;

  const startOfMonth = moment(month).startOf('month');
  const endOfMonth = moment(month).endOf('month');

  const res = await calendar.events.list({
    calendarId: 'primary',
    timeMin: startOfMonth.toISOString(),
    timeMax: endOfMonth.toISOString(),
    singleEvents: true,
    orderBy: 'startTime',
    maxResults: 100,
  });

  const events = res.data.items || [];

  for (const event of events) {
    if (!event.id || !event.start?.dateTime || !event.end?.dateTime) continue;

    await db.calendarEvent.upsert({
      where: { eventId: event.id },
      update: {
        summary: event.summary ?? '',
        description: event.description ?? '',
        startTime: new Date(event.start.dateTime),
        endTime: new Date(event.end.dateTime),
        location: event.location ?? '',
        htmlLink: event.htmlLink ?? '',
        status: event.status ?? '',
      },
      create: {
        gCalendarIntegrationId: integration.gCalendar.id,
        eventId: event.id,
        summary: event.summary ?? '',
        description: event.description ?? '',
        startTime: new Date(event.start.dateTime),
        endTime: new Date(event.end.dateTime),
        location: event.location ?? '',
        htmlLink: event.htmlLink ?? '',
        status: event.status ?? '',
      },
    });
  }

  return serviceUtils.createSuccessResult('Calendar synced', undefined);
}
