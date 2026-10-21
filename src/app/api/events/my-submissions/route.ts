import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getCurrentUser } from '@/lib/auth';
import { transformEvent, eventListInclude } from '@/utils/eventTransform';

// GET /api/events/my-submissions - Get events submitted by the current user.
// Verified organizers also get every listing at their venues, whoever submitted it
// (flagged `fromVenue`), except rejected ones, whose admin notes are for the submitter only.
export async function GET() {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const venueIds = user.role === 'organizer' && user.isVerifiedOrganizer ? user.organizerVenueIds : [];

    const [events, venueEvents] = await Promise.all([
      prisma.event.findMany({
        where: { submittedById: user.id },
        include: eventListInclude,
        orderBy: { createdAt: 'desc' },
      }),
      venueIds.length > 0
        ? prisma.event.findMany({
            where: {
              venueId: { in: venueIds },
              status: { not: 'rejected' },
              OR: [{ submittedById: null }, { submittedById: { not: user.id } }],
            },
            include: eventListInclude,
            orderBy: { createdAt: 'desc' },
          })
        : Promise.resolve([]),
    ]);

    const transformedEvents = [
      ...events.map((event) => transformEvent(event, { stripDataUrls: true })),
      ...venueEvents.map((event) => ({ ...transformEvent(event, { stripDataUrls: true }), rejectionReason: undefined, fromVenue: true })),
    ];

    return NextResponse.json({ events: transformedEvents });
  } catch (error) {
    console.error('Get my submissions error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch submissions' },
      { status: 500 }
    );
  }
}
