import prisma from '@/lib/prisma';
import { supabaseAdmin } from '@/lib/supabaseAdmin';
import { NotFoundError, ForbiddenError, ValidationError } from './errors';
import type { EventStatus } from '@prisma/client';

export interface EventFilters {
  status?: EventStatus | 'all';
  date?: string;
  category?: string;
  venueId?: string;
  featured?: boolean;
}

export interface CreateEventData {
  title: string;
  description: string;
  date: string;
  startTime: string;
  endTime?: string;
  venueId?: string;
  newVenueName?: string;
  newVenueAddress?: string;
  categories: string[];
  price?: string;
  ticketUrl?: string;
  imageUrl?: string;
  isRecurring?: boolean;
  recurrencePattern?: string;
  recurrenceEndDate?: string;
}

export interface UpdateEventData {
  title?: string;
  description?: string;
  date?: string;
  startTime?: string;
  endTime?: string;
  venueId?: string;
  price?: string;
  ticketUrl?: string;
  imageUrl?: string;
  featured?: boolean;
  status?: EventStatus;
}

/**
 * Helper function to generate recurring dates
 */
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

/**
 * Transform Prisma event to frontend format
 */
function transformEvent(event: any, submitterInfo?: { name: string; role: string }) {
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
    categories: event.categories?.map((c: any) => c.name) || [],
    likeCount: event._count?.likes || 0,
    isRecurring: event.isRecurring,
    recurrencePattern: event.recurrencePattern,
    recurrenceDay: event.recurrenceDay,
    recurrenceEndDate: event.recurrenceEndDate,
    parentEventId: event.parentEventId,
    submittedById: event.submittedById || undefined,
  };

  if (submitterInfo && event.submittedById) {
    return {
      ...baseEvent,
      submitterName: submitterInfo.name,
      submitterRole: submitterInfo.role,
    };
  }

  return baseEvent;
}

export class EventsService {
  /**
   * Find all events with optional filters
   */
  static async findAll(filters: EventFilters = {}, userRole?: string) {
    const { status = 'approved', date, category, venueId, featured } = filters;

    const where: Record<string, unknown> = {};

    // Only show pending events to admins
    if (status === 'pending') {
      if (userRole !== 'admin') {
        throw new ForbiddenError('Only admins can view pending events');
      }
      where.status = 'pending';
    } else if (status !== 'all') {
      where.status = status;
    }

    if (date) {
      where.date = date;
    }

    if (venueId) {
      where.venueId = venueId;
    }

    if (featured !== undefined) {
      where.featured = featured;
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
    let submitterMap: Record<string, { name: string; role: string }> = {};
    if (status === 'pending') {
      const submittedByIds = [...new Set(events.map(e => e.submittedById).filter(Boolean) as string[])];
      
      if (submittedByIds.length > 0) {
        const { data: profiles } = await supabaseAdmin
          .from('profiles')
          .select('id, name, role')
          .in('id', submittedByIds);
        
        if (profiles && profiles.length > 0) {
          submitterMap = (profiles as Array<{ id: string; name: string | null; role: string | null }>).reduce((acc, profile) => {
            acc[profile.id] = {
              name: profile.name || 'Unknown User',
              role: profile.role || 'user',
            };
            return acc;
          }, {} as Record<string, { name: string; role: string }>);
        }
      }
    }

    return events.map((event) => {
      const submitterInfo = event.submittedById ? submitterMap[event.submittedById] : undefined;
      return transformEvent(event, submitterInfo);
    });
  }

  /**
   * Find a single event by ID
   */
  static async findById(id: string) {
    const event = await prisma.event.findUnique({
      where: { id },
      include: {
        venue: true,
        categories: true,
        _count: {
          select: { likes: true },
        },
      },
    });

    if (!event) {
      throw new NotFoundError('Event not found');
    }

    return transformEvent(event);
  }

  /**
   * Create a new event
   */
  static async create(data: CreateEventData, userId: string, userRole: string) {
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
    } = data;

    // Validate required fields
    if (!title || !description || !date || !startTime || !categories?.length) {
      throw new ValidationError('Missing required fields: title, description, date, startTime, and categories are required');
    }

    // Handle venue - create new if needed, but check for duplicates first
    let finalVenueId = venueId;
    if (venueId === 'new' && newVenueName && newVenueAddress) {
      // Check if venue with same name already exists (case-insensitive)
      const allVenues = await prisma.venue.findMany();
      const existingVenue = allVenues.find(
        v => v.name.toLowerCase() === newVenueName.toLowerCase()
      );

      if (existingVenue) {
        finalVenueId = existingVenue.id;
      } else {
        // New venues require approval unless created by admin
        const venueStatus = userRole === 'admin' ? 'approved' : 'pending';
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
      throw new ValidationError('Venue is required');
    }

    // Auto-approve if admin
    const status = userRole === 'admin' ? 'approved' : 'pending';

    // Generate dates for recurring events
    const eventDates = isRecurring && recurrencePattern
      ? generateRecurringDates(date, recurrencePattern, recurrenceEndDate)
      : [date];

    // Get the day of week from the start date
    const recurrenceDay = isRecurring ? new Date(date + 'T12:00:00').getDay() : null;

    // Create the first (parent) event
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
        submittedById: userId,
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
            submittedById: userId,
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

    return {
      event: transformEvent(parentEvent),
      totalCreated: eventDates.length,
    };
  }

  /**
   * Update an event (with ownership check)
   */
  static async update(id: string, data: UpdateEventData, userId: string, userRole: string) {
    // Check if event exists
    const existingEvent = await prisma.event.findUnique({
      where: { id },
    });

    if (!existingEvent) {
      throw new NotFoundError('Event not found');
    }

    // Check ownership or admin role
    if (existingEvent.submittedById !== userId && userRole !== 'admin') {
      throw new ForbiddenError('You can only update your own events');
    }

    const event = await prisma.event.update({
      where: { id },
      data,
      include: {
        venue: true,
        categories: true,
      },
    });

    return transformEvent(event);
  }

  /**
   * Delete an event (with ownership check)
   */
  static async delete(id: string, userId: string, userRole: string) {
    const event = await prisma.event.findUnique({
      where: { id },
    });

    if (!event) {
      throw new NotFoundError('Event not found');
    }

    // Check ownership or admin role
    if (event.submittedById !== userId && userRole !== 'admin') {
      throw new ForbiddenError('You can only delete your own events');
    }

    await prisma.event.delete({
      where: { id },
    });

    return { success: true };
  }

  /**
   * Approve an event (admin only)
   */
  static async approve(id: string, adminId: string) {
    const event = await prisma.event.findUnique({
      where: { id },
    });

    if (!event) {
      throw new NotFoundError('Event not found');
    }

    const updatedEvent = await prisma.event.update({
      where: { id },
      data: { status: 'approved' },
      include: {
        venue: true,
        categories: true,
      },
    });

    return transformEvent(updatedEvent);
  }

  /**
   * Reject an event (admin only)
   */
  static async reject(id: string, adminId: string) {
    const event = await prisma.event.findUnique({
      where: { id },
    });

    if (!event) {
      throw new NotFoundError('Event not found');
    }

    const updatedEvent = await prisma.event.update({
      where: { id },
      data: { status: 'rejected' },
      include: {
        venue: true,
        categories: true,
      },
    });

    return transformEvent(updatedEvent);
  }

  /**
   * Cancel an event
   */
  static async cancel(id: string, userId: string) {
    const event = await prisma.event.findUnique({
      where: { id },
    });

    if (!event) {
      throw new NotFoundError('Event not found');
    }

    await prisma.event.update({
      where: { id },
      data: { status: 'cancelled' },
    });

    return { success: true };
  }

  /**
   * Get user's submitted events
   */
  static async findBySubmitter(userId: string) {
    const events = await prisma.event.findMany({
      where: { submittedById: userId },
      include: {
        venue: true,
        categories: true,
        _count: {
          select: { likes: true },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    return events.map(transformEvent);
  }

  /**
   * Approve all recurring events by parent ID (admin only)
   */
  static async approveRecurring(parentId: string, adminId: string) {
    const parentEvent = await prisma.event.findUnique({
      where: { id: parentId },
    });

    if (!parentEvent) {
      throw new NotFoundError('Parent event not found');
    }

    // Update parent and all child events
    await prisma.event.updateMany({
      where: {
        OR: [
          { id: parentId },
          { parentEventId: parentId },
        ],
      },
      data: { status: 'approved' },
    });

    return { success: true };
  }

  /**
   * Reject all recurring events by parent ID (admin only)
   */
  static async rejectRecurring(parentId: string, adminId: string) {
    const parentEvent = await prisma.event.findUnique({
      where: { id: parentId },
    });

    if (!parentEvent) {
      throw new NotFoundError('Parent event not found');
    }

    // Update parent and all child events
    await prisma.event.updateMany({
      where: {
        OR: [
          { id: parentId },
          { parentEventId: parentId },
        ],
      },
      data: { status: 'rejected' },
    });

    return { success: true };
  }
}
