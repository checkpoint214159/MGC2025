/*
  Warnings:

  - You are about to drop the column `age` on the `User` table. All the data in the column will be lost.
  - You are about to drop the column `sex` on the `User` table. All the data in the column will be lost.
  - You are about to drop the column `treatment` on the `User` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "User" DROP COLUMN "age",
DROP COLUMN "sex",
DROP COLUMN "treatment";

-- CreateTable
CREATE TABLE "Biometrics" (
    "id" TEXT NOT NULL,
    "age" INTEGER NOT NULL,
    "sex" TEXT NOT NULL,
    "treatment" TEXT NOT NULL,
    "surgeryDate" TIMESTAMP(3) NOT NULL,
    "weightKg" DECIMAL(65,30) NOT NULL,
    "heightCm" DECIMAL(65,30) NOT NULL,
    "userId" TEXT NOT NULL,

    CONSTRAINT "Biometrics_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Biometrics_userId_key" ON "Biometrics"("userId");

-- AddForeignKey
ALTER TABLE "Biometrics" ADD CONSTRAINT "Biometrics_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
