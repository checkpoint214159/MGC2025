/*
  Warnings:

  - Made the column `isActive` on table `State` required. This step will fail if there are existing NULL values in that column.

*/
-- AlterTable
ALTER TABLE "State" ALTER COLUMN "isActive" SET NOT NULL;
