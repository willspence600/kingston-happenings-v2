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
      submittedById: event.submittedById,
      createdAt: event.createdAt,
      venue: event.venue,
      categories: event.categories.map((c) => c.name),
      likeCount: event._count.likes,
      isRecurring: event.isRecurring,
      recurrencePattern: event.recurrencePattern,
      recurrenceEndDate: event.recurrenceEndDate,
      parentEventId: event.parentEventId,
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

