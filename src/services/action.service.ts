import { timeMs } from '@/config/constants';
import { titleTemplatge, userInvokedTemplate } from '@/lib/assistant/prompts';
import { buildAssistant, llm } from '@/lib/assistant/v1';
import { ActionTrigger, db } from '@/lib/db';
import { getAgentStream, startAgentStream } from '@/lib/stream-helper';
import { userAssistantInvocationQueue } from '@/queues';
import { ServiceErrorCode, ServiceResult } from '@/types';
import { InvokeAssistantJobData, UserAssistantInvocationJobData } from '@/types/queue.type';
import { loggerUtils, serviceUtils } from '@/utils';
import { actionValidation } from '@/validation';
import {
  AIMessage,
  AIMessageChunk,
  BaseMessage,
  HumanMessage,
  SystemMessage,
  ToolMessage,
} from '@langchain/core/messages';
import { stdout } from 'process';
import { z } from 'zod';

const assistant = await buildAssistant({}).then(graph => {
  loggerUtils.info('assistant complied');
  return graph;
});

export async function createAction(
  userId: string
): Promise<ServiceResult<z.infer<typeof actionValidation.createdActionSchema>>> {
  const action = await db.action.create({
    data: {
      trigger: ActionTrigger.User,
      active: true,
      title: 'New Action',
      userId,
    },
  });

  await assistant.updateState(
    { configurable: { thread_id: action.id } },
    {
      messages: (await userInvokedTemplate.invoke({ systemTime: new Date().toDateString() }))
        .messages,
    }
  );

  return serviceUtils.createSuccessResult('Action created', action);
}

export async function invokeAssistant(data: InvokeAssistantJobData) {
  loggerUtils.debug('creating action');

  const { userId, prompt, context } = data;

  // create email action
  const action = await db.action.create({
    data: {
      trigger: ActionTrigger.DataSource,
      active: true,
      title: 'New Action',
      userId,
    },
  });

  loggerUtils.debug('invoking assistant with prompt');

  const { push, cleanup } = await startAgentStream(userId, action.id);

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

  const config = {
    configurable: {
      user: user!,
      context,
      thread_id: action.id,
    },
  };

  const stream = await assistant.stream({ messages: [prompt] }, config);

  for await (const update of stream) {
    const chunk = update[0];

    if (chunk instanceof AIMessageChunk) {
      const content = chunk.content.toString();
      if (chunk.tool_calls && chunk.tool_calls.length > 0) {
        console.log(chunk.tool_calls);

        push({
          event: 'message',
          data: JSON.stringify({
            status: true,
            chunk: `Calling ${chunk.tool_calls.map(c => c.name).join(', ')} ...`,
          }),
        });
      }

      if (content.length) {
        await push({
          event: 'chunk',
          data: content,
        });
      }
    }
  }

  await push({ event: 'done', data: '' });

  await cleanup();
  await db.action.update({ where: { id: action.id }, data: { active: false } });
}

export async function requestCompletion(data: UserAssistantInvocationJobData) {
  const { userId, actionId, prompt } = data;
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

  const config = {
    configurable: {
      user: user!,
      context: {},
      thread_id: actionId,
    },
  };

  const { push, cleanup } = await startAgentStream(userId, actionId);

  console.log('stream started');
  const stream = await assistant.stream(
    { messages: [prompt] },
    { streamMode: 'messages', ...config }
  );

  for await (const update of stream) {
    const chunk = update[0];

    if (chunk instanceof AIMessageChunk) {
      const content = chunk.content.toString();

      if (content.length) {
        await push({
          event: 'chunk',
          data: content,
        });
      }
    }
  }

  await push({ event: 'done', data: '' });

  await cleanup();
}

export async function requestCompletionDirect(
  data: UserAssistantInvocationJobData,
  signal?: AbortSignal
) {
  const { userId, actionId, prompt } = data;
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

  const config = {
    configurable: {
      user: user!,
      context: {},
      thread_id: actionId,
    },
  };

  const action = (await db.action.findUnique({ where: { id: actionId, userId } }))!;

  console.log('stream started');

  async function* generator() {
    if (action.title === 'New Action') {
      const out = await llm.invoke(
        (await titleTemplatge.invoke({ userMessage: prompt.content })).messages
      );

      await db.action.update({
        where: { userId, id: actionId },
        data: {
          title: out.content.toString(),
        },
      });

      console.log(out);

      yield {
        event: 'message',
        data: JSON.stringify({
          title: true,
          chunk: out.content.toString(),
        }),
      };
    }

    const stream = await assistant.stream(
      { messages: [prompt] },
      { streamMode: 'messages', ...config, signal }
    );

    for await (const update of stream) {
      const chunk = update[0];

      if (chunk instanceof AIMessageChunk) {
        if (chunk.tool_calls && chunk.tool_calls.length > 0) {
          console.log(chunk.tool_calls);

          yield {
            event: 'message',
            data: JSON.stringify({
              status: true,
              chunk: `Calling ${chunk.tool_calls.map(c => c.name).join(', ')} ...`,
            }),
          };
        }
        const content = chunk.content.toString();

        if (content.length) {
          stdout.write(content);
          yield {
            event: 'message',
            data: JSON.stringify({ chunk: content }),
          };
        }
      }
    }

    yield { event: 'message', data: JSON.stringify({ done: true }) };

    console.log('done');
  }

  return generator();
}

function extractContent(message: BaseMessage): string {
  if (message instanceof AIMessageChunk) {
    if (typeof message.content === 'string') {
      return message.content;
    }
  }

  if (message instanceof AIMessage) {
    if (typeof message.content === 'string') {
      return message.content;
    }
  }

  return typeof message.content === 'string' ? message.content : JSON.stringify(message.content);
}
function consolidateMessageChunks(messages: BaseMessage[]): BaseMessage[] {
  const consolidated: BaseMessage[] = [];
  let currentChunks: AIMessageChunk[] = [];

  for (const message of messages) {
    if (message instanceof SystemMessage || message instanceof ToolMessage) {
      continue;
    }

    if (message instanceof AIMessageChunk) {
      currentChunks.push(message);
    } else {
      if (currentChunks.length > 0) {
        const combinedContent = currentChunks.map(chunk => extractContent(chunk)).join('');

        const combinedMessage = new AIMessage({
          content: combinedContent,
          additional_kwargs: {
            ...currentChunks[0].additional_kwargs,
            chunks: currentChunks.length, // metadata about chunking
            timestamp: currentChunks[currentChunks.length - 1].additional_kwargs?.timestamp,
          },
        });

        consolidated.push(combinedMessage);
        currentChunks = [];
      }

      consolidated.push(message);
    }
  }

  if (currentChunks.length > 0) {
    const combinedContent = currentChunks.map(chunk => extractContent(chunk)).join('');

    const combinedMessage = new AIMessage({
      content: combinedContent,
      additional_kwargs: {
        ...currentChunks[0].additional_kwargs,
        chunks: currentChunks.length,
      },
    });

    consolidated.push(combinedMessage);
  }

  return consolidated;
}

function getMessageRole(message: BaseMessage): 'user' | 'assistant' | 'system' | 'tool' {
  if (message instanceof HumanMessage) return 'user';
  if (message instanceof AIMessage || message instanceof AIMessageChunk) return 'assistant';
  if (message instanceof SystemMessage) return 'system';
  if (message instanceof ToolMessage) return 'tool';
  return 'system'; // fallback
}

function transformMessagesForUI(
  messages: BaseMessage[]
): z.infer<typeof actionValidation.chatMessage>[] {
  // First consolidate any message chunks
  const consolidatedMessages = consolidateMessageChunks(messages);

  return consolidatedMessages
    .filter(msg => !msg.additional_kwargs?.internal)
    .map((msg, index) => ({
      id: msg.id || `msg-${Date.now()}-${index}`,
      role: getMessageRole(msg),
      content: extractContent(msg),
      timestamp: msg.additional_kwargs?.timestamp
        ? new Date(msg.additional_kwargs.timestamp as string)
        : new Date(),
      metadata: {
        isChunk: msg instanceof AIMessageChunk,
        chunkCount: msg.additional_kwargs?.chunks,
        toolCalls: msg.additional_kwargs?.tool_calls,
        ...msg.additional_kwargs,
      },
    }));
}

export async function fetchActionMessageHistory(
  userId: string,
  actionId: string
): Promise<ServiceResult<z.infer<typeof actionValidation.chatMessage>[]>> {
  const action = await db.action.findUnique({ where: { id: actionId, userId } });

  if (!action) {
    return serviceUtils.createErrorResult('Action not found', ServiceErrorCode.Bad);
  }

  const state = await assistant.getState({ configurable: { thread_id: actionId } });

  const messages: z.infer<typeof actionValidation.chatMessage>[] = transformMessagesForUI(
    state.values.messages || []
  );

  console.log(state.values.messages);

  return serviceUtils.createSuccessResult('History fetched', messages);
}

export async function streamAction(
  userId: string,
  actionId: string,
  prompt: string | null,
  signal: AbortSignal
): Promise<ServiceResult<AsyncGenerator<z.infer<typeof actionValidation.actionMessage>> | false>> {
  const action = await db.action.findUnique({ where: { id: actionId, userId } });

  if (!action) {
    return serviceUtils.createErrorResult('Action not found', ServiceErrorCode.Bad);
  }

  // if (!action.active) {
  //   return serviceUtils.createSuccessResult('Action not active', false);
  // }

  if (prompt) {
    return serviceUtils.createSuccessResult(
      'Action stream connected',
      await requestCompletionDirect(
        {
          userId,
          actionId,
          prompt: new HumanMessage(prompt),
        },
        signal
      )
    );
  }

  const stream = await getAgentStream(userId, actionId, signal);

  return serviceUtils.createSuccessResult('Action stream connected', stream);
}
