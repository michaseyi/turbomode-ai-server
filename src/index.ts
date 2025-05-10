import { startApp } from '@/app';
import { loggerUtils } from '@/utils';
import { PubSub } from '@google-cloud/pubsub';
import { config, env } from '@/config';
import { db } from './lib/db';
import { google } from 'googleapis';

process.on('unhandledRejection', (reason: unknown, promise: Promise<unknown>) => {
  loggerUtils.error('unhandled rejection at', promise, 'reason:', reason);
});

startApp().catch((error: Error) => {
  loggerUtils.error('failed to start server', error);
  process.exit(1);
});

function run() {
  const pubsub = new PubSub({
    keyFile: env.GOOGLE_APPLICATION_CREDENTIALS,
  });

  const sub = pubsub.subscription(env.GOOGLE_PUBSUB_INCOMING_MAIL_SUB);

  sub.on('message', async m => {
    const d = JSON.parse(m.data.toString());
    console.log(d);
    const { emailAddress, historyId } = d;

    const integration = await db.gmailIntegration.findFirst({ where: { email: emailAddress } });

    if (!integration) {
      return m.ack();
    }

    const oauth2Client = new google.auth.OAuth2(
      config.env.GOOGLE_CLIENT_ID,
      config.env.GOOGLE_CLIENT_SECRET,
      config.env.GOOGLE_CALLBACK_URL
    );

    oauth2Client.setCredentials({
      access_token: integration.accessToken,
      refresh_token: integration.refreshToken,
    });

    const gmail = google.gmail({ version: 'v1', auth: oauth2Client });

    const response = await gmail.users.history.list({
      userId: 'me',
      startHistoryId: historyId,
      historyTypes: ['messageAdded'],
    });

    const history = response.data.history || [];

    console.log('histor', history);

    for (const record of history) {
      console.log('record', record);
      for (const message of record.messages || []) {
        console.log('message', message);
        const fullMessage = await gmail.users.messages.get({
          userId: 'me',
          id: message.id!,
          format: 'full',
        });

        console.log(JSON.stringify(fullMessage));
        console.log('\n\n');
      }
    }

    m.ack();
  });
}

// run();
