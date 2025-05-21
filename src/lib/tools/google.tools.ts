import { messages } from '@/config/constants';
import { googleUtils, loggerUtils } from '@/utils';
import { tool } from '@langchain/core/tools';
import { IntegrationType } from '@prisma/client';
import { google } from 'googleapis';
import assert from 'node:assert';
import { z } from 'zod';
import { ensureConfiguration } from '../assistant/configuration';

export const addCalenderEvent = tool(
  async ({ description, startTime, endTime, summary }, config) => {
    const gCalendarIntegration = ensureConfiguration(config).user.integrations.find(
      ({ type }) => type === IntegrationType.Gcalendar
    )?.gCalendar;

    if (!gCalendarIntegration) {
      return {
        success: false,
        message: messages.tools.NOT_CONFIGURED,
      };
    }

    const { accessToken, refreshToken } = gCalendarIntegration;

    assert(accessToken, 'gCalendar integration must include accessToken');
    assert(refreshToken, 'gCalendar integration must include refreshToken');

    const oauthClient = googleUtils.createOauthClient();

    oauthClient.setCredentials({
      access_token: accessToken,
      refresh_token: refreshToken,
    });

    const calendar = google.calendar({ version: 'v3', auth: oauthClient });

    try {
      const response = await calendar.events.insert({
        calendarId: 'primary',
        requestBody: {
          summary,
          description: `Created by your assistant. \n\n${description}`,
          start: { dateTime: startTime },
          end: { dateTime: endTime },
          extendedProperties: {
            private: {
              createdBy: 'agent',
              agentVersion: '1.0.0',
            },
          },
        },
      });

      loggerUtils.info(`Google calendar event added`);

      return {
        success: true,
        message: 'Event created successfully',
        data: {
          eventLink: response.data.htmlLink,
        },
      };
    } catch (error) {
      return {
        success: false,
        message: `Failed to create event - ${typeof error === 'object' && error && 'message' in error ? error.message : 'Unknown error'}`,
      };
    }
  },
  {
    name: 'set_reminder',
    description: `
      Creates a calendar event for the user at a specified date and time using Google Calendar.
      This tool should be used when the user wants to set a reminder, book a future event, or schedule a task.
      It requires an exact future start and end time in ISO 8601 format (e.g., '2025-05-15T09:30:00.000Z').
      If the user provides a relative time (e.g., "in 2 hours", "next Monday"), first convert it to an absolute timestamp using 'get_current_datetime'.
      The reminder message should clearly describe what the user wants to be reminded of.
    `,
    schema: z.object({
      startTime: z
        .string()
        .datetime()
        .describe(
          'The exact starting date and time of the event in ISO 8601 format (e.g., "2025-05-15T09:30:00.000Z"). Must be in the future.'
        ),
      endTime: z
        .string()
        .datetime()
        .describe(
          'The exact ending date and time of the event in ISO 8601 format. Must be later than startTime.'
        ),
      summary: z
        .string()
        .describe(
          'A short title or subject for the event (e.g., "Doctor Appointment", "Team Meeting"). This is what appears as the main label in the calendar.'
        ),
      description: z
        .string()
        .describe(
          'A detailed description of the event or reminder. Include all necessary context or instructions the user may need when the event occurs.'
        ),
    }),
  }
);

export const listGmailLabels = tool(
  async (_, config) => {
    const gmailIntegration = ensureConfiguration(config).user.integrations.find(
      ({ type }) => type === IntegrationType.Gmail
    )?.gmail;

    if (!gmailIntegration) {
      return {
        success: false,
        message: messages.tools.NOT_CONFIGURED,
      };
    }

    const { accessToken, refreshToken } = gmailIntegration;

    assert(accessToken, 'gmail integration must include accessToken');
    assert(refreshToken, 'gmail integration must include refreshToken');

    const oauthClient = googleUtils.createOauthClient();
    oauthClient.setCredentials({ access_token: accessToken, refresh_token: refreshToken });

    const gmail = google.gmail({ version: 'v1', auth: oauthClient });
    try {
      const res = await gmail.users.labels.list({ userId: 'me' });
      const labels = res.data.labels?.map(l => ({ id: l.id, name: l.name })) || [];

      return {
        success: true,
        message: 'Fetched labels successfully.',
        data: labels,
      };
    } catch (error) {
      return {
        success: false,
        message: `Failed to list labels - ${typeof error === 'object' && error && 'message' in error ? error.message : 'Unknown error'}`,
      };
    }
  },
  {
    name: 'list_gmail_labels',
    description: "Lists all existing Gmail labels configured in the user's account.",
    schema: z.object({}),
  }
);

export const createGmailLabel = tool(
  async ({ labelName }, config) => {
    const gmailIntegration = ensureConfiguration(config).user.integrations.find(
      ({ type }) => type === IntegrationType.Gmail
    )?.gmail;

    if (!gmailIntegration) {
      return {
        success: false,
        message: messages.tools.NOT_CONFIGURED,
      };
    }

    const { accessToken, refreshToken } = gmailIntegration;

    assert(accessToken, 'gmail integration must include accessToken');
    assert(refreshToken, 'gmail integration must include refreshToken');

    const oauthClient = googleUtils.createOauthClient();
    oauthClient.setCredentials({ access_token: accessToken, refresh_token: refreshToken });

    const gmail = google.gmail({ version: 'v1', auth: oauthClient });

    try {
      const res = await gmail.users.labels.create({
        userId: 'me',
        requestBody: {
          name: labelName,
          labelListVisibility: 'labelShow',
          messageListVisibility: 'show',
        },
      });

      return {
        success: true,
        message: `Label '${labelName}' created.`,
        data: { labelId: res.data.id },
      };
    } catch (error) {
      return {
        success: false,
        message: `Failed to create label - ${typeof error === 'object' && error && 'message' in error ? error.message : 'Unknown error'}`,
      };
    }
  },
  {
    name: 'create_gmail_label',
    description:
      'Creates a new Gmail label. Only call this after checking the label does not already exist.',
    schema: z.object({
      labelName: z.string().describe('The name of the label to create. Must not already exist.'),
    }),
  }
);

export const applyGmailLabel = tool(
  async ({ labelId }, config) => {
    const gmailIntegration = ensureConfiguration(config).user.integrations.find(
      ({ type }) => type === IntegrationType.Gmail
    )?.gmail;

    if (!gmailIntegration) {
      return {
        success: false,
        message: messages.tools.NOT_CONFIGURED,
      };
    }

    const messageId = config.configurable.context.gmail.messageId;

    if (!messageId) {
      return {
        success: false,
        message: messages.tools.INVALID_CONTEXT,
      };
    }

    const { accessToken, refreshToken } = gmailIntegration;
    const oauthClient = googleUtils.createOauthClient();

    assert(accessToken, 'gmail integration must include accessToken');
    assert(refreshToken, 'gmail integration must include refreshToken');

    oauthClient.setCredentials({ access_token: accessToken, refresh_token: refreshToken });

    const gmail = google.gmail({ version: 'v1', auth: oauthClient });

    try {
      await gmail.users.messages.modify({
        userId: 'me',
        id: messageId,
        requestBody: {
          addLabelIds: [labelId],
        },
      });

      return {
        success: true,
        message: `Label applied to message ${messageId}.`,
        data: { messageId, labelId },
      };
    } catch (error) {
      return {
        success: false,
        message: `Failed to apply label - ${typeof error === 'object' && error && 'message' in error ? error.message : 'Unknown error'}`,
      };
    }
  },
  {
    name: 'apply_gmail_label',
    description: 'Applies an existing label (by ID) to a Gmail message in the given context',
    schema: z.object({
      labelId: z.string().describe('The Gmail label ID to apply. Must already exist.'),
    }),
  }
);
