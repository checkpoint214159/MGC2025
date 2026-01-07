/*
  Warnings:

  - A unique constraint covering the columns `[nextStateId]` on the table `State` will be added. If there are existing duplicate values, this will fail.

*/
-- AlterTable
ALTER TABLE "State" ADD COLUMN     "nextStateId" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "State_nextStateId_key" ON "State"("nextStateId");
