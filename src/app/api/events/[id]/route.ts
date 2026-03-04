import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getCurrentUser } from '@/lib/auth';

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

    const existing = await prisma.event.findUnique({ where: { id }, select: { submittedById: true } });
    if (!existing) {
      return NextResponse.json({ error: 'Event not found' }, { status: 404 });
    }
    if (user.role !== 'admin' && existing.submittedById !== user.id) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const body = await request.json();

    const event = await prisma.event.update({
      where: { id },
      data: body,
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
