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

-- CreateIndex
CREATE UNIQUE INDEX "GraphConfig_graphName_key" ON "GraphConfig"("graphName");
