-- CreateEnum
CREATE TYPE "UserRole" AS ENUM ('patient', 'admin');

-- AlterTable
ALTER TABLE "User" ADD COLUMN     "role" "UserRole" NOT NULL DEFAULT 'patient';

-- CreateTable
CREATE TABLE "AdminPatientRelation" (
    "id" TEXT NOT NULL,
    "adminId" TEXT NOT NULL,
    "patientId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AdminPatientRelation_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "AdminPatientRelation_patientId_key" ON "AdminPatientRelation"("patientId");

-- CreateIndex
CREATE UNIQUE INDEX "AdminPatientRelation_adminId_patientId_key" ON "AdminPatientRelation"("adminId", "patientId");

-- AddForeignKey
ALTER TABLE "AdminPatientRelation" ADD CONSTRAINT "AdminPatientRelation_adminId_fkey" FOREIGN KEY ("adminId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AdminPatientRelation" ADD CONSTRAINT "AdminPatientRelation_patientId_fkey" FOREIGN KEY ("patientId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
