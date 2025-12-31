/*
  Warnings:

  - You are about to drop the column `trackables` on the `ExerciseProgress` table. All the data in the column will be lost.
  - You are about to drop the column `trackables` on the `NutritionProgress` table. All the data in the column will be lost.
  - Added the required column `data` to the `ExerciseProgress` table without a default value. This is not possible if the table is not empty.
  - Added the required column `data` to the `NutritionProgress` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "ExerciseProgress" DROP COLUMN "trackables",
ADD COLUMN     "data" JSONB NOT NULL,
ADD COLUMN     "summary" TEXT;

-- AlterTable
ALTER TABLE "NutritionProgress" DROP COLUMN "trackables",
ADD COLUMN     "data" JSONB NOT NULL,
ADD COLUMN     "summary" TEXT;
