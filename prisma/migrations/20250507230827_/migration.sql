/*
  Warnings:

  - You are about to drop the column `accessToken` on the `Integration` table. All the data in the column will be lost.
  - Added the required column `role` to the `User` table without a default value. This is not possible if the table is not empty.

*/
-- CreateEnum
CREATE TYPE "Role" AS ENUM ('User', 'Admin');

-- AlterTable
ALTER TABLE "Integration" DROP COLUMN "accessToken",
ADD COLUMN     "token1" TEXT,
ADD COLUMN     "token2" TEXT;

-- AlterTable
ALTER TABLE "User" ADD COLUMN     "role" "Role" NOT NULL;
