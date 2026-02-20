/*
  Warnings:

  - You are about to drop the `ExerciseModule` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `ExerciseProgress` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `NutritionModule` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `NutritionProgress` table. If the table is not empty, all the data it contains will be lost.

*/
-- DropForeignKey
ALTER TABLE "ExerciseModule" DROP CONSTRAINT "ExerciseModule_stateId_fkey";

-- DropForeignKey
ALTER TABLE "ExerciseProgress" DROP CONSTRAINT "ExerciseProgress_moduleId_fkey";

-- DropForeignKey
ALTER TABLE "NutritionModule" DROP CONSTRAINT "NutritionModule_stateId_fkey";

-- DropForeignKey
ALTER TABLE "NutritionProgress" DROP CONSTRAINT "NutritionProgress_moduleId_fkey";

-- DropTable
DROP TABLE "ExerciseModule";

-- DropTable
DROP TABLE "ExerciseProgress";

-- DropTable
DROP TABLE "NutritionModule";

-- DropTable
DROP TABLE "NutritionProgress";

-- CreateTable
CREATE TABLE "Baseline" (
    "id" TEXT NOT NULL,
    "data" JSONB NOT NULL,
    "userId" TEXT NOT NULL,

    CONSTRAINT "Baseline_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Module" (
    "id" TEXT NOT NULL,
    "stateId" TEXT NOT NULL,
    "summary" TEXT,
    "plan" JSONB NOT NULL,
    "checklists" JSONB,

    CONSTRAINT "Module_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Progress" (
    "id" TEXT NOT NULL,
    "moduleId" TEXT NOT NULL,
    "summary" TEXT,
    "trackables" JSONB NOT NULL,
    "checklistState" JSONB,

    CONSTRAINT "Progress_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Baseline_userId_key" ON "Baseline"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "Module_stateId_key" ON "Module"("stateId");

-- CreateIndex
CREATE UNIQUE INDEX "Progress_moduleId_key" ON "Progress"("moduleId");

-- AddForeignKey
ALTER TABLE "Baseline" ADD CONSTRAINT "Baseline_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Module" ADD CONSTRAINT "Module_stateId_fkey" FOREIGN KEY ("stateId") REFERENCES "State"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Progress" ADD CONSTRAINT "Progress_moduleId_fkey" FOREIGN KEY ("moduleId") REFERENCES "Module"("id") ON DELETE CASCADE ON UPDATE CASCADE;
