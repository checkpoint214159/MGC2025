/*
  Warnings:

  - You are about to drop the `Baselines` table. If the table is not empty, all the data it contains will be lost.

*/
-- DropForeignKey
ALTER TABLE "Baselines" DROP CONSTRAINT "Baselines_userId_fkey";

-- DropTable
DROP TABLE "Baselines";

-- CreateTable
CREATE TABLE "Baseline" (
    "id" TEXT NOT NULL,
    "data" JSONB NOT NULL,
    "userId" TEXT NOT NULL,

    CONSTRAINT "Baseline_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Baseline_userId_key" ON "Baseline"("userId");

-- AddForeignKey
ALTER TABLE "Baseline" ADD CONSTRAINT "Baseline_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
