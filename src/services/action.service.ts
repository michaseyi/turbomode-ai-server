import { buildAssistant } from '@/lib/assistant/v1';
import { redis } from '@/lib/cache';
import { ActionTrigger, db } from '@/lib/db';
import { ServiceErrorCode, ServiceResult } from '@/types';
import { InvokeAssistantJobData } from '@/types/queue.type';
import { loggerUtils, serviceUtils } from '@/utils';
import { actionValidation } from '@/validation';
import { nanoid } from 'nanoid';
import { z } from 'zod';

const assistant = await buildAssistant({});
loggerUtils.info('assistant complied');

export async function invokeBgAssistant(data: InvokeAssistantJobData) {
  loggerUtils.debug('creating action');

  const { userId, prompt } = data;

  // create email action
  const action = await db.action.create({
    data: {
      trigger: ActionTrigger.DataSource,
      active: true,
      title: '#title',
      userId,
    },
  });

  const channelListKey = `stream:${userId}:${action.id}`;

  loggerUtils.debug('invoking assistant with prompt');

  // assistant.stream({}, { configurable: { thread_id: action.id } });

  await db.action.update({ where: { id: action.id }, data: { active: false } });
}

export async function streamAction(
  userId: string,
  actionId: string
): Promise<ServiceResult<AsyncGenerator<z.infer<typeof actionValidation.actionMessage>> | false>> {
  const action = await db.action.findUnique({ where: { id: actionId, userId } });

  if (!action) {
    return serviceUtils.createErrorResult('Action not found', ServiceErrorCode.Bad);
  }

  if (!action.active) {
    return serviceUtils.createSuccessResult('Action not active', false);
  }

  const channelListKey = `stream:${userId}:${actionId}`;
  const length = await redis.scard(channelListKey);

  if (!(length <= 5)) {
    return serviceUtils.createErrorResult(
      'Max connection to action stream reached.',
      ServiceErrorCode.Bad
    );
  }

  const channelKey = `channel:${userId}:${actionId}:${nanoid(5)}`;
  // const channelKey = `channel`;
  await redis.sadd(channelListKey, channelKey); // add channel to sub list

  const stream = generateStream(channelListKey, channelKey);

  return serviceUtils.createSuccessResult('Action stream connected', stream);
}

async function* generateStream(channelListKey: string, channelKey: string) {
  while (true) {
    const result = await redis.blpop(channelKey, 10000); // timeout after 10 seconds

    if (!result) {
      await redis.srem(channelListKey, channelKey); // remove channel from sub list
      await redis.del(channelKey); // cleanup channel
      return;
    }

    const [_, message] = result;

    try {
      yield actionValidation.actionMessage.parse(JSON.parse(message));
    } catch (error) {
      // skip invalid message
      loggerUtils.info('encounted invalid message from stream', { message });
    }
  }
}
