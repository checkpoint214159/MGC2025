/*
  Warnings:

  - You are about to drop the column `data` on the `ExerciseProgress` table. All the data in the column will be lost.
  - Added the required column `trackables` to the `ExerciseProgress` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "ExerciseProgress" DROP COLUMN "data",
ADD COLUMN     "trackables" JSONB NOT NULL;
