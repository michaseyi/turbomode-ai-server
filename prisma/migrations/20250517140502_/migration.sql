-- CreateTable
CREATE TABLE "GoogleCalendarIntegration" (
    "id" TEXT NOT NULL,
    "integrationId" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "accessToken" TEXT NOT NULL,
    "refreshToken" TEXT NOT NULL,

    CONSTRAINT "GoogleCalendarIntegration_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "GoogleCalendarIntegration_integrationId_key" ON "GoogleCalendarIntegration"("integrationId");

-- CreateIndex
CREATE UNIQUE INDEX "GoogleCalendarIntegration_email_key" ON "GoogleCalendarIntegration"("email");

-- AddForeignKey
ALTER TABLE "GoogleCalendarIntegration" ADD CONSTRAINT "GoogleCalendarIntegration_integrationId_fkey" FOREIGN KEY ("integrationId") REFERENCES "Integration"("id") ON DELETE CASCADE ON UPDATE CASCADE;
