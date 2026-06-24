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

-- CreateIndex
CREATE UNIQUE INDEX "PatientMemory_userId_key" ON "PatientMemory"("userId");

-- AddForeignKey
ALTER TABLE "PatientMemory" ADD CONSTRAINT "PatientMemory_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
