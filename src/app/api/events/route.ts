import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getCurrentUser } from '@/lib/auth';
import { supabaseAdmin } from '@/lib/supabaseAdmin';

// GET /api/events - Get all events (with filters)
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const status = searchParams.get('status') || 'approved';
    const date = searchParams.get('date');
    const category = searchParams.get('category');
    const venueId = searchParams.get('venueId');
    const featured = searchParams.get('featured');

    const where: Record<string, unknown> = {};
    
    // Only show pending events to admins
    if (status === 'pending') {
      const user = await getCurrentUser();
      if (!user || user.role !== 'admin') {
        return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
      }
      where.status = 'pending';
    } else {
      // Only show approved events (exclude cancelled, rejected, pending)
      where.status = 'approved';
    }

    if (date) {
      where.date = date;
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

    const events = await prisma.event.findMany({
      where,
      include: {
        venue: true,
        categories: true,
        _count: {
          select: { likes: true },
        },
      },
      orderBy: [
        { date: 'asc' },
        { startTime: 'asc' },
      ],
    });

    // For pending events, fetch submitter information from Supabase profiles
    let submitterMap: Record<string, { name: string; role: 'user' | 'organizer' | 'admin' }> = {};
    if (status === 'pending') {
      const submittedByIds = [...new Set(events.map(e => e.submittedById).filter(Boolean) as string[])];
      
      if (submittedByIds.length > 0) {
        console.log('[API] Fetching profiles for submitter IDs:', submittedByIds);
        const { data: profiles, error: profilesError } = await supabaseAdmin
          .from('profiles')
          .select('id, name, role')
          .in('id', submittedByIds);
        
        if (profilesError) {
          console.error('[API] Error fetching profiles:', profilesError);
        } else {
          console.log('[API] Fetched profiles:', profiles);
          if (profiles && profiles.length > 0) {
            submitterMap = (profiles as Array<{ id: string; name: string | null; role: string | null }>).reduce((acc, profile) => {
              acc[profile.id] = {
                name: profile.name || 'Unknown User',
                role: (profile.role as 'user' | 'organizer' | 'admin') || 'user',
              };
              return acc;
            }, {} as Record<string, { name: string; role: 'user' | 'organizer' | 'admin' }>);
            console.log('[API] Submitter map:', submitterMap);
          }
        }
      }
    }

    // Transform to match frontend format
    const transformedEvents = events.map((event) => {
      const baseEvent = {
        id: event.id,
        title: event.title,
        description: event.description,
        date: event.date,
        startTime: event.startTime,
        endTime: event.endTime,
        price: event.price,
        ticketUrl: event.ticketUrl,
        imageUrl: event.imageUrl,
        featured: event.featured,
        status: event.status,
        venue: event.venue,
        categories: event.categories.map((c) => c.name),
        likeCount: event._count.likes,
        isRecurring: event.isRecurring,
        recurrencePattern: event.recurrencePattern,
        recurrenceDay: event.recurrenceDay,
        recurrenceEndDate: event.recurrenceEndDate,
        parentEventId: event.parentEventId,
        submittedById: event.submittedById || undefined,
      };
      
      // Add submitter information for pending events
      if (status === 'pending' && event.submittedById && submitterMap[event.submittedById]) {
        return {
          ...baseEvent,
          submitterName: submitterMap[event.submittedById].name,
          submitterRole: submitterMap[event.submittedById].role,
        };
      }
      
      return baseEvent;
    });

    return NextResponse.json({ events: transformedEvents });
  } catch (error) {
    console.error('Get events error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch events' },
      { status: 500 }
    );
  }
}

// Helper function to generate recurring dates
function generateRecurringDates(
  startDate: string,
  pattern: string,
  endDate?: string
): string[] {
  const dates: string[] = [startDate];
  const start = new Date(startDate + 'T12:00:00');
  
  // Default to 52 weeks if no end date
  const maxWeeks = 52;
  const end = endDate 
    ? new Date(endDate + 'T12:00:00')
    : new Date(start.getTime() + maxWeeks * 7 * 24 * 60 * 60 * 1000);
  
  let current = new Date(start);
  
  while (current < end && dates.length < 100) { // Cap at 100 instances
    switch (pattern) {
      case 'weekly':
        current.setDate(current.getDate() + 7);
        break;
      case 'biweekly':
        current.setDate(current.getDate() + 14);
        break;
      case 'monthly':
        current.setMonth(current.getMonth() + 1);
        break;
      default:
        return dates;
    }
    
    if (current <= end) {
      const dateStr = current.toISOString().split('T')[0];
      dates.push(dateStr);
    }
  }
  
  return dates;
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
      // Check if venue with same name already exists (case-insensitive for SQLite)
      const allVenues = await prisma.venue.findMany();
      const existingVenue = allVenues.find(
        v => v.name.toLowerCase() === newVenueName.toLowerCase()
      );

      if (existingVenue) {
        // Use existing venue instead of creating duplicate
        finalVenueId = existingVenue.id;
      } else {
        // New venues require approval unless created by admin
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

    // Auto-approve if admin (trusted organizer check removed since we're using Supabase)
    // Note: submittedById will store the Supabase user ID (UUID), not Prisma User ID (CUID)
    // The relation to Prisma User will be null, but that's okay - we track by Supabase ID
    const status = user.role === 'admin' ? 'approved' : 'pending';

    // Generate dates for recurring events
    const eventDates = isRecurring && recurrencePattern
      ? generateRecurringDates(date, recurrencePattern, recurrenceEndDate)
      : [date];

    // Get the day of week from the start date
    const recurrenceDay = isRecurring ? new Date(date + 'T12:00:00').getDay() : null;

    // Create the first (parent) event
    console.log('[API] Creating event with submittedById:', user.id, 'status:', status);
    const parentEvent = await prisma.event.create({
      data: {
        title,
        description,
        date: eventDates[0],
        startTime,
        endTime,
        venueId: finalVenueId,
        price,
        ticketUrl,
        imageUrl,
        status,
        submittedById: user.id,
        isRecurring: isRecurring || false,
        recurrencePattern: isRecurring ? recurrencePattern : null,
        recurrenceDay,
        recurrenceEndDate: isRecurring ? recurrenceEndDate : null,
        categories: {
          create: categories.map((name: string) => ({ name })),
        },
      },
      include: {
        venue: true,
        categories: true,
      },
    });
    console.log('[API] Event created:', parentEvent.id, 'submittedById:', parentEvent.submittedById, 'status:', parentEvent.status);

    // Create additional events for recurring instances
    if (eventDates.length > 1) {
      const additionalDates = eventDates.slice(1);
      
      for (const eventDate of additionalDates) {
        await prisma.event.create({
          data: {
            title,
            description,
            date: eventDate,
            startTime,
            endTime,
            venueId: finalVenueId,
            price,
            ticketUrl,
            imageUrl,
            status,
            submittedById: user.id,
            isRecurring: true,
            recurrencePattern,
            recurrenceDay,
            recurrenceEndDate: isRecurring ? recurrenceEndDate : null,
            parentEventId: parentEvent.id,
            categories: {
              create: categories.map((name: string) => ({ name })),
            },
          },
        });
      }
    }

    // Transform event to match frontend format
    const transformedEvent = {
      id: parentEvent.id,
      title: parentEvent.title,
      description: parentEvent.description,
      date: parentEvent.date,
      startTime: parentEvent.startTime,
      endTime: parentEvent.endTime,
      price: parentEvent.price,
      ticketUrl: parentEvent.ticketUrl,
      imageUrl: parentEvent.imageUrl,
      featured: parentEvent.featured,
      status: parentEvent.status,
      submittedById: parentEvent.submittedById,
      venue: parentEvent.venue,
      categories: parentEvent.categories.map((c) => c.name),
      isRecurring: parentEvent.isRecurring,
      recurrencePattern: parentEvent.recurrencePattern,
      recurrenceDay: parentEvent.recurrenceDay,
      recurrenceEndDate: parentEvent.recurrenceEndDate,
      parentEventId: parentEvent.parentEventId,
    };

    return NextResponse.json({
      event: transformedEvent,
      totalCreated: eventDates.length,
    });
  } catch (error) {
    console.error('[API] Create event error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    const errorStack = error instanceof Error ? error.stack : undefined;
    const errorName = error instanceof Error ? error.name : 'Unknown';
    console.error('[API] Error details:', { 
      errorName,
      errorMessage, 
      errorStack,
      error: error instanceof Error ? error.toString() : String(error)
    });
    
    // Return more detailed error for debugging
    return NextResponse.json(
      { 
        error: errorMessage || 'Failed to create event',
        details: process.env.NODE_ENV === 'development' ? errorStack : undefined
      },
      { status: 500 }
    );
  }
}
