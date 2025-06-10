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

    console.log(query);

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

    console.log(JSON.stringify(result.data, null, 2));

    return {
      success: true,
      message: 'User notes fetched',
      data: result.data,
    };
  },

  {
    name: 'search_user_notes',
    description: `\
Searches the authenticated user's notes using a flexible, Gmail-style query language.

This is your go to when  you need to get personal information about the user, they mostly have something in their notes for you to use.

You can use special commands and free text, for example:\n- is:pinned\n- is:archived\n- tag:work\n- after:2024-06-01 before:2024-06-10\n-  Any free text will search the note content using similarity search.\n\nCombine commands and text for powerful searches, e.g.:\n  is:pinned after:2024-06-01 meeting one the new projects\n\nReturns a paginated list of notes matching the query.`,
    schema: z.object({
      query: z
        .string()
        .describe(
          `The search query for notes.\n\nSupports Gmail-style syntax:\n- is:pinned, is:archived, is:favorite, after:YYYY-MM-DD, before:YYYY-MM-DD for date ranges\n- Any free text for content search\n- Combine commands and text for advanced queries. \n You can also negate commands, e.g is:archived vs -is:archived`
        ),
    }),
  }
);
