-- DropIndex
DROP INDEX "State_userId_dateCreated_isActive_key";

-- AlterTable
ALTER TABLE "State" ADD COLUMN     "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
ALTER COLUMN "dateCreated" DROP DEFAULT;
