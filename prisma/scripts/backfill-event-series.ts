/**
 * One-time backfill: convert parentEventId-linked recurring events into EventSeries rows.
 *
 * Prefer running the SQL migration (20260804190000_event_series_and_media) which
 * includes an inline backfill. Use this script only if you need to re-run backfill
 * against a DB that already has the new columns but still has old recurrence data.
 *
 * Usage: npx tsx prisma/scripts/backfill-event-series.ts
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  // Check if old columns still exist by raw query
  const columns: Array<{ column_name: string }> = await prisma.$queryRaw`
    SELECT column_name FROM information_schema.columns
    WHERE table_name = 'Event' AND column_name = 'parentEventId'
  `;

  if (columns.length === 0) {
    console.log('Old recurrence columns already dropped — nothing to backfill.');
    return;
  }

  const parents: Array<{
    id: string;
    title: string;
    description: string;
    startTime: string;
    endTime: string | null;
    price: string | null;
    ticketUrl: string | null;
    imageUrl: string | null;
    isAllDay: boolean;
    status: string;
    recurrencePattern: string | null;
    recurrenceDay: number | null;
    recurrenceEndDate: string | null;
    date: string;
    venueId: string;
    submittedById: string | null;
    createdAt: Date;
  }> = await prisma.$queryRaw`
    SELECT id, title, description, "startTime", "endTime", price, "ticketUrl", "imageUrl",
           "isAllDay", status, "recurrencePattern", "recurrenceDay", "recurrenceEndDate",
           date, "venueId", "submittedById", "createdAt"
    FROM "Event"
    WHERE "isRecurring" = true AND "parentEventId" IS NULL
  `;

  console.log(`Found ${parents.length} recurring parent events to convert.`);

  for (const parent of parents) {
    const seriesId = `${parent.id}_series`;
    const existing = await prisma.eventSeries.findUnique({ where: { id: seriesId } });
    if (existing) {
      console.log(`  Series already exists for ${parent.id}, skipping create.`);
    } else {
      const categories: Array<{ name: string }> = await prisma.$queryRaw`
        SELECT name FROM "EventCategory" WHERE "eventId" = ${parent.id}
      `;

      await prisma.eventSeries.create({
        data: {
          id: seriesId,
          title: parent.title,
          description: parent.description,
          startTime: parent.startTime,
          endTime: parent.endTime,
          price: parent.price,
          ticketUrl: parent.ticketUrl,
          imageUrl: parent.imageUrl,
          isAllDay: parent.isAllDay,
          status: parent.status === 'cancelled' ? 'approved' : parent.status,
          recurrencePattern: parent.recurrencePattern || 'weekly',
          recurrenceDays:
            parent.recurrenceDay != null
              ? [parent.recurrenceDay]
              : [new Date(parent.date + 'T12:00:00').getDay()],
          seriesStartDate: parent.date,
          seriesEndDate: parent.recurrenceEndDate,
          venueId: parent.venueId,
          submittedById: parent.submittedById,
          createdAt: parent.createdAt,
          categories: {
            create: categories.map((c) => ({ name: c.name })),
          },
        },
      });
      console.log(`  Created series ${seriesId}`);
    }

    // Link parent + children
    await prisma.$executeRaw`
      UPDATE "Event" SET "seriesId" = ${seriesId}
      WHERE id = ${parent.id} OR "parentEventId" = ${parent.id}
    `;
  }

  console.log('Backfill complete.');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
