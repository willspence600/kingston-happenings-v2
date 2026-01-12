import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getCurrentUser } from '@/lib/auth';

// GET /api/events/my-submissions - Get events submitted by the current user
export async function GET() {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    console.log('[API] Fetching submissions for user:', user.id, 'user type:', typeof user.id);
    
    // Also check all events to see what submittedById values exist
    const allEvents = await prisma.event.findMany({
      select: { id: true, title: true, submittedById: true, status: true },
      take: 10,
      orderBy: { createdAt: 'desc' },
    });
    console.log('[API] Sample of recent events:', allEvents.map(e => ({ id: e.id, title: e.title, submittedById: e.submittedById, status: e.status })));
    
    const events = await prisma.event.findMany({
      where: { submittedById: user.id },
      include: {
        venue: true,
        categories: true,
        _count: {
          select: { likes: true },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    console.log('[API] Found', events.length, 'submissions for user', user.id);
    if (events.length > 0) {
      console.log('[API] Sample submission:', { id: events[0].id, title: events[0].title, submittedById: events[0].submittedById, status: events[0].status });
    }

    const transformedEvents = events.map((event) => ({
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
      createdAt: event.createdAt,
      venue: event.venue,
      categories: event.categories.map((c) => c.name),
      likeCount: event._count.likes,
    }));

    return NextResponse.json({ events: transformedEvents });
  } catch (error) {
    console.error('Get my submissions error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch submissions' },
      { status: 500 }
    );
  }
}

