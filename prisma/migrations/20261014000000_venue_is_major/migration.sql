-- AlterTable: Major Venue flag (only Major Venues are listed on Coming Up)
ALTER TABLE "Venue" ADD COLUMN IF NOT EXISTS "isMajor" BOOLEAN NOT NULL DEFAULT false;
