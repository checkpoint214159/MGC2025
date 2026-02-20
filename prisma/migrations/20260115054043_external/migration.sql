/*
  Warnings:

  - You are about to drop the column `messageCount` on the `External` table. All the data in the column will be lost.
  - You are about to drop the column `threadCount` on the `External` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "External" DROP COLUMN "messageCount",
DROP COLUMN "threadCount";
