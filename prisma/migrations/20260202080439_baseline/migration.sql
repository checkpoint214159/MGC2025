/*
  Warnings:

  - You are about to drop the `Baseline` table. If the table is not empty, all the data it contains will be lost.

*/
-- DropForeignKey
ALTER TABLE "Baseline" DROP CONSTRAINT "Baseline_userId_fkey";

-- DropTable
DROP TABLE "Baseline";

-- CreateTable
CREATE TABLE "Baselines" (
    "id" TEXT NOT NULL,
    "data" JSONB NOT NULL,
    "userId" TEXT NOT NULL,

    CONSTRAINT "Baselines_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Baselines_userId_key" ON "Baselines"("userId");

-- AddForeignKey
ALTER TABLE "Baselines" ADD CONSTRAINT "Baselines_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
