-- AlterTable: Venue cover photo
ALTER TABLE "Venue" ADD COLUMN IF NOT EXISTS "coverImageUrl" TEXT;

-- CreateTable: EventSeries
CREATE TABLE IF NOT EXISTS "EventSeries" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "startTime" TEXT NOT NULL,
    "endTime" TEXT,
    "price" TEXT,
    "ticketUrl" TEXT,
    "imageUrl" TEXT,
    "isAllDay" BOOLEAN NOT NULL DEFAULT false,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "recurrencePattern" TEXT NOT NULL,
    "recurrenceDays" INTEGER[],
    "seriesStartDate" TEXT NOT NULL,
    "seriesEndDate" TEXT,
    "venueId" TEXT NOT NULL,
    "submittedById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "EventSeries_pkey" PRIMARY KEY ("id")
);

-- CreateTable: EventSeriesCategory
CREATE TABLE IF NOT EXISTS "EventSeriesCategory" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "seriesId" TEXT NOT NULL,

    CONSTRAINT "EventSeriesCategory_pkey" PRIMARY KEY ("id")
);

-- AlterTable: Event — add new columns before dropping old ones
ALTER TABLE "Event" ADD COLUMN IF NOT EXISTS "isAllDay" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "Event" ADD COLUMN IF NOT EXISTS "seriesId" TEXT;
ALTER TABLE "Event" ADD COLUMN IF NOT EXISTS "detachedFromSeries" BOOLEAN NOT NULL DEFAULT false;

-- Backfill isAllDay from convention (startTime = 00:00 and no endTime)
UPDATE "Event"
SET "isAllDay" = true
WHERE "startTime" = '00:00' AND ("endTime" IS NULL OR "endTime" = '');

-- Backfill EventSeries from existing parent/child recurrence groups
-- Parents: isRecurring = true AND parentEventId IS NULL
INSERT INTO "EventSeries" (
  "id", "title", "description", "startTime", "endTime", "price", "ticketUrl", "imageUrl",
  "isAllDay", "status", "recurrencePattern", "recurrenceDays", "seriesStartDate", "seriesEndDate",
  "venueId", "submittedById", "createdAt", "updatedAt"
)
SELECT
  e."id" || '_series',
  e."title",
  e."description",
  e."startTime",
  e."endTime",
  e."price",
  e."ticketUrl",
  e."imageUrl",
  e."isAllDay",
  CASE WHEN e."status" = 'cancelled' THEN 'approved' ELSE e."status" END,
  COALESCE(e."recurrencePattern", 'weekly'),
  CASE
    WHEN e."recurrenceDay" IS NOT NULL THEN ARRAY[e."recurrenceDay"]
    ELSE ARRAY[EXTRACT(DOW FROM (e."date" || 'T12:00:00')::timestamp)::integer]
  END,
  e."date",
  e."recurrenceEndDate",
  e."venueId",
  e."submittedById",
  e."createdAt",
  NOW()
FROM "Event" e
WHERE e."isRecurring" = true
  AND e."parentEventId" IS NULL
  AND NOT EXISTS (
    SELECT 1 FROM "EventSeries" s WHERE s."id" = e."id" || '_series'
  );

-- Copy categories onto series
INSERT INTO "EventSeriesCategory" ("id", "name", "seriesId")
SELECT
  e."id" || '_cat_' || ec."name",
  ec."name",
  e."id" || '_series'
FROM "Event" e
JOIN "EventCategory" ec ON ec."eventId" = e."id"
WHERE e."isRecurring" = true
  AND e."parentEventId" IS NULL
  AND NOT EXISTS (
    SELECT 1 FROM "EventSeriesCategory" esc
    WHERE esc."seriesId" = e."id" || '_series' AND esc."name" = ec."name"
  );

-- Link parent events to their series
UPDATE "Event" e
SET "seriesId" = e."id" || '_series'
WHERE e."isRecurring" = true
  AND e."parentEventId" IS NULL
  AND EXISTS (SELECT 1 FROM "EventSeries" s WHERE s."id" = e."id" || '_series');

-- Link child events to their parent's series
UPDATE "Event" child
SET "seriesId" = child."parentEventId" || '_series'
WHERE child."parentEventId" IS NOT NULL
  AND EXISTS (SELECT 1 FROM "EventSeries" s WHERE s."id" = child."parentEventId" || '_series');

-- CreateIndex
CREATE UNIQUE INDEX IF NOT EXISTS "EventSeriesCategory_seriesId_name_key" ON "EventSeriesCategory"("seriesId", "name");
CREATE INDEX IF NOT EXISTS "Event_seriesId_idx" ON "Event"("seriesId");

-- AddForeignKey
DO $$ BEGIN
  ALTER TABLE "EventSeries" ADD CONSTRAINT "EventSeries_venueId_fkey"
    FOREIGN KEY ("venueId") REFERENCES "Venue"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE "EventSeriesCategory" ADD CONSTRAINT "EventSeriesCategory_seriesId_fkey"
    FOREIGN KEY ("seriesId") REFERENCES "EventSeries"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE "Event" ADD CONSTRAINT "Event_seriesId_fkey"
    FOREIGN KEY ("seriesId") REFERENCES "EventSeries"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- Drop old recurrence columns from Event
ALTER TABLE "Event" DROP COLUMN IF EXISTS "isRecurring";
ALTER TABLE "Event" DROP COLUMN IF EXISTS "recurrencePattern";
ALTER TABLE "Event" DROP COLUMN IF EXISTS "recurrenceDay";
ALTER TABLE "Event" DROP COLUMN IF EXISTS "recurrenceEndDate";
ALTER TABLE "Event" DROP COLUMN IF EXISTS "parentEventId";
