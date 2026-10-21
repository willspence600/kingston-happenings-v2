-- AlterTable: short description shown on event cards and previews
ALTER TABLE "Event" ADD COLUMN IF NOT EXISTS "summary" TEXT;
ALTER TABLE "EventSeries" ADD COLUMN IF NOT EXISTS "summary" TEXT;
