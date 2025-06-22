import { messages } from '@/config/constants';
import { googleUtils, loggerUtils } from '@/utils';
import { tool } from '@langchain/core/tools';
import { IntegrationType } from '@prisma/client';
import { google } from 'googleapis';
import assert from 'node:assert';
import { z } from 'zod';
import { ensureConfiguration } from '../assistant/configuration';
import { htmlToText } from 'html-to-text';

// export const addCalenderEvent = tool(
//   async ({ description, startTime, endTime, summary, attendees }, config) => {
//     const user = ensureConfiguration(config).user;
//     const gCalendarIntegration = user.integrations.find(
//       ({ type }) => type === IntegrationType.Gcalendar
//     )?.gCalendar;

//     if (!gCalendarIntegration) {
//       return {
//         success: false,
//         message: messages.tools.NOT_CONFIGURED,
//       };
//     }

//     const { accessToken, refreshToken } = gCalendarIntegration;

//     assert(accessToken, 'gCalendar integration must include accessToken');
//     assert(refreshToken, 'gCalendar integration must include refreshToken');

//     const oauthClient = googleUtils.createOauthClient();

//     oauthClient.setCredentials({
//       access_token: accessToken,
//       refresh_token: refreshToken,
//     });

//     const calendar = google.calendar({ version: 'v3', auth: oauthClient });

//     try {
//       const response = await calendar.events.insert({
//         calendarId: 'primary',
//         requestBody: {
//           summary,
//           description: `Created by your assistant. \n\n${description}`,
//           start: { dateTime: startTime },
//           end: { dateTime: endTime },
//           attendees: [
//             {
//               email: gCalendarIntegration.email,
//               displayName: user.firstName + ' ' + user.lastName,
//             },
//             ...attendees.filter(attendee => attendee.email !== gCalendarIntegration.email),
//           ],
//           extendedProperties: {
//             private: {
//               createdBy: 'agent',
//               agentVersion: '1.0.0',
//             },
//           },
//         },
//       });

//       loggerUtils.info(`Google calendar event added`);

//       return {
//         success: true,
//         message: 'Event created successfully',
//         data: {
//           eventLink: response.data.htmlLink,
//         },
//       };
//     } catch (error) {
//       console.error(error);
//       return {
//         success: false,
//         message: `Failed to create event - ${typeof error === 'object' && error && 'message' in error ? error.message : 'Unknown error'}`,
//       };
//     }
//   },
//   {
//     name: 'set_reminder',
//     description: `
//       Creates a calendar event for the user at a specified date and time using Google Calendar.
//       This tool should be used when the user wants to set a reminder, book a future event, or schedule a task.
//       It requires an exact future start and end time in ISO 8601 format (e.g., '2025-05-15T09:30:00.000Z').
//       If the user provides a relative time (e.g., "in 2 hours", "next Monday"), first convert it to an absolute timestamp using 'get_current_datetime'.
//       The reminder message should clearly describe what the user wants to be reminded of.
//     `,
//     schema: z.object({
//       attendees: z
//         .array(
//           z
//             .object({
//               email: z.string().email().describe('Email address of the attendee.'),
//               displayName: z
//                 .string()
//                 .optional()
//                 .describe(
//                   'Display name of the attendee. This field is optional but recommended if you can get the name.'
//                 ),
//             })
//             .describe('Attendee object with email and optional display name')
//         )
//         .describe(
//           'List of attendees objects to invite to the event. Each attendee must have a valid email and display name (optional).'
//         ),

//       startTime: z
//         .string()
//         .datetime()
//         .describe(
//           'The exact starting date and time of the event in ISO 8601 format with timezone information (e.g., "2025-05-15T09:30:00.000Z"). Must be in the future.'
//         ),
//       endTime: z
//         .string()
//         .datetime()
//         .describe(
//           'The exact ending date and time of the event in ISO 8601 format with timezone information (e.g., "2025-05-15T09:30:00.000Z"). Must be later than startTime.'
//         ),
//       summary: z
//         .string()
//         .describe(
//           'A short title or subject for the event (e.g., "Doctor Appointment", "Team Meeting"). This is what appears as the main label in the calendar. This information will be visible in the calendar event details to all attendees.'
//         ),
//       description: z
//         .string()
//         .describe(
//           'A detailed description of the event or reminder. Include all necessary context or instructions the user may need when the event occurs. This information will be visible in the calendar event details to all attendees.'
//         ),
//     }),
//   }
// );

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

export const searchGmailMessages = tool(
  async ({ query }, config) => {
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
      const res = await gmail.users.messages.list({
        userId: 'me',
        q: query,
        maxResults: 20,
      });

      const messages = await Promise.all(
        (res.data.messages || []).map(async msg => {
          const full = await gmail.users.messages.get({
            userId: 'me',
            id: msg.id!,
            format: 'metadata',
            metadataHeaders: ['From', 'Subject', 'Date'],
          });

          const headers = Object.fromEntries(
            (full.data.payload?.headers || []).map(h => [h.name, h.value])
          );

          return {
            messageId: msg.id,
            threadId: msg.threadId,
            from: headers['From'] || '',
            subject: headers['Subject'] || '',
            date: headers['Date'] || '',
            snippet: full.data.snippet || '',
          };
        })
      );

      return {
        success: true,
        message: `Found ${messages.length} messages matching the query.`,
        data: messages,
      };
    } catch (error) {
      return {
        success: false,
        message: `Failed to search messages - ${typeof error === 'object' && error && 'message' in error ? error.message : 'Unknown error'}`,
      };
    }
  },
  {
    name: 'search_gmail_messages',
    description: 'Search Gmail messages and return basic metadata (no body).',
    schema: z.object({
      query: z.string().describe(
        `Gmail search query string using Gmail's advanced search syntax and normal text search.
You can search for keywords in email subject, body, and sender fields.
Examples:
- "is:unread" to find unread emails
- "from:example@gmail.com" to filter by sender
- "subject:invoice" to filter by subject containing 'invoice'
- "has:attachment" to find emails with attachments
- "after:2023/01/01 before:2023/12/31" to search within date range
- "meeting notes" to search for emails containing these words anywhere

You can combine multiple terms with spaces, e.g. "is:unread from:boss@example.com meeting notes"`
      ),
    }),
  }
);

export const getGmailMessageDetails = tool(
  async ({ messageId }, config) => {
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
      const full = await gmail.users.messages.get({
        userId: 'me',
        id: messageId,
        format: 'full',
      });

      const parsed = googleUtils.parseGmailMessage(full.data);

      const cleanText = htmlToText(parsed.body, {
        wordwrap: 130,
        selectors: [
          { selector: 'a', options: { ignoreHref: false } },
          { selector: 'img', format: 'skip' },
          { selector: 'table', options: { uppercaseHeaderCells: false } },
        ],
      });

      return {
        success: true,
        message: 'Fetched full message details.',
        data: { ...parsed, body: cleanText },
      };
    } catch (error) {
      return {
        success: false,
        message: `Failed to fetch full message - ${typeof error === 'object' && error && 'message' in error ? error.message : 'Unknown error'}`,
      };
    }
  },
  {
    name: 'get_gmail_message_details',
    description: 'Get full Gmail message including metadata and body.',
    schema: z.object({
      messageId: z.string().describe('Gmail message ID'),
    }),
  }
);

export const searchCalendarEvents = tool(
  async ({ query, timeMin, timeMax }, config) => {
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
      const res = await calendar.events.list({
        calendarId: 'primary',
        q: query,
        timeMin: timeMin || new Date().toISOString(),
        timeMax,
        singleEvents: true,
        orderBy: 'startTime',
        maxResults: 10,
      });

      const events = (res.data.items || []).map(event => ({
        id: event.id,
        summary: event.summary,
        description: event.description,
        start: event.start?.dateTime || event.start?.date,
        end: event.end?.dateTime || event.end?.date,
        link: event.htmlLink,
      }));

      return {
        success: true,
        message: `Found ${events.length} event(s) matching the query.`,
        data: events,
      };
    } catch (error) {
      return {
        success: false,
        message: `Failed to search events - ${
          typeof error === 'object' && error && 'message' in error ? error.message : 'Unknown error'
        }`,
      };
    }
  },
  {
    name: 'search_calendar_events',
    description: `
      Searches for upcoming or past calendar events based on keywords and optional date range.
      This tool should be used when the user wants to check scheduled events, see if something is already booked, or view reminders.
      It searches in the event's title, description, and location using free text.
    `,
    schema: z.object({
      query: z.string().describe(
        `Free text to search for within calendar event titles, descriptions, or locations.
Examples:
- "doctor"
- "meeting with Alex"
- "gym session"`
      ),
      timeMin: z
        .string()
        .datetime()
        .optional()
        .describe(
          `The start of the time range to search within (ISO 8601 format).
If not provided, defaults to the current time. Example: "2025-05-25T00:00:00.000Z"`
        ),
      timeMax: z
        .string()
        .datetime()
        .optional()
        .describe(
          `The end of the time range to search within (ISO 8601 format).
Optional — omit to include all future events. Example: "2025-06-01T00:00:00.000Z"`
        ),
    }),
  }
);

// export const sendGmailMessage = tool(
//   async ({ to, body, subject, threadId }, config) => {
//     const _ = ensureConfiguration(config);

//     const gmailIntegration = _.user.integrations.find(({ type }) => type === IntegrationType.Gmail);

//     if (!gmailIntegration || !gmailIntegration.gmail) {
//       return {
//         success: false,
//         message: messages.tools.NOT_CONFIGURED,
//       };
//     }

//     const oauthClient = googleUtils.createOauthClient();

//     const { accessToken, refreshToken } = gmailIntegration.gmail;

//     assert(accessToken, 'gmail integration must include accessToken');
//     assert(refreshToken, 'gmail integration must include refreshToken');

//     oauthClient.setCredentials({ access_token: accessToken, refresh_token: refreshToken });

//     const gmail = google.gmail({ version: 'v1', auth: oauthClient });

//     try {
//       const res = await gmail.users.messages.send({
//         userId: 'me',
//         requestBody: {
//           threadId,
//           raw: googleUtils.createRawEmail({
//             to,
//             from: gmailIntegration.gmail.email,
//             body,
//             subject,
//           }),
//         },
//       });

//       loggerUtils.info(`Email sent to ${to} with subject "${subject}"`);

//       return {
//         success: true,
//         message: `Email sent successfully to ${to}`,
//         data: { messageId: res.data.id },
//       };
//     } catch (error) {
//       return {
//         success: false,
//         message: `Failed to send email - ${
//           typeof error === 'object' && error && 'message' in error ? error.message : 'Unknown error'
//         }`,
//       };
//     }
//   },
//   {
//     name: 'send_gmail_message',
//     schema: z.object({
//       to: z.string().email().describe('Recipient email address'),
//       subject: z.string().describe('Email subject line'),
//       body: z.string().describe('Email body content in plain text or HTML format'),
//       threadId: z
//         .string()
//         .optional()
//         .describe('Optional thread ID to reply to an existing email, '),
//     }),

//     description: `
//       Sends an email using the user's Gmail account.
//       This tool should be used when the user wants to send an email to someone.
//       It requires the recipient's email address, subject, and body content.
//       The body can be plain text or HTML.

//       You can pass in the 'threadId' to reply to an existing email thread.
//       If 'threadId' is provided, the email will be sent as a reply to that thread.
//       If 'threadId' is not provided, a new email will be created.
//     `,
//   }
// );
