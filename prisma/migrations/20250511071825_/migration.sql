/*
  Warnings:

  - The values [GMAIL,SLACK,ZOOM] on the enum `IntegrationType` will be removed. If these variants are still used in the database, this will fail.

*/
-- AlterEnum
BEGIN;
CREATE TYPE "IntegrationType_new" AS ENUM ('Gmail', 'Slack', 'Zoom', 'Calendar');
ALTER TABLE "Integration" ALTER COLUMN "type" TYPE "IntegrationType_new" USING ("type"::text::"IntegrationType_new");
ALTER TYPE "IntegrationType" RENAME TO "IntegrationType_old";
ALTER TYPE "IntegrationType_new" RENAME TO "IntegrationType";
DROP TYPE "IntegrationType_old";
COMMIT;
