export type EmailJobData = {
  to: string;
  subject: string;
  template: string;
  context?: Record<string, any>;
};

export type GmailMessageJobData = {
  messageId: string;
  email: string;
  integrationId: string;
};
