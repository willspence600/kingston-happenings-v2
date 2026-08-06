import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getCurrentUser } from '@/lib/auth';
import { uploadImage } from '@/lib/storage';
import { transformEvent, eventListInclude } from '@/utils/eventTransform';

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

// PATCH /api/events/[id] - Update an event (admin or submitter)
// Query: ?scope=this|future  (default: this)
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

    const existing = await prisma.event.findUnique({
      where: { id },
      include: {
        categories: { select: { name: true } },
        series: true,
      },
    });
    if (!existing) {
      return NextResponse.json({ error: 'Event not found' }, { status: 404 });
    }
    if (user.role !== 'admin' && existing.submittedById !== user.id) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const body = await request.json();
    const { categories, imageUrl, venueId, newVenueName, newVenueAddress, isAllDay, ...eventData } = body;

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
            status: user.role === 'admin' ? 'approved' : 'pending',
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
    };

    // Remove fields that shouldn't be spread onto Event
    delete updateFields.scope;
    delete updateFields.recurrenceDays;
    delete updateFields.recurrencePattern;
    delete updateFields.recurrenceEndDate;
    delete updateFields.isRecurring;
    delete updateFields.newEndDate;

    if (scope === 'future' && existing.seriesId) {
      // Update series canonical fields
      const seriesUpdate: Record<string, unknown> = {};
      if (updateFields.title !== undefined) seriesUpdate.title = updateFields.title;
      if (updateFields.description !== undefined) seriesUpdate.description = updateFields.description;
      if (updateFields.startTime !== undefined) seriesUpdate.startTime = updateFields.startTime;
      if (updateFields.endTime !== undefined) seriesUpdate.endTime = updateFields.endTime;
      if (updateFields.price !== undefined) seriesUpdate.price = updateFields.price;
      if (updateFields.ticketUrl !== undefined) seriesUpdate.ticketUrl = updateFields.ticketUrl;
      if (finalImageUrl !== undefined) seriesUpdate.imageUrl = finalImageUrl;
      if (allDay !== undefined) seriesUpdate.isAllDay = allDay;
      if (finalVenueId) seriesUpdate.venueId = finalVenueId;

      if (Object.keys(seriesUpdate).length > 0) {
        await prisma.eventSeries.update({
          where: { id: existing.seriesId },
          data: seriesUpdate,
        });
      }

      if (categories) {
        await prisma.eventSeriesCategory.deleteMany({ where: { seriesId: existing.seriesId } });
        await prisma.eventSeriesCategory.createMany({
          data: (categories as string[]).map((name) => ({
            seriesId: existing.seriesId!,
            name,
          })),
        });
      }

      // Bulk-update this + future non-detached occurrences
      const futureEvents = await prisma.event.findMany({
        where: {
          seriesId: existing.seriesId,
          date: { gte: existing.date },
          detachedFromSeries: false,
        },
        select: { id: true },
      });

      for (const fe of futureEvents) {
        await prisma.event.update({
          where: { id: fe.id },
          data: {
            ...updateFields,
            ...(categories
              ? {
                  categories: {
                    deleteMany: {},
                    create: (categories as string[]).map((name: string) => ({ name })),
                  },
                }
              : {}),
          },
        });
      }

      const event = await prisma.event.findUnique({
        where: { id },
        include: eventListInclude,
      });

      return NextResponse.json({
        event: event ? transformEvent(event) : null,
        updatedCount: futureEvents.length,
        scope: 'future',
      });
    }

    // scope === 'this' (default): update single row; detach from series if recurring
    const event = await prisma.event.update({
      where: { id },
      data: {
        ...updateFields,
        ...(existing.seriesId ? { detachedFromSeries: true } : {}),
        ...(categories
          ? {
              categories: {
                deleteMany: {},
                create: (categories as string[]).map((name: string) => ({ name })),
              },
            }
          : {}),
      },
      include: eventListInclude,
    });

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
