/*
  Warnings:

  - You are about to drop the column `data` on the `NutritionProgress` table. All the data in the column will be lost.
  - Added the required column `trackables` to the `NutritionProgress` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "NutritionProgress" DROP COLUMN "data",
ADD COLUMN     "trackables" JSONB NOT NULL;
