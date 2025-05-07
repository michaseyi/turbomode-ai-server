import { startApp } from '@/app';
import { loggerUtil } from '@/utils';
import { PubSub } from '@google-cloud/pubsub';
import { env } from '@/config';
import { google } from 'googleapis';

process.on('unhandledRejection', (reason: unknown, promise: Promise<unknown>) => {
  loggerUtil.error('unhandled rejection at', promise, 'reason:', reason);
});

startApp().catch((error: Error) => {
  loggerUtil.error('failed to start server', error);
  process.exit(1);
});

function test() {
  const pubsub = new PubSub({
    keyFile: env.GOOGLE_APPLICATION_CREDENTIALS,
  });

  const sub = pubsub.subscription(env.GOOGLE_PUBSUB_INCOMING_MAIL_SUB);

  sub.on('message', m => {
    loggerUtil.info('pubsub message received', m.data);
    m.ack();
  });

  const a = new google.auth.OAuth2({});
  a.setCredentials({});

  const b = google.gmail({ version: 'v1', auth: {} as any });

  b.users.watch({
    userId: 'me',
  });
}
