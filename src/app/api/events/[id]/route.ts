import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getCurrentUser } from '@/lib/auth';
import { uploadImage } from '@/lib/storage';
import { getAbsoluteImageUrl } from '@/utils/url';

// GET /api/events/[id] - Get a single event
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

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
      return NextResponse.json(
        { error: 'Event not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      event: {
        ...event,
        imageUrl: getAbsoluteImageUrl(event.imageUrl),
        venue: { ...event.venue, imageUrl: getAbsoluteImageUrl(event.venue.imageUrl) },
        categories: event.categories.map((c) => c.name),
        likeCount: event._count.likes,
      },
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

    const existing = await prisma.event.findUnique({
      where: { id },
      select: { submittedById: true, categories: { select: { name: true } } },
    });
    if (!existing) {
      return NextResponse.json({ error: 'Event not found' }, { status: 404 });
    }
    if (user.role !== 'admin' && existing.submittedById !== user.id) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const body = await request.json();
    const { categories, imageUrl, venueId, newVenueName, newVenueAddress, ...eventData } = body;

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

    const event = await prisma.event.update({
      where: { id },
      data: {
        ...eventData,
        ...(finalVenueId ? { venueId: finalVenueId } : {}),
        ...(finalImageUrl !== undefined ? { imageUrl: finalImageUrl } : {}),
        ...(categories ? {
          categories: {
            deleteMany: {},
            create: (categories as string[]).map((name: string) => ({ name })),
          },
        } : {}),
      },
      include: {
        venue: true,
        categories: true,
      },
    });

    return NextResponse.json({
      event: {
        ...event,
        categories: event.categories.map((c) => c.name),
      },
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

    const existing = await prisma.event.findUnique({ where: { id }, select: { submittedById: true } });
    if (!existing) {
      return NextResponse.json({ error: 'Event not found' }, { status: 404 });
    }
    if (user.role !== 'admin' && existing.submittedById !== user.id) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    await prisma.event.delete({
      where: { id },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Delete event error:', error);
    return NextResponse.json(
      { error: 'Failed to delete event' },
      { status: 500 }
    );
  }
}
