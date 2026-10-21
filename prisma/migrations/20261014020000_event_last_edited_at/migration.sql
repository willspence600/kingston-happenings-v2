-- AlterTable: track when a listing was last edited by its submitter or an admin
ALTER TABLE "Event" ADD COLUMN IF NOT EXISTS "lastEditedAt" TIMESTAMP(3);
