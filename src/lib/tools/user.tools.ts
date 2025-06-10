import { tool } from '@langchain/core/tools';
import { ensureConfiguration } from '../assistant/configuration';
import { messages } from '@/config/constants';
import { z } from 'zod';
import { noteService } from '@/services';
import { userValidation } from '@/validation';
import { formatNoteContent } from '@/services/note.service';

export const getUserProfile = tool(
  async (_, config) => {
    const c = ensureConfiguration(config);

    if (!c.user) {
      return {
        success: false,
        message: messages.tools.NOT_CONFIGURED,
      };
    }

    return {
      success: true,
      message: 'User profile fetched',
      data: {
        firstname: c.user.firstName,
        surname: c.user.lastName,
        email: c.user.email,
        profileImage: c.user.profileImage,
      },
    };
  },
  {
    name: 'get_user_profile',
    description: `
Fetches basic information about the authenticated user, including their first name, last name, email address, and profile image URL (if available).
This tool is useful when the agent needs to personalize responses, verify identity, or prefill user-related fields.
It does not require any input parameters.
`,
    schema: z.object({}),
  }
);

export const searchUserNotes = tool(
  async ({ query }, config) => {
    const c = ensureConfiguration(config);

    if (!c.user) {
      return {
        success: false,
        message: messages.tools.NOT_CONFIGURED,
      };
    }

    const result = await noteService.searchNotes(
      c.user.id,
      userValidation.searchNotesSchema.parse({
        limit: 3, // get just 3 similarity search results
        text: query,
      }),
      {
        includeContent: true,
      }
    );

    if (!result.ok) {
      return {
        success: false,
        message: result.message,
      };
    }

    result.data.data = result.data.data.map(note => ({
      ...note,
      content: formatNoteContent(note.content),
    }));

    return {
      success: true,
      message: 'User notes fetched',
      data: result.data,
    };
  },

  {
    name: 'search_user_notes',
    description: `\
PRIMARY CONTEXT ENRICHMENT TOOL - Always consider searching user notes first when you need personal context, preferences, or background information about the user.

This tool searches the authenticated user's personal notes using flexible, Gmail-style query syntax PLUS powerful similarity vector search. User notes often contain:
- Personal preferences, goals, and context about their life/work
- Project details, meeting notes, and ongoing initiatives  
- Past conversations, decisions, and important information
- Contact information, schedules, and reminders
- Ideas, plans, and personal knowledge base

WHEN TO USE THIS TOOL:
- Before making recommendations or suggestions - check for user preferences
- When user mentions projects, people, or events - search for related context
- For personalized responses - find relevant background information
- When user asks about something they "mentioned before" or references past context
- To understand user's current priorities, goals, or ongoing work

SEARCH CAPABILITIES:
- **Similarity Vector Search**: Free text uses semantic similarity matching - write natural phrases and questions as you would speak them
- Special commands: is:pinned, is:archived, is:favorite, tag:work, tag:personal
- Date filtering: after:2024-06-01, before:2024-12-31
- Negation support: -is:archived, -tag:work
- Combined queries: Mix commands with natural language phrases

HOW TO WRITE EFFECTIVE QUERIES:
- Use natural language phrases and questions
- Write complete thoughts, not keyword lists
- Ask specific questions about what you're looking for
- Include context and details in conversational form

GOOD EXAMPLES:
- "quarterly planning meeting with the marketing team" (not "quarterly planning meeting marketing team")
- "my morning routine and productivity habits" (not "morning routine productivity habits")
- "vacation plans for Italy trip" (not "vacation italy travel plans")
- "fitness goals and workout schedule" (not "fitness workout routine weight training")
- "is:pinned what are my career goals" (not "is:pinned career development goals")
- "tag:work how do we handle code reviews" (not "tag:work code review process")

BAD EXAMPLES (keyword stuffing):
- "meeting action items decisions quarterly business"
- "software development best practices code review process"
- "fitness workout routine weight training schedule gym"

Write queries as natural phrases or questions, not lists of keywords. The similarity search works best with conversational, human-like language.`,
    schema: z.object({
      query: z
        .string()
        .describe(
          `Search query using natural language phrases or questions combined with optional Gmail-style commands. Write as you would naturally speak or ask a question. Examples: "my morning productivity routine", "is:pinned what are my fitness goals", "tag:work meeting notes about the new project", "vacation planning for Europe trip". Avoid keyword lists - use complete, natural phrases instead.`
        ),
    }),
  }
);
