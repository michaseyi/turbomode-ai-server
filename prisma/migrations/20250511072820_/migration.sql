/*
  Warnings:

  - A unique constraint covering the columns `[email]` on the table `GmailIntegration` will be added. If there are existing duplicate values, this will fail.

*/
-- CreateIndex
CREATE UNIQUE INDEX "GmailIntegration_email_key" ON "GmailIntegration"("email");
