import { config } from '@/config';
import { gmail_v1 } from 'googleapis';
import { Buffer } from 'buffer';
import { google } from 'googleapis';
import { MailMessage } from '@/types/integration.type';

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

export function parseGmailMessage(message: gmail_v1.Schema$Message): MailMessage {
  const headers = message.payload?.headers || [];

  const getHeader = (name: string) =>
    headers.find(h => h.name?.toLowerCase() === name.toLowerCase())?.value || null;

  function getBody(payload: gmail_v1.Schema$MessagePart | undefined): string {
    if (!payload) return '';
    if (payload.body?.data) {
      return Buffer.from(payload.body.data, 'base64').toString('utf8');
    }
    if (payload.parts) {
      for (const part of payload.parts) {
        if (part.mimeType === 'text/plain' || part.mimeType === 'text/html') {
          const content = getBody(part);
          if (content) return content;
        }
      }
    }
    return '';
  }

  return {
    from: getHeader('From'),
    to: getHeader('To'),
    subject: getHeader('Subject'),
    date: getHeader('Date'),
    body: getBody(message.payload),
  };
}
