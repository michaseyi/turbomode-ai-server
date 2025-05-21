import { tool } from '@langchain/core/tools';
import { z } from 'zod';

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
    schema: z.object({}).describe('This tool takes no arguments.'),
  }
);
