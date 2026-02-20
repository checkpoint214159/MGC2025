/*
  Warnings:

  - Added the required column `type` to the `Module` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "Module" ADD COLUMN     "type" TEXT NOT NULL;
