-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "age" INTEGER,
    "sex" TEXT,
    "treatment" TEXT,
    "profile" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "State" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "dateCreated" DATE NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "State_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ExerciseModule" (
    "id" TEXT NOT NULL,
    "stateId" TEXT NOT NULL,
    "summary" TEXT,
    "tasks" JSONB NOT NULL,

    CONSTRAINT "ExerciseModule_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ExerciseTracker" (
    "id" TEXT NOT NULL,
    "moduleId" TEXT NOT NULL,
    "trackables" JSONB NOT NULL,

    CONSTRAINT "ExerciseTracker_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "NutritionModule" (
    "id" TEXT NOT NULL,
    "stateId" TEXT NOT NULL,
    "summary" TEXT,
    "tasks" JSONB NOT NULL,
    "checklists" JSONB,

    CONSTRAINT "NutritionModule_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "NutritionTracker" (
    "id" TEXT NOT NULL,
    "moduleId" TEXT NOT NULL,
    "trackables" JSONB NOT NULL,
    "checklistState" JSONB,

    CONSTRAINT "NutritionTracker_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "State_userId_dateCreated_key" ON "State"("userId", "dateCreated");

-- CreateIndex
CREATE UNIQUE INDEX "ExerciseModule_stateId_key" ON "ExerciseModule"("stateId");

-- CreateIndex
CREATE UNIQUE INDEX "ExerciseTracker_moduleId_key" ON "ExerciseTracker"("moduleId");

-- CreateIndex
CREATE UNIQUE INDEX "NutritionModule_stateId_key" ON "NutritionModule"("stateId");

-- CreateIndex
CREATE UNIQUE INDEX "NutritionTracker_moduleId_key" ON "NutritionTracker"("moduleId");

-- AddForeignKey
ALTER TABLE "Account" ADD CONSTRAINT "Account_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "State" ADD CONSTRAINT "State_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ExerciseModule" ADD CONSTRAINT "ExerciseModule_stateId_fkey" FOREIGN KEY ("stateId") REFERENCES "State"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ExerciseTracker" ADD CONSTRAINT "ExerciseTracker_moduleId_fkey" FOREIGN KEY ("moduleId") REFERENCES "ExerciseModule"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "NutritionModule" ADD CONSTRAINT "NutritionModule_stateId_fkey" FOREIGN KEY ("stateId") REFERENCES "State"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "NutritionTracker" ADD CONSTRAINT "NutritionTracker_moduleId_fkey" FOREIGN KEY ("moduleId") REFERENCES "NutritionModule"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
