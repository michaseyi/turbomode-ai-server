/*
  Warnings:

  - You are about to drop the column `config` on the `Integration` table. All the data in the column will be lost.
  - You are about to drop the column `instructions` on the `Integration` table. All the data in the column will be lost.
  - You are about to drop the column `token1` on the `Integration` table. All the data in the column will be lost.
  - You are about to drop the column `token2` on the `Integration` table. All the data in the column will be lost.

*/
-- CreateEnum
CREATE TYPE "EmailProcessOption" AS ENUM ('All', 'FromSpecific', 'ExceptSpecific');

-- AlterTable
ALTER TABLE "Integration" DROP COLUMN "config",
DROP COLUMN "instructions",
DROP COLUMN "token1",
DROP COLUMN "token2";

-- CreateTable
CREATE TABLE "GmailIntegration" (
    "id" TEXT NOT NULL,
    "integrationId" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "accessToken" TEXT NOT NULL,
    "refreshToken" TEXT NOT NULL,
    "instruction" TEXT NOT NULL,
    "emailProcessOption" "EmailProcessOption" NOT NULL DEFAULT 'All',
    "specificAddresses" TEXT,
    "processAttachment" BOOLEAN NOT NULL DEFAULT false,
    "processThreadHistory" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "GmailIntegration_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "GmailIntegration_integrationId_key" ON "GmailIntegration"("integrationId");

-- AddForeignKey
ALTER TABLE "GmailIntegration" ADD CONSTRAINT "GmailIntegration_integrationId_fkey" FOREIGN KEY ("integrationId") REFERENCES "Integration"("id") ON DELETE CASCADE ON UPDATE CASCADE;
