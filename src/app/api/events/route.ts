import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getCurrentUser } from '@/lib/auth';
import { supabaseAdmin } from '@/lib/supabaseAdmin';
import { uploadImage } from '@/lib/storage';
import { generateRecurringDates } from '@/utils/recurrence';
import { transformEvent, eventListInclude } from '@/utils/eventTransform';

// GET /api/events - Get all events (with filters)
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const status = searchParams.get('status') || 'approved';
    const date = searchParams.get('date');
    const category = searchParams.get('category');
    const venueId = searchParams.get('venueId');
    const featured = searchParams.get('featured');
    const fromDate = searchParams.get('fromDate');
    const toDate = searchParams.get('toDate');
    const search = searchParams.get('search');
    const sort = searchParams.get('sort'); // date | venue
    // Pagination (optional). Defaults cap result size to protect the DB.
    // NOTE: results are sorted oldest-first by date, so a cap that's too low relative
    // to the total number of approved events (including past ones that are never
    // deleted) will silently exclude the newest/future events from the response —
    // they'd always sort past the cutoff. Keep this comfortably above the real
    // approved-event count; see EventsContext.refreshEvents() which fetches the
    // full list for the shared events feed used across the app.
    const DEFAULT_LIMIT = 250;
    const MAX_LIMIT = 1000;
    const rawLimit = parseInt(searchParams.get('limit') || `${DEFAULT_LIMIT}`, 10);
    const limit = Number.isFinite(rawLimit) ? Math.min(Math.max(rawLimit, 1), MAX_LIMIT) : DEFAULT_LIMIT;
    const rawPage = parseInt(searchParams.get('page') || '1', 10);
    const page = Number.isFinite(rawPage) && rawPage > 0 ? rawPage : 1;
    const skip = (page - 1) * limit;

    const where: Record<string, unknown> = {};
    
    // Only show pending events to admins
    if (status === 'pending') {
      const user = await getCurrentUser();
      if (!user || user.role !== 'admin') {
        return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
      }
      where.status = 'pending';
    } else if (status === 'all') {
      // Admin-only: no status filter
      const user = await getCurrentUser();
      if (!user || user.role !== 'admin') {
        return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
      }
    } else {
      // Only show approved events (exclude cancelled, rejected, pending)
      where.status = 'approved';
    }

    if (date) {
      where.date = date;
    }

    if (fromDate || toDate) {
      where.date = {
        ...(fromDate ? { gte: fromDate } : {}),
        ...(toDate ? { lte: toDate } : {}),
      };
    }

    if (venueId) {
      where.venueId = venueId;
    }

    if (featured === 'true') {
      where.featured = true;
    }

    if (category) {
      where.categories = {
        some: { name: category },
      };
    }

    if (search) {
      where.OR = [
        { title: { contains: search, mode: 'insensitive' } },
        { venue: { name: { contains: search, mode: 'insensitive' } } },
      ];
    }

    // When sorting by date (the default), query newest-first so that if the result set
    // ever exceeds `limit`, the rows dropped by `take` are the OLDEST ones — not the
    // newest/future ones. We then reverse back to ascending order below so the response
    // shape (soonest-first) matches what callers already expect.
    const orderBy =
      sort === 'venue'
        ? [{ venue: { name: 'asc' as const } }, { date: 'asc' as const }, { startTime: 'asc' as const }]
        : [{ date: 'desc' as const }, { startTime: 'desc' as const }];

    const eventsQueried = await prisma.event.findMany({
      where,
      include: eventListInclude,
      orderBy,
      take: limit,
      skip,
    });

    const events = sort === 'venue' ? eventsQueried : eventsQueried.reverse();

    // For pending events, fetch submitter information from Supabase profiles
    let submitterMap: Record<string, { name: string; role: 'user' | 'organizer' | 'admin' }> = {};
    if (status === 'pending') {
      const submittedByIds = [...new Set(events.map(e => e.submittedById).filter(Boolean) as string[])];
      
      if (submittedByIds.length > 0) {
        const { data: profiles, error: profilesError } = await supabaseAdmin
          .from('profiles')
          .select('id, name, role')
          .in('id', submittedByIds);
        
        if (profilesError) {
          console.error('[API] Error fetching profiles:', profilesError);
        } else if (profiles && profiles.length > 0) {
          submitterMap = (profiles as Array<{ id: string; name: string | null; role: string | null }>).reduce((acc, profile) => {
            acc[profile.id] = {
              name: profile.name || 'Unknown User',
              role: (profile.role as 'user' | 'organizer' | 'admin') || 'user',
            };
            return acc;
          }, {} as Record<string, { name: string; role: 'user' | 'organizer' | 'admin' }>);
        }
      }
    }

    const transformedEvents = events.map((event) => {
      const baseEvent = transformEvent(event, { stripDataUrls: true });
      
      if (status === 'pending' && event.submittedById && submitterMap[event.submittedById]) {
        return {
          ...baseEvent,
          submitterName: submitterMap[event.submittedById].name,
          submitterRole: submitterMap[event.submittedById].role,
        };
      }
      
      return baseEvent;
    });

    const res = NextResponse.json({ events: transformedEvents });
    if (status !== 'pending' && status !== 'all') {
      res.headers.set('Cache-Control', 'public, s-maxage=60, stale-while-revalidate=300');
    }
    return res;
  } catch (error) {
    console.error('Get events error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch events' },
      { status: 500 }
    );
  }
}

// POST /api/events - Create a new event
export async function POST(request: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }
    const body = await request.json();

    const {
      title,
      description,
      date,
      startTime,
      endTime,
      venueId,
      newVenueName,
      newVenueAddress,
      categories,
      price,
      ticketUrl,
      imageUrl,
      isRecurring,
      recurrencePattern,
      recurrenceEndDate,
      recurrenceDays,
      isAllDay,
    } = body;

    // Validate required fields
    if (!title || !description || !date || !startTime || !categories?.length) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    // Handle venue - create new if needed, but check for duplicates first
    let finalVenueId = venueId;
    if (venueId === 'new' && newVenueName && newVenueAddress) {
      const allVenues = await prisma.venue.findMany();
      const existingVenue = allVenues.find(
        v => v.name.toLowerCase() === newVenueName.toLowerCase()
      );

      if (existingVenue) {
        finalVenueId = existingVenue.id;
      } else {
        const venueStatus = user?.role === 'admin' ? 'approved' : 'pending';
        const newVenue = await prisma.venue.create({
          data: {
            name: newVenueName,
            address: newVenueAddress,
            status: venueStatus,
          },
        });
        finalVenueId = newVenue.id;
      }
    }

    if (!finalVenueId || finalVenueId === 'new') {
      return NextResponse.json(
        { error: 'Venue is required' },
        { status: 400 }
      );
    }

    const status = user.role === 'admin' ? 'approved' : 'pending';
    const allDay = Boolean(isAllDay) || (startTime === '00:00' && !endTime);

    // Resolve recurrence days
    const resolvedDays: number[] =
      Array.isArray(recurrenceDays) && recurrenceDays.length > 0
        ? recurrenceDays.map((d: number) => Number(d))
        : [new Date(date + 'T12:00:00').getDay()];

    const eventDates =
      isRecurring && recurrencePattern
        ? generateRecurringDates(date, recurrencePattern, recurrenceEndDate, resolvedDays)
        : [date];

    // Food & drink specials do not use images
    const isFoodDeal = (categories as string[]).includes('food-deal');
    let finalImageUrl: string | null = null;
    if (!isFoodDeal) {
      finalImageUrl = imageUrl || null;
      if (imageUrl && imageUrl.startsWith('data:')) {
        const tempId = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
        finalImageUrl = await uploadImage(imageUrl, tempId);
      }
    }

    let seriesId: string | null = null;

    if (isRecurring && recurrencePattern && eventDates.length >= 1) {
      const series = await prisma.eventSeries.create({
        data: {
          title,
          description,
          startTime: allDay ? '00:00' : startTime,
          endTime: allDay ? null : endTime || null,
          price: price || null,
          ticketUrl: ticketUrl || null,
          imageUrl: finalImageUrl,
          isAllDay: allDay,
          status,
          recurrencePattern,
          recurrenceDays: resolvedDays,
          seriesStartDate: eventDates[0],
          seriesEndDate: recurrenceEndDate || null,
          venueId: finalVenueId,
          submittedById: user.id,
          categories: {
            create: categories.map((name: string) => ({ name })),
          },
        },
      });
      seriesId = series.id;
    }

    // Create all occurrence rows
    let firstEvent = null;
    for (let i = 0; i < eventDates.length; i++) {
      const eventDate = eventDates[i];
      const created = await prisma.event.create({
        data: {
          title,
          description,
          date: eventDate,
          startTime: allDay ? '00:00' : startTime,
          endTime: allDay ? null : endTime || null,
          venueId: finalVenueId,
          price: price || null,
          ticketUrl: ticketUrl || null,
          imageUrl: finalImageUrl,
          status,
          isAllDay: allDay,
          submittedById: user.id,
          seriesId,
          categories: {
            create: categories.map((name: string) => ({ name })),
          },
        },
        include: eventListInclude,
      });
      if (i === 0) firstEvent = created;
    }

    if (!firstEvent) {
      return NextResponse.json({ error: 'Failed to create event' }, { status: 500 });
    }

    console.log('[API] Event created:', firstEvent.id, 'seriesId:', seriesId, 'status:', firstEvent.status);

    return NextResponse.json({
      event: transformEvent(firstEvent),
      totalCreated: eventDates.length,
      seriesId,
    });
  } catch (error) {
    console.error('[API] Create event error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    const errorStack = error instanceof Error ? error.stack : undefined;
    return NextResponse.json(
      { 
        error: errorMessage || 'Failed to create event',
        details: process.env.NODE_ENV === 'development' ? errorStack : undefined
      },
      { status: 500 }
    );
  }
}
