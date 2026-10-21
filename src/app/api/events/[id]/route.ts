import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getCurrentUser, canAutoPublish } from '@/lib/auth';
import { uploadImage } from '@/lib/storage';
import { transformEvent, eventListInclude } from '@/utils/eventTransform';
import { generateRecurringDates } from '@/utils/recurrence';
import { describeChanges, notifyVenueOrganizers } from '@/lib/venueNotices';

// GET /api/events/[id] - Get a single event
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    const event = await prisma.event.findUnique({
      where: { id },
      include: eventListInclude,
    });

    if (!event) {
      return NextResponse.json(
        { error: 'Event not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      event: transformEvent(event),
    });
  } catch (error) {
    console.error('Get event error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch event' },
      { status: 500 }
    );
  }
}

// Fields a PATCH may set directly on Event rows
const EDITABLE_FIELDS = ['title', 'description', 'date', 'startTime', 'endTime', 'price', 'ticketUrl'] as const;

const NOTICE_FIELDS: Record<string, string> = {
  title: 'Title',
  description: 'Description',
  date: 'Date',
  startTime: 'Start time',
  endTime: 'End time',
  isAllDay: 'All day',
  price: 'Price',
  ticketUrl: 'Ticket link',
  categories: 'Categories',
  imageUrl: 'Photo',
};

// PATCH /api/events/[id] - Update an event (admin or submitter)
// Query: ?scope=this|future  (default: this)
// With scope=future on a recurring listing, recurrencePattern / recurrenceDays /
// recurrenceEndDate (or a new date) regenerate the series: dates that no longer fit are
// removed and missing ones are added.
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;
    const scope = request.nextUrl.searchParams.get('scope') || 'this';
    const isAdmin = user.role === 'admin';

    const existing = await prisma.event.findUnique({
      where: { id },
      include: {
        categories: { select: { name: true } },
        series: true,
        venue: { select: { id: true, name: true } },
      },
    });
    if (!existing) {
      return NextResponse.json({ error: 'Event not found' }, { status: 404 });
    }
    if (!isAdmin && existing.submittedById !== user.id) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const body = await request.json();
    const {
      categories,
      imageUrl,
      venueId,
      newVenueName,
      newVenueAddress,
      isAllDay,
      recurrencePattern,
      recurrenceDays,
      recurrenceEndDate,
      hiddenFromPromotion,
    } = body;

    const eventData: Record<string, unknown> = {};
    for (const key of EDITABLE_FIELDS) {
      if (body[key] !== undefined) eventData[key] = body[key] === '' && key !== 'title' && key !== 'description' ? null : body[key];
    }

    const isFoodDeal =
      (categories as string[] | undefined)?.includes('food-deal') ||
      existing.categories.some((c) => c.name === 'food-deal');

    let finalImageUrl: string | null | undefined = imageUrl;
    if (isFoodDeal) {
      finalImageUrl = null;
    } else if (imageUrl && typeof imageUrl === 'string' && imageUrl.startsWith('data:')) {
      finalImageUrl = await uploadImage(imageUrl, id);
    }

    let finalVenueId = venueId as string | undefined;
    if (finalVenueId === 'new') {
      if (!newVenueName || !newVenueAddress) {
        return NextResponse.json(
          { error: 'New venue name and address are required' },
          { status: 400 }
        );
      }

      const allVenues = await prisma.venue.findMany();
      const existingVenue = allVenues.find(
        (venue) => venue.name.toLowerCase() === String(newVenueName).toLowerCase()
      );

      if (existingVenue) {
        finalVenueId = existingVenue.id;
      } else {
        const newVenue = await prisma.venue.create({
          data: {
            name: String(newVenueName),
            address: String(newVenueAddress),
            status: isAdmin ? 'approved' : 'pending',
          },
        });
        finalVenueId = newVenue.id;
      }
    }

    const allDay =
      isAllDay !== undefined
        ? Boolean(isAllDay)
        : eventData.startTime === '00:00' && !eventData.endTime
          ? true
          : undefined;

    const updateFields: Record<string, unknown> = {
      ...eventData,
      ...(finalVenueId ? { venueId: finalVenueId } : {}),
      ...(finalImageUrl !== undefined ? { imageUrl: finalImageUrl } : {}),
      ...(allDay !== undefined ? { isAllDay: allDay } : {}),
      ...(allDay === true ? { startTime: '00:00', endTime: null } : {}),
      ...(isAdmin && typeof hiddenFromPromotion === 'boolean' ? { hiddenFromPromotion } : {}),
    };

    // Admin edits keep the listing's status (a pending listing still needs approving).
    // Verified organizers publish edits immediately; everyone else goes back into the
    // admin review queue.
    if (!isAdmin && existing.status !== 'cancelled') {
      updateFields.status = canAutoPublish(user) ? 'approved' : 'pending';
      updateFields.rejectionReason = null;
    }
    updateFields.lastEditedAt = new Date();

    const categoryWrite = categories
      ? {
          categories: {
            deleteMany: {},
            create: (categories as string[]).map((name: string) => ({ name })),
          },
        }
      : {};

    // Let the venue's organizers know when an admin changes a live listing
    const notify = async (updatedTitle: string, venueIdForNotice: string, when: string) => {
      if (!isAdmin || existing.status !== 'approved') return;
      const before: Record<string, unknown> = { ...existing, categories: existing.categories.map((c) => c.name).sort() };
      const after: Record<string, unknown> = { ...updateFields, ...(categories ? { categories: [...(categories as string[])].sort() } : {}) };
      if (scope === 'future') delete after.date;
      const changes = describeChanges(before, after, NOTICE_FIELDS, ['description', 'imageUrl']);
      if (finalVenueId && finalVenueId !== existing.venueId) changes.push('Moved to a different venue');
      if (changes.length === 0) return;
      const venue = await prisma.venue.findUnique({ where: { id: venueIdForNotice }, select: { name: true } });
      await notifyVenueOrganizers(venueIdForNotice, venue?.name || existing.venue.name, `An admin updated “${updatedTitle}” (${when})`, changes);
    };

    if (scope === 'future' && existing.seriesId && existing.series) {
      const series = existing.series;
      const occurrenceFields = { ...updateFields };
      delete occurrenceFields.date;

      // Update series canonical fields
      const seriesUpdate: Record<string, unknown> = {};
      for (const key of ['title', 'description', 'startTime', 'endTime', 'price', 'ticketUrl', 'isAllDay', 'venueId', 'status', 'rejectionReason', 'hiddenFromPromotion']) {
        if (updateFields[key] !== undefined) seriesUpdate[key] = updateFields[key];
      }
      if (finalImageUrl !== undefined) seriesUpdate.imageUrl = finalImageUrl;

      // Recurrence changes (or moving the first date) regenerate the dates from here on
      const newStart = typeof eventData.date === 'string' && eventData.date ? eventData.date : existing.date;
      const pattern = typeof recurrencePattern === 'string' && recurrencePattern ? recurrencePattern : series.recurrencePattern;
      const days =
        Array.isArray(recurrenceDays) && recurrenceDays.length > 0
          ? [...new Set((recurrenceDays as unknown[]).map(Number).filter((d) => d >= 0 && d <= 6))].sort()
          : series.recurrenceDays;
      const endDate = recurrenceEndDate !== undefined ? (recurrenceEndDate || null) : series.seriesEndDate;
      const recurrenceChanged =
        newStart !== existing.date ||
        pattern !== series.recurrencePattern ||
        JSON.stringify(days) !== JSON.stringify([...series.recurrenceDays].sort()) ||
        endDate !== series.seriesEndDate;

      if (recurrenceChanged) {
        seriesUpdate.recurrencePattern = pattern;
        seriesUpdate.recurrenceDays = days;
        seriesUpdate.seriesEndDate = endDate;
        if (existing.date <= series.seriesStartDate) seriesUpdate.seriesStartDate = newStart;
      }

      const updatedSeries = await prisma.eventSeries.update({
        where: { id: series.id },
        data: {
          ...seriesUpdate,
          ...(categories
            ? {
                categories: {
                  deleteMany: {},
                  create: (categories as string[]).map((name) => ({ name })),
                },
              }
            : {}),
        },
        include: { categories: true },
      });

      const fromDate = newStart < existing.date ? newStart : existing.date;
      const futureEvents = await prisma.event.findMany({
        where: { seriesId: series.id, date: { gte: fromDate }, detachedFromSeries: false },
        select: { id: true, date: true },
      });

      let removed = 0;
      let created = 0;
      let keep = futureEvents;
      if (recurrenceChanged) {
        const wanted = new Set(generateRecurringDates(newStart, pattern, endDate, days));
        const drop = futureEvents.filter((e) => !wanted.has(e.date));
        if (drop.length > 0) {
          const res = await prisma.event.deleteMany({ where: { id: { in: drop.map((e) => e.id) } } });
          removed = res.count;
        }
        keep = futureEvents.filter((e) => wanted.has(e.date));

        // Add the dates that aren't there yet (a date edited on its own is left alone)
        const taken = new Set(
          (await prisma.event.findMany({ where: { seriesId: series.id }, select: { date: true } })).map((e) => e.date)
        );
        for (const date of [...wanted].filter((d) => !taken.has(d)).sort()) {
          await prisma.event.create({
            data: {
              title: updatedSeries.title,
              description: updatedSeries.description,
              date,
              startTime: updatedSeries.startTime,
              endTime: updatedSeries.endTime,
              price: updatedSeries.price,
              ticketUrl: updatedSeries.ticketUrl,
              imageUrl: updatedSeries.imageUrl,
              isAllDay: updatedSeries.isAllDay,
              status: (updateFields.status as string | undefined) ?? existing.status,
              rejectionReason: updateFields.rejectionReason === null ? null : existing.rejectionReason,
              hiddenFromPromotion: updatedSeries.hiddenFromPromotion,
              venueId: updatedSeries.venueId,
              submittedById: updatedSeries.submittedById,
              seriesId: series.id,
              lastEditedAt: new Date(),
              categories: { create: updatedSeries.categories.map((c) => ({ name: c.name })) },
            },
          });
          created++;
        }
      }

      // Bulk-update the remaining non-detached occurrences
      for (const fe of keep) {
        await prisma.event.update({
          where: { id: fe.id },
          data: { ...occurrenceFields, ...categoryWrite },
        });
      }

      // The edited date may have been replaced; return the series' first occurrence from here on
      const event =
        (await prisma.event.findUnique({ where: { id }, include: eventListInclude })) ??
        (await prisma.event.findFirst({
          where: { seriesId: series.id, date: { gte: fromDate } },
          orderBy: { date: 'asc' },
          include: eventListInclude,
        }));

      await notify(
        updatedSeries.title,
        updatedSeries.venueId,
        recurrenceChanged ? 'dates updated' : 'this and future dates'
      );
      if (recurrenceChanged && isAdmin && existing.status === 'approved') {
        await notifyVenueOrganizers(
          updatedSeries.venueId,
          existing.venue.name,
          `An admin changed the schedule for “${updatedSeries.title}”`,
          [`${created} date${created === 1 ? '' : 's'} added, ${removed} removed`]
        );
      }

      return NextResponse.json({
        event: event ? transformEvent(event) : null,
        updatedCount: keep.length,
        created,
        removed,
        scope: 'future',
      });
    }

    // scope === 'this' (default): update single row; detach from series if recurring
    const event = await prisma.event.update({
      where: { id },
      data: {
        ...updateFields,
        ...(existing.seriesId ? { detachedFromSeries: true } : {}),
        ...categoryWrite,
      },
      include: eventListInclude,
    });

    await notify(event.title, event.venueId, event.date);

    return NextResponse.json({
      event: transformEvent(event),
      scope: 'this',
    });
  } catch (error) {
    console.error('Update event error:', error);
    return NextResponse.json(
      { error: 'Failed to update event' },
      { status: 500 }
    );
  }
}

// DELETE /api/events/[id] - Delete an event (admin or submitter)
// Query: ?scope=this|future  (default: this)
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;
    const scope = request.nextUrl.searchParams.get('scope') || 'this';

    const existing = await prisma.event.findUnique({
      where: { id },
      select: {
        submittedById: true,
        seriesId: true,
        date: true,
      },
    });
    if (!existing) {
      return NextResponse.json({ error: 'Event not found' }, { status: 404 });
    }
    if (user.role !== 'admin' && existing.submittedById !== user.id) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    if (scope === 'future' && existing.seriesId) {
      // Find earliest occurrence in series
      const earliest = await prisma.event.findFirst({
        where: { seriesId: existing.seriesId },
        orderBy: { date: 'asc' },
        select: { id: true, date: true },
      });

      const isFirst = earliest?.id === id || earliest?.date === existing.date;

      if (isFirst) {
        // Deleting from the start → delete whole series (cascade deletes occurrences)
        await prisma.eventSeries.delete({ where: { id: existing.seriesId } });
        return NextResponse.json({ success: true, scope: 'future', deletedSeries: true });
      }

      // Delete this + future non-detached occurrences
      const result = await prisma.event.deleteMany({
        where: {
          seriesId: existing.seriesId,
          date: { gte: existing.date },
          detachedFromSeries: false,
        },
      });

      // Trim series end date to day before this occurrence
      const dayBefore = new Date(existing.date + 'T12:00:00');
      dayBefore.setDate(dayBefore.getDate() - 1);
      const trimmedEnd = dayBefore.toISOString().split('T')[0];

      await prisma.eventSeries.update({
        where: { id: existing.seriesId },
        data: { seriesEndDate: trimmedEnd },
      });

      return NextResponse.json({
        success: true,
        scope: 'future',
        deletedCount: result.count,
      });
    }

    // scope === 'this'
    await prisma.event.delete({ where: { id } });

    return NextResponse.json({ success: true, scope: 'this' });
  } catch (error) {
    console.error('Delete event error:', error);
    return NextResponse.json(
      { error: 'Failed to delete event' },
      { status: 500 }
    );
  }
}
