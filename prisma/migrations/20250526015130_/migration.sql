/*
  Warnings:

  - Added the required column `content` to the `ActionMessage` table without a default value. This is not possible if the table is not empty.
  - Added the required column `nextId` to the `ActionMessage` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "ActionMessage" ADD COLUMN     "content" TEXT NOT NULL,
ADD COLUMN     "nextId" TEXT NOT NULL;

-- CreateTable
CREATE TABLE "CalendarEvent" (
    "id" TEXT NOT NULL,
    "eventId" TEXT NOT NULL,
    "calendarId" TEXT NOT NULL DEFAULT 'primary',
    "gCalendarIntegrationId" TEXT NOT NULL,
    "summary" TEXT,
    "description" TEXT,
    "location" TEXT,
    "startTime" TIMESTAMP(3) NOT NULL,
    "endTime" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "status" TEXT,
    "htmlLink" TEXT,

    CONSTRAINT "CalendarEvent_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "GmailMessage" (
    "id" TEXT NOT NULL,
    "messageId" TEXT NOT NULL,
    "threadId" TEXT,
    "labelIds" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "snippet" TEXT,
    "internalDate" TIMESTAMP(3) NOT NULL,
    "from" TEXT,
    "to" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "cc" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "bcc" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "subject" TEXT,
    "body" TEXT,
    "isUnread" BOOLEAN NOT NULL DEFAULT true,
    "gmailIntegrationId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "GmailMessage_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "CalendarEvent_eventId_key" ON "CalendarEvent"("eventId");

-- CreateIndex
CREATE INDEX "CalendarEvent_eventId_idx" ON "CalendarEvent"("eventId");

-- CreateIndex
CREATE UNIQUE INDEX "GmailMessage_messageId_key" ON "GmailMessage"("messageId");

-- CreateIndex
CREATE INDEX "GmailMessage_messageId_idx" ON "GmailMessage"("messageId");

-- CreateIndex
CREATE INDEX "GmailMessage_threadId_idx" ON "GmailMessage"("threadId");

-- AddForeignKey
ALTER TABLE "CalendarEvent" ADD CONSTRAINT "CalendarEvent_gCalendarIntegrationId_fkey" FOREIGN KEY ("gCalendarIntegrationId") REFERENCES "GoogleCalendarIntegration"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GmailMessage" ADD CONSTRAINT "GmailMessage_gmailIntegrationId_fkey" FOREIGN KEY ("gmailIntegrationId") REFERENCES "GmailIntegration"("id") ON DELETE CASCADE ON UPDATE CASCADE;
