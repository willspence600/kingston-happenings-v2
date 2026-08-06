import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getCurrentUser } from '@/lib/auth';
import { generateExtendedDates } from '@/utils/recurrence';

/**
 * PATCH /api/events/[id]/series
 * Extend (or update) the recurrence end date for the series this event belongs to.
 * Body: { newEndDate: string }  // YYYY-MM-DD
 */
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
    const body = await request.json();
    const { newEndDate } = body;

    if (!newEndDate || typeof newEndDate !== 'string') {
      return NextResponse.json({ error: 'newEndDate is required (YYYY-MM-DD)' }, { status: 400 });
    }

    const event = await prisma.event.findUnique({
      where: { id },
      include: {
        series: {
          include: { categories: true },
        },
      },
    });

    if (!event) {
      return NextResponse.json({ error: 'Event not found' }, { status: 404 });
    }
    if (user.role !== 'admin' && event.submittedById !== user.id) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }
    if (!event.seriesId || !event.series) {
      return NextResponse.json({ error: 'Event is not part of a recurring series' }, { status: 400 });
    }

    const series = event.series;

    // Find last existing occurrence date
    const lastOccurrence = await prisma.event.findFirst({
      where: { seriesId: series.id },
      orderBy: { date: 'desc' },
      select: { date: true },
    });
    const lastDate = lastOccurrence?.date || series.seriesStartDate;

    if (newEndDate <= lastDate) {
      // Just trim the end date — no new rows needed
      await prisma.eventSeries.update({
        where: { id: series.id },
        data: { seriesEndDate: newEndDate },
      });
      // Optionally delete occurrences beyond newEndDate
      const deleted = await prisma.event.deleteMany({
        where: {
          seriesId: series.id,
          date: { gt: newEndDate },
          detachedFromSeries: false,
        },
      });
      return NextResponse.json({
        success: true,
        seriesEndDate: newEndDate,
        created: 0,
        deleted: deleted.count,
      });
    }

    const newDates = generateExtendedDates(
      series.seriesStartDate,
      series.recurrencePattern,
      newEndDate,
      series.recurrenceDays,
      lastDate
    );

    const categoryNames = series.categories.map((c) => c.name);

    for (const date of newDates) {
      await prisma.event.create({
        data: {
          title: series.title,
          description: series.description,
          date,
          startTime: series.startTime,
          endTime: series.endTime,
          price: series.price,
          ticketUrl: series.ticketUrl,
          imageUrl: series.imageUrl,
          isAllDay: series.isAllDay,
          status: series.status === 'pending' ? 'pending' : 'approved',
          venueId: series.venueId,
          submittedById: series.submittedById,
          seriesId: series.id,
          categories: {
            create: categoryNames.map((name) => ({ name })),
          },
        },
      });
    }

    await prisma.eventSeries.update({
      where: { id: series.id },
      data: { seriesEndDate: newEndDate },
    });

    return NextResponse.json({
      success: true,
      seriesEndDate: newEndDate,
      created: newDates.length,
      deleted: 0,
    });
  } catch (error) {
    console.error('Extend series error:', error);
    return NextResponse.json(
      { error: 'Failed to extend series' },
      { status: 500 }
    );
  }
}
