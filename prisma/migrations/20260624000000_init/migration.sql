-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "public";

-- CreateEnum
CREATE TYPE "Role" AS ENUM ('user', 'assistant', 'system');

-- CreateEnum
CREATE TYPE "UserRole" AS ENUM ('patient', 'admin', 'physiotherapist', 'dietician');

-- CreateEnum
CREATE TYPE "PlanStatus" AS ENUM ('draft', 'verified', 'active', 'archived');

-- CreateEnum
CREATE TYPE "FlagStatus" AS ENUM ('open', 'reviewing', 'escalated', 'dismissed');

-- CreateTable
CREATE TABLE "Account" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "password" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,

    CONSTRAINT "Account_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "role" "UserRole" NOT NULL DEFAULT 'patient',
    "profile" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PatientMemory" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "semantic" TEXT NOT NULL DEFAULT '',
    "episodic" JSONB NOT NULL DEFAULT '[]',
    "consolidatedThrough" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PatientMemory_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AdminPatientRelation" (
    "id" TEXT NOT NULL,
    "adminId" TEXT NOT NULL,
    "patientId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AdminPatientRelation_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Screening" (
    "id" TEXT NOT NULL,
    "data" JSONB NOT NULL,
    "userId" TEXT NOT NULL,

    CONSTRAINT "Screening_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Biometrics" (
    "id" TEXT NOT NULL,
    "age" INTEGER NOT NULL,
    "sex" TEXT NOT NULL,
    "treatment" TEXT NOT NULL,
    "surgeryDate" TIMESTAMP(3) NOT NULL,
    "userId" TEXT NOT NULL,

    CONSTRAINT "Biometrics_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "State" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "dateCreated" DATE NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "isActive" BOOLEAN NOT NULL,
    "recoveryDays" INTEGER,
    "status" "PlanStatus" NOT NULL DEFAULT 'active',
    "confidence" DOUBLE PRECISION,
    "isAnchor" BOOLEAN NOT NULL DEFAULT false,
    "causalStateId" TEXT,
    "nextStateId" TEXT,
    "anchorStateId" TEXT,
    "causalXId" TEXT,

    CONSTRAINT "State_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Module" (
    "id" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "stateId" TEXT NOT NULL,
    "summary" TEXT,
    "plan" JSONB NOT NULL,
    "checklists" JSONB,
    "ownerRole" "UserRole",
    "verifiedAt" TIMESTAMP(3),
    "verifiedById" TEXT,

    CONSTRAINT "Module_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Progress" (
    "id" TEXT NOT NULL,
    "moduleId" TEXT NOT NULL,
    "summary" TEXT,
    "trackables" JSONB NOT NULL,
    "checklistState" JSONB,

    CONSTRAINT "Progress_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "External" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "dateCreated" DATE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "threadContext" JSONB NOT NULL,
    "profile" TEXT NOT NULL,

    CONSTRAINT "External_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Thread" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "title" TEXT,
    "type" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Thread_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Message" (
    "id" TEXT NOT NULL,
    "creationSource" TEXT NOT NULL,
    "threadId" TEXT NOT NULL,
    "role" "Role" NOT NULL,
    "content" TEXT NOT NULL,
    "context" JSONB,
    "reasoning" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Message_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "GraphConfig" (
    "graphName" TEXT NOT NULL,
    "contextWindowDays" INTEGER NOT NULL DEFAULT 1,
    "smartFiltering" BOOLEAN NOT NULL DEFAULT false,
    "maxContextTokens" INTEGER NOT NULL DEFAULT 8000,
    "includeTrajectory" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "GraphConfig_pkey" PRIMARY KEY ("graphName")
);

-- CreateTable
CREATE TABLE "ModuleComment" (
    "id" TEXT NOT NULL,
    "moduleId" TEXT NOT NULL,
    "authorId" TEXT NOT NULL,
    "role" "UserRole" NOT NULL,
    "body" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ModuleComment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Flag" (
    "id" TEXT NOT NULL,
    "patientId" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "severity" TEXT NOT NULL,
    "status" "FlagStatus" NOT NULL DEFAULT 'open',
    "detail" JSONB,
    "note" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "resolvedAt" TIMESTAMP(3),
    "resolvedById" TEXT,

    CONSTRAINT "Flag_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Account_email_key" ON "Account"("email");

-- CreateIndex
CREATE UNIQUE INDEX "Account_user_id_key" ON "Account"("user_id");

-- CreateIndex
CREATE UNIQUE INDEX "PatientMemory_userId_key" ON "PatientMemory"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "AdminPatientRelation_patientId_key" ON "AdminPatientRelation"("patientId");

-- CreateIndex
CREATE UNIQUE INDEX "AdminPatientRelation_adminId_patientId_key" ON "AdminPatientRelation"("adminId", "patientId");

-- CreateIndex
CREATE UNIQUE INDEX "Screening_userId_key" ON "Screening"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "Biometrics_userId_key" ON "Biometrics"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "State_causalStateId_key" ON "State"("causalStateId");

-- CreateIndex
CREATE UNIQUE INDEX "State_nextStateId_key" ON "State"("nextStateId");

-- CreateIndex
CREATE UNIQUE INDEX "State_causalXId_key" ON "State"("causalXId");

-- CreateIndex
CREATE UNIQUE INDEX "Progress_moduleId_key" ON "Progress"("moduleId");

-- CreateIndex
CREATE UNIQUE INDEX "GraphConfig_graphName_key" ON "GraphConfig"("graphName");

-- AddForeignKey
ALTER TABLE "Account" ADD CONSTRAINT "Account_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PatientMemory" ADD CONSTRAINT "PatientMemory_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AdminPatientRelation" ADD CONSTRAINT "AdminPatientRelation_adminId_fkey" FOREIGN KEY ("adminId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AdminPatientRelation" ADD CONSTRAINT "AdminPatientRelation_patientId_fkey" FOREIGN KEY ("patientId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Screening" ADD CONSTRAINT "Screening_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Biometrics" ADD CONSTRAINT "Biometrics_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "State" ADD CONSTRAINT "State_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "State" ADD CONSTRAINT "State_causalStateId_fkey" FOREIGN KEY ("causalStateId") REFERENCES "State"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "State" ADD CONSTRAINT "State_anchorStateId_fkey" FOREIGN KEY ("anchorStateId") REFERENCES "State"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "State" ADD CONSTRAINT "State_causalXId_fkey" FOREIGN KEY ("causalXId") REFERENCES "External"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Module" ADD CONSTRAINT "Module_stateId_fkey" FOREIGN KEY ("stateId") REFERENCES "State"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Progress" ADD CONSTRAINT "Progress_moduleId_fkey" FOREIGN KEY ("moduleId") REFERENCES "Module"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "External" ADD CONSTRAINT "External_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Thread" ADD CONSTRAINT "Thread_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Message" ADD CONSTRAINT "Message_threadId_fkey" FOREIGN KEY ("threadId") REFERENCES "Thread"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ModuleComment" ADD CONSTRAINT "ModuleComment_moduleId_fkey" FOREIGN KEY ("moduleId") REFERENCES "Module"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Flag" ADD CONSTRAINT "Flag_patientId_fkey" FOREIGN KEY ("patientId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

