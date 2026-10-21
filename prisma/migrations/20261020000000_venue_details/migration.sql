-- AlterTable: venue details collected on organizer sign-up (shown on the venue page)
ALTER TABLE "Venue" ADD COLUMN IF NOT EXISTS "venueTypes" TEXT[] DEFAULT ARRAY[]::TEXT[];
ALTER TABLE "Venue" ADD COLUMN IF NOT EXISTS "phone" TEXT;
ALTER TABLE "Venue" ADD COLUMN IF NOT EXISTS "instagram" TEXT;
ALTER TABLE "Venue" ADD COLUMN IF NOT EXISTS "about" TEXT;
ALTER TABLE "Venue" ADD COLUMN IF NOT EXISTS "hours" JSONB;
ALTER TABLE "Venue" ADD COLUMN IF NOT EXISTS "accessibility" TEXT[] DEFAULT ARRAY[]::TEXT[];
ALTER TABLE "Venue" ADD COLUMN IF NOT EXISTS "accessibilityNotes" TEXT;
