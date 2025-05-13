import { buildAssistant } from '@/lib/assistant/v1';
import { ActionTrigger, db } from '@/lib/db';
import { InvokeAssistantJobData } from '@/types/queue.type';
import { loggerUtils } from '@/utils';

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
  loggerUtils.debug('invoking assistant with prompt');

  // assistant.stream({}, { configurable: { thread_id: action.id } });

  await db.action.update({ where: { id: action.id }, data: { active: false } });
}
