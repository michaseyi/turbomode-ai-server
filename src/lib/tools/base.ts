import { loggerUtil } from '@/utils';
import { tool } from '@langchain/core/tools';
import { z } from 'zod';

export const search = tool(
  async ({ query }) => {
    if (query.toLowerCase().includes('sf') || query.toLowerCase().includes('san francisco')) {
      return "It's 70 degrees and foggy."; // Specific SF response
    }
    return "It's 90 degrees and sunny.";
  },
  {
    name: 'search',
    description: ``,
    schema: z.object({
      query: z
        .string()
        .describe(
          'A tool that performs a web search for a given query and returns relevant, concise results. Use this to retrieve up-to-date or external information that is not available in the current context.'
        ),
    }),
  }
);

export const setReminder = tool(
  async ({ time, message }) => {
    loggerUtil.info(`Setting reminder, ${time} ${message}`);
    return 'Reminder set!';
  },
  {
    name: 'set_reminder',
    description: `Schedules a reminder for the user for a specific future date and time. 
      Use this tool when the user explicitly asks to set a reminder, schedule an alert, or be notified about something later. 
      It requires the exact date and time in the future (in ISO 8601 format) and the message content for the reminder. 
      If the user specifies a relative time (e.g., 'in 2 hours', 'tomorrow at 10 am'), first use 'get_current_datetime' to determine the absolute ISO 8601 time, then call this tool.`,
    schema: z.object({
      time: z
        .string()
        .datetime()
        .describe(
          'The absolute future date and time for the reminder in ISO 8601 format (e.g., "2025-05-15T09:30:00.000Z"). Must be in the future.'
        ),
      message: z
        .string()
        .describe(
          'The content of the reminder message. This will be shown to the user when the reminder triggers. Include all necessary details the user needs to remember.'
        ),
    }),
  }
);

export const getCurrentDateTime = tool(
  async () => {
    const currentDateTime = new Date();
    return currentDateTime.toISOString();
  },
  {
    name: 'get_current_datetime',
    description: `Retrieves the current system date and time, formatted as an ISO 8601 string (e.g., "2025-05-01T11:12:29.000Z"). 
      Use this tool when:
      1. The user explicitly asks for the current date or time.
      2. You need the current time to calculate an absolute future time based on a user's relative request (e.g., 'remind me in 30 minutes', 'schedule for tomorrow morning'). This is often a necessary first step before using 'set_reminder' with relative times.`,
    schema: z.object({}).describe('This tool takes no arguments.'), // Added describe for clarity
  }
);
