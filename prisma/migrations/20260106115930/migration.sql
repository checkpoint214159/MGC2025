/*
  Warnings:

  - A unique constraint covering the columns `[causalStateId]` on the table `State` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[causalXId]` on the table `State` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[userId,dateCreated,isActive]` on the table `State` will be added. If there are existing duplicate values, this will fail.

*/
-- DropForeignKey
ALTER TABLE "ExerciseProgress" DROP CONSTRAINT "ExerciseProgress_moduleId_fkey";

-- DropForeignKey
ALTER TABLE "NutritionModule" DROP CONSTRAINT "NutritionModule_stateId_fkey";

-- DropForeignKey
ALTER TABLE "NutritionProgress" DROP CONSTRAINT "NutritionProgress_moduleId_fkey";

-- DropForeignKey
ALTER TABLE "State" DROP CONSTRAINT "State_userId_fkey";

-- DropIndex
DROP INDEX "State_userId_dateCreated_key";

-- AlterTable
ALTER TABLE "State" ADD COLUMN     "causalStateId" TEXT,
ADD COLUMN     "causalXId" TEXT,
ADD COLUMN     "isActive" BOOLEAN;

-- CreateTable
CREATE TABLE "External" (
    "id" TEXT NOT NULL,
    "dateCreated" DATE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "threadContext" JSONB NOT NULL,
    "messageCount" INTEGER,
    "threadCount" INTEGER,

    CONSTRAINT "External_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Thread" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "title" TEXT,
    "type" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Thread_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Message" (
    "id" TEXT NOT NULL,
    "creationSource" TEXT NOT NULL,
    "threadId" TEXT NOT NULL,
    "role" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "context" JSONB,
    "reasoning" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Message_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "State_causalStateId_key" ON "State"("causalStateId");

-- CreateIndex
CREATE UNIQUE INDEX "State_causalXId_key" ON "State"("causalXId");

-- CreateIndex
CREATE UNIQUE INDEX "State_userId_dateCreated_isActive_key" ON "State"("userId", "dateCreated", "isActive");

-- AddForeignKey
ALTER TABLE "State" ADD CONSTRAINT "State_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "State" ADD CONSTRAINT "State_causalStateId_fkey" FOREIGN KEY ("causalStateId") REFERENCES "State"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "State" ADD CONSTRAINT "State_causalXId_fkey" FOREIGN KEY ("causalXId") REFERENCES "External"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ExerciseProgress" ADD CONSTRAINT "ExerciseProgress_moduleId_fkey" FOREIGN KEY ("moduleId") REFERENCES "ExerciseModule"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "NutritionModule" ADD CONSTRAINT "NutritionModule_stateId_fkey" FOREIGN KEY ("stateId") REFERENCES "State"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "NutritionProgress" ADD CONSTRAINT "NutritionProgress_moduleId_fkey" FOREIGN KEY ("moduleId") REFERENCES "NutritionModule"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Thread" ADD CONSTRAINT "Thread_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Message" ADD CONSTRAINT "Message_threadId_fkey" FOREIGN KEY ("threadId") REFERENCES "Thread"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
