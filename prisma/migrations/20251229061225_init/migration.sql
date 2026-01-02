/*
  Warnings:

  - You are about to drop the column `tasks` on the `ExerciseModule` table. All the data in the column will be lost.
  - You are about to drop the column `tasks` on the `NutritionModule` table. All the data in the column will be lost.
  - Added the required column `plan` to the `ExerciseModule` table without a default value. This is not possible if the table is not empty.
  - Added the required column `plan` to the `NutritionModule` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "ExerciseModule" DROP COLUMN "tasks",
ADD COLUMN     "plan" JSONB NOT NULL;

-- AlterTable
ALTER TABLE "NutritionModule" DROP COLUMN "tasks",
ADD COLUMN     "plan" JSONB NOT NULL;
