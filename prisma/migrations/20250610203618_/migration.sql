-- AlterTable
ALTER TABLE "GmailIntegration" ADD COLUMN     "lastSyncAt" TIMESTAMP(3);

-- AlterTable
ALTER TABLE "GoogleCalendarIntegration" ADD COLUMN     "lastSyncAt" TIMESTAMP(3);
