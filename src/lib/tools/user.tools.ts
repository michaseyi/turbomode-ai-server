import { tool } from '@langchain/core/tools';
import { ensureConfiguration } from '../assistant/configuration';
import { messages } from '@/config/constants';
import { z } from 'zod';

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
