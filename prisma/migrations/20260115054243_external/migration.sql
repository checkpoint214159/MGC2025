/*
  Warnings:

  - Added the required column `profile` to the `External` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "External" ADD COLUMN     "profile" TEXT NOT NULL;
