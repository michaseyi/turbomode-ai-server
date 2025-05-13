-- CreateEnum
CREATE TYPE "ActionTrigger" AS ENUM ('User', 'Assistant', 'DataSource');

-- CreateEnum
CREATE TYPE "ActionMessageSource" AS ENUM ('User', 'Assistant');

-- CreateTable
CREATE TABLE "Action" (
    "id" TEXT NOT NULL,
    "trigger" "ActionTrigger" NOT NULL,
    "active" BOOLEAN NOT NULL,
    "title" TEXT NOT NULL,
    "userId" TEXT NOT NULL,

    CONSTRAINT "Action_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ActionMessage" (
    "id" TEXT NOT NULL,
    "source" "ActionMessageSource" NOT NULL,
    "actionId" TEXT NOT NULL,

    CONSTRAINT "ActionMessage_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "Action" ADD CONSTRAINT "Action_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ActionMessage" ADD CONSTRAINT "ActionMessage_actionId_fkey" FOREIGN KEY ("actionId") REFERENCES "Action"("id") ON DELETE CASCADE ON UPDATE CASCADE;
