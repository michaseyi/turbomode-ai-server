import { RunnableConfig } from '@langchain/core/runnables';
import { Annotation } from '@langchain/langgraph';
import { User, Integration, GmailIntegration, GoogleCalendarIntegration } from '@prisma/client';

export const ConfigurationSchema = Annotation.Root({
  user: Annotation<
    User & {
      integrations: (Integration & {
        gmail: GmailIntegration | null;
        gCalendar: GoogleCalendarIntegration | null;
      })[];
    }
  >,
  context: Annotation<{
    gmail?: {
      messageId: string;
    };
  }>,

  thread_id: Annotation<string>,
});

export function ensureConfiguration(config: RunnableConfig): typeof ConfigurationSchema.State {
  return config.configurable as typeof ConfigurationSchema.State;
}
