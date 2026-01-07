/*
  Warnings:

  - You are about to drop the column `heightCm` on the `Biometrics` table. All the data in the column will be lost.
  - You are about to drop the column `weightKg` on the `Biometrics` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "Biometrics" DROP COLUMN "heightCm",
DROP COLUMN "weightKg";
