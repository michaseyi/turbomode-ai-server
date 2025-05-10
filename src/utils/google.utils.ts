import { config } from '@/config';
import { google } from 'googleapis';

export function createOauthClient() {
  const oauth2Client = new google.auth.OAuth2(
    config.env.GOOGLE_CLIENT_ID,
    config.env.GOOGLE_CLIENT_SECRET,
    config.env.GOOGLE_CALLBACK_URL
  );

  return oauth2Client;
}

export async function watchMail(auth: ReturnType<typeof createOauthClient>) {
  const gmail = google.gmail({ version: 'v1', auth });

  return await gmail.users.watch({
    userId: 'me',
    requestBody: {
      topicName: config.env.GOOGLE_PUBSUB_INCOMING_MAIL_TOPIC,
      labelIds: ['INBOX'],
      labelFilterAction: 'include',
    },
  });
}

export async function unWatchMail(auth: ReturnType<typeof createOauthClient>) {
  const gmail = google.gmail({ version: 'v1', auth });

  return await gmail.users.stop({
    userId: 'me',
  });
}

export async function revokeToken(token: string) {
  try {
    const url = new URL('https://oauth2.googleapis.com/revoke');
    url.searchParams.set('token', token);

    await fetch(url, { method: 'get' });
  } catch (error) {
    // todo: what to do here
  }
}
