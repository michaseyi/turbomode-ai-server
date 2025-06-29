import { nanoid } from 'nanoid';
import { redis } from './cache';
import { actionValidation } from '@/validation';
import { loggerUtils } from '@/utils';
import { z } from 'zod';

// export async function getAgentStream(userId: string, actionId: string, signal: AbortSignal) {
//   const channelListKey = `stream:${userId}:${actionId}`;
//   const channelKey = `channel:${userId}:${actionId}:${nanoid(5)}`;

//   const channelCount = await redis.scard(channelListKey);

//   // if (channelCount >= 5) {
//   //   throw new Error('Max connection to action stream reached.');
//   // }

//   await redis.sadd(channelListKey, channelKey);

//   signal.onabort = async () => {
//     await redis.srem(channelListKey, channelKey);
//     await redis.del(channelKey);
//   };

//   async function* streamGenerator(channelListKey: string, channelKey: string) {
//     const dup = redis.duplicate();
//     while (!signal.aborted) {
//       console.log('blocking');
//       const result = await dup.blpop(channelKey, 10000); // timeout after 10 seconds
//       console.log('unblocking');

//       if (!result) {
//         await dup.srem(channelListKey, channelKey);
//         await dup.del(channelKey);
//         return;
//       }

//       const [_, message] = result;

//       try {
//         yield actionValidation.actionMessage.parse(JSON.parse(message));
//       } catch (error) {
//         // skip invalid message
//         loggerUtils.info('encounted invalid message from stream', { message });
//       }
//     }
//   }

//   const stream = streamGenerator(channelListKey, channelKey);

//   return stream;
// }

// export async function startAgentStream(userId: string, actionId: string) {
//   const channelListKey = `stream:${userId}:${actionId}`;

//   async function push(message: z.infer<typeof actionValidation.actionMessage>) {
//     const members = await redis.smembers(channelListKey);

//     console.log(members);
//     for (const member of members) {
//       await redis.rpush(member, JSON.stringify(message));
//     }
//   }

//   async function cleanup() {
//     // todo: push a stop message to all channels?
//   }

//   return { push, cleanup };
// }

export async function getAgentStream(userId: string, actionId: string, signal: AbortSignal) {
  const streamKey = `stream:${userId}:${actionId}`;
  // const readerId = nanoid(5);
  const dup = redis.duplicate();
  // await dup.connect();

  signal.addEventListener('abort', () => {
    dup.disconnect();
  });

  async function* streamGenerator() {
    let lastId = '$'; // Only read new messages

    while (!signal.aborted) {
      try {
        const result = await dup.xread('BLOCK', 10000, 'STREAMS', streamKey, lastId);

        if (!result) continue; // timeout, continue blocking

        const [[_, messages]] = result;
        for (const [id, fields] of messages) {
          lastId = id;

          try {
            const data = fields[1];
            yield actionValidation.actionMessage.parse(JSON.parse(data));
          } catch (err) {
            loggerUtils.info('Invalid message from stream', { message: fields });
          }
        }
      } catch (err) {
        if (!signal.aborted) {
          loggerUtils.error('Stream error', { err });
        }
        break;
      }
    }
  }

  return streamGenerator();
}

export async function startAgentStream(userId: string, actionId: string) {
  const streamKey = `stream:${userId}:${actionId}`;

  async function push(message: z.infer<typeof actionValidation.actionMessage>) {
    await redis.xadd(streamKey, '*', 'data', JSON.stringify(message));
  }

  async function cleanup() {
    // Optional: delete stream or push stop message
    // await redis.del(streamKey);
  }

  return { push, cleanup };
}
