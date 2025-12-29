/*
  Warnings:

  - You are about to drop the `ExerciseTracker` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `NutritionTracker` table. If the table is not empty, all the data it contains will be lost.

*/
-- DropForeignKey
ALTER TABLE "ExerciseTracker" DROP CONSTRAINT "ExerciseTracker_moduleId_fkey";

-- DropForeignKey
ALTER TABLE "NutritionTracker" DROP CONSTRAINT "NutritionTracker_moduleId_fkey";

-- DropTable
DROP TABLE "ExerciseTracker";

-- DropTable
DROP TABLE "NutritionTracker";

-- CreateTable
CREATE TABLE "ExerciseProgress" (
    "id" TEXT NOT NULL,
    "moduleId" TEXT NOT NULL,
    "trackables" JSONB NOT NULL,

    CONSTRAINT "ExerciseProgress_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "NutritionProgress" (
    "id" TEXT NOT NULL,
    "moduleId" TEXT NOT NULL,
    "trackables" JSONB NOT NULL,
    "checklistState" JSONB,

    CONSTRAINT "NutritionProgress_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "ExerciseProgress_moduleId_key" ON "ExerciseProgress"("moduleId");

-- CreateIndex
CREATE UNIQUE INDEX "NutritionProgress_moduleId_key" ON "NutritionProgress"("moduleId");

-- AddForeignKey
ALTER TABLE "ExerciseProgress" ADD CONSTRAINT "ExerciseProgress_moduleId_fkey" FOREIGN KEY ("moduleId") REFERENCES "ExerciseModule"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "NutritionProgress" ADD CONSTRAINT "NutritionProgress_moduleId_fkey" FOREIGN KEY ("moduleId") REFERENCES "NutritionModule"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
