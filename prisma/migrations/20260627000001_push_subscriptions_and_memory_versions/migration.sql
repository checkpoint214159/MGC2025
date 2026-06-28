-- Tables added via `prisma db push` after the baseline (20260624000000_init).
-- This migration records them in migration history so future `prisma migrate dev`
-- diffs start from the correct point.
-- Applied to existing DBs with: prisma migrate resolve --applied <this-migration-name>

-- CreateTable: append-only audit trail of PatientMemory consolidation passes.
CREATE TABLE "PatientMemoryVersion" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "semantic" TEXT NOT NULL DEFAULT '',
    "episodic" JSONB NOT NULL DEFAULT '[]',
    "consolidatedThrough" TIMESTAMP(3) NOT NULL,
    "trigger" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PatientMemoryVersion_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "PatientMemoryVersion_userId_createdAt_idx" ON "PatientMemoryVersion"("userId", "createdAt");

-- AddForeignKey
ALTER TABLE "PatientMemoryVersion" ADD CONSTRAINT "PatientMemoryVersion_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- CreateTable: browser Web Push subscriptions (one user can have many devices).
CREATE TABLE "PushSubscription" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "endpoint" TEXT NOT NULL,
    "p256dh" TEXT NOT NULL,
    "auth" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PushSubscription_pkey" PRIMARY KEY ("id")
);

-- CreateIndex: endpoint must be globally unique (Web Push spec)
CREATE UNIQUE INDEX "PushSubscription_endpoint_key" ON "PushSubscription"("endpoint");

-- CreateIndex
CREATE INDEX "PushSubscription_userId_idx" ON "PushSubscription"("userId");

-- AddForeignKey
ALTER TABLE "PushSubscription" ADD CONSTRAINT "PushSubscription_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
