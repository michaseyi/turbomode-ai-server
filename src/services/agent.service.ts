import { db } from '@/lib/db';
import { ServiceErrorCode, ServiceResult } from '@/types';
import { loggerUtils, serviceUtils } from '@/utils';
import { agentValidation } from '@/validation';
import { z } from 'zod';
import { noteService } from '.';
import { buildAssistant } from '@/lib/assistant/v1';
import { ChatPromptTemplate } from '@langchain/core/prompts';
import { calendarAgentTemplate } from '@/lib/assistant/prompts';
import { nanoid } from 'nanoid';

const agent = await buildAssistant({}).then(graph => {
  loggerUtils.info('agent compiled');
  return graph;
});

type AgentInfo = {
  id: string;
  name: string;
  description: string;
  template: ChatPromptTemplate;
};

type AgentContext = {
  content: string;
  metadata: Record<string, any>;
};

const agentMappings: Map<string, AgentInfo> = new Map([
  [
    'calendar-agent',
    {
      id: 'calendar-agent',
      name: 'Calendar Agent',
      description: 'An agent that can manage calendar events, appointments, and reminders.',
      template: calendarAgentTemplate,
    },
  ],

  [
    'research-agent',
    {
      id: 'research-agent',
      name: 'Research Agent',
      description:
        'An agent that can perform research tasks, gather information, and summarize findings.',
      template: calendarAgentTemplate,
    },
  ],

  [
    'summarization-agent',
    {
      id: 'summarization-agent',
      name: 'Summarization Agent',
      description: 'An agent that can summarize documents, articles, and other text content.',
      template: calendarAgentTemplate,
    },
  ],
  [
    'email-compose-agent',
    {
      id: 'email-compose-agent',
      name: 'Email Compose Agent',
      description: 'An agent that can assist with composing and managing emails.',
      template: calendarAgentTemplate,
    },
  ],
]);

export async function buildContext(
  userId: string,
  context: z.infer<typeof agentValidation.invokeAgentSchema>['context']
): Promise<ServiceResult<Array<AgentContext>>> {
  const result = await Promise.all(
    context.map(async ctx => {
      switch (ctx.type) {
        case 'note': {
          const { noteId } = ctx;
          const note = await db.note.findUnique({
            where: {
              id: noteId,
              userId: userId,
            },
          });

          if (!note) {
            return Error(`Note with ID ${noteId} not found for user ${userId}`);
          }

          return {
            source: 'note',
            content: noteService.formatNoteContent(note.content),
            metadata: {
              title: note.title,
              createdAt: note.createdAt,
              updatedAt: note.updatedAt,
              archived: note.archived,
              favourite: note.favorite,
              tags: note.tags,
            },
          };
        }
        case 'email': {
          const { integrationId, messageId } = ctx;
          const integration = await db.integration.findUnique({
            where: {
              id: integrationId,
              userId: userId,
            },

            include: {
              gmail: true,
            },
          });

          if (!integration || !integration.gmail) {
            return new Error(`Integration with ID ${integrationId} not found for user ${userId}`);
          }

          const message = await db.gmailMessage.findUnique({
            where: {
              id: messageId,
              gmailIntegrationId: integration.gmail.id,
            },
          });

          if (!message) {
            return new Error(
              `Email message with ID ${messageId} not found for integration ${integrationId}`
            );
          }

          return {
            source: 'email',
            content: message.body || '',
            metadata: {
              subject: message.subject,
              from: message.from,
              to: message.to,
              date: message.internalDate,
            },
          };
        }
        case 'calendar': {
          const { integrationId, eventId } = ctx;
          const integration = await db.integration.findUnique({
            where: {
              id: integrationId,
              userId: userId,
            },
            include: {
              gCalendar: true,
            },
          });

          if (!integration || !integration.gCalendar) {
            return new Error(`Integration with ID ${integrationId} not found for user ${userId}`);
          }

          const event = await db.calendarEvent.findUnique({
            where: {
              id: eventId,
              gCalendarIntegrationId: integration.gCalendar.id,
            },
          });

          if (!event) {
            return new Error(
              `Calendar event with ID ${eventId} not found for integration ${integrationId}`
            );
          }

          return {
            source: 'calendar',
            content: event.description || '',
            metadata: {
              summary: event.summary,
              start: event.startTime,
              end: event.endTime,
              location: event.location,
            },
          };
        }
        case 'action': {
          const { actionId } = ctx;

          const action = await db.action.findUnique({
            where: {
              id: actionId,
              userId: userId,
            },
          });

          if (!action) {
            return new Error(`Action with ID ${actionId} not found for user ${userId}`);
          }

          // todo: implement action context retrieval
          return {
            source: 'action',
            content: action.title,
            metadata: {
              title: action.title,
              createdAt: action.createdAt,
              updatedAt: action.updatedAt,
            },
          };
        }
        case 'file':
        default:
          throw new Error(`Unknown context type: ${ctx.type}`);
      }
    })
  );

  const error = result.find(item => item instanceof Error);

  if (error) {
    return serviceUtils.createErrorResult(error.message, ServiceErrorCode.Bad);
  }

  return serviceUtils.createSuccessResult('Context built', result as Array<AgentContext>);
}

export async function invokeAgent(
  userId: string,
  props: z.infer<typeof agentValidation.invokeAgentSchema>
): Promise<ServiceResult<z.infer<typeof agentValidation.invokeAgentResponseSchema>>> {
  const { agentId, context, prompt } = props;

  const user = await db.user.findUnique({
    where: { id: userId },
    include: {
      integrations: {
        include: {
          gmail: true,
          gCalendar: true,
        },
      },
    },
  });

  const agentInfo = agentMappings.get(agentId);

  if (!agentInfo) {
    return serviceUtils.createErrorResult('Agent not found', ServiceErrorCode.NotFound);
  }

  const builtContext = await buildContext(userId, context);

  if (!builtContext.ok) {
    return serviceUtils.createErrorResult(builtContext.message, ServiceErrorCode.Bad);
  }

  const invokedTemplate = await agentInfo.template.invoke({
    context: builtContext.data,
    userMessage: prompt || '',
  });

  const config = {
    configurable: {
      user: user!,
      thread_id: nanoid(),
    },
  };

  const state = await agent.invoke({ messages: invokedTemplate.messages }, config);

  console.log(JSON.stringify(state.messages, null, 2));

  return serviceUtils.createSuccessResult('Agent invoked', state.messages.at(-1)!);
}

export async function listAgents(
  _userId: string
): Promise<ServiceResult<z.infer<typeof agentValidation.listAgentsResponseSchema>>> {
  return serviceUtils.createSuccessResult('Agents fetched', [...agentMappings.values()]);
}
