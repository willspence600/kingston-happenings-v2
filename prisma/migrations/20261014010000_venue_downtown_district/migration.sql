-- AlterTable: Downtown Kingston business district flag (admin-toggled, shows the DK logo)
ALTER TABLE "Venue" ADD COLUMN IF NOT EXISTS "isDowntownDistrict" BOOLEAN NOT NULL DEFAULT false;

-- Keep current behaviour: venues already in a "Downtown" neighbourhood start flagged
UPDATE "Venue" SET "isDowntownDistrict" = true WHERE "neighborhood" ILIKE '%downtown%';
