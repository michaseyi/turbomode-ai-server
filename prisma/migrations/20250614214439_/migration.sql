-- CreateTable
CREATE TABLE "GmailMessageLabel" (
    "id" TEXT NOT NULL,
    "gmailIntegrationId" TEXT NOT NULL,
    "labelId" TEXT NOT NULL,
    "labelName" TEXT NOT NULL,

    CONSTRAINT "GmailMessageLabel_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "GmailMessageLabel_gmailIntegrationId_labelId_key" ON "GmailMessageLabel"("gmailIntegrationId", "labelId");

-- AddForeignKey
ALTER TABLE "GmailMessageLabel" ADD CONSTRAINT "GmailMessageLabel_gmailIntegrationId_fkey" FOREIGN KEY ("gmailIntegrationId") REFERENCES "GmailIntegration"("id") ON DELETE CASCADE ON UPDATE CASCADE;
