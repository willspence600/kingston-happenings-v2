import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getCurrentUser } from '@/lib/auth';
import { transformEvent, eventListInclude } from '@/utils/eventTransform';

// GET /api/events/my-submissions - Get events submitted by the current user
export async function GET() {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const events = await prisma.event.findMany({
      where: { submittedById: user.id },
      include: eventListInclude,
      orderBy: { createdAt: 'desc' },
    });

    const transformedEvents = events.map((event) => transformEvent(event, { stripDataUrls: true }));

    return NextResponse.json({ events: transformedEvents });
  } catch (error) {
    console.error('Get my submissions error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch submissions' },
      { status: 500 }
    );
  }
}
