-- AlterTable
ALTER TABLE "Draft" ADD COLUMN     "deadline" TEXT,
ADD COLUMN     "starred" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "topic" TEXT;
