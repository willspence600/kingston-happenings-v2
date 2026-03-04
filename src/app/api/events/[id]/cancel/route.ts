import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getCurrentUser } from '@/lib/auth';

// POST /api/events/[id]/cancel - Cancel an event (admin or submitter)
export async function POST(
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

    const event = await prisma.event.update({
      where: { id },
      data: { status: 'cancelled' },
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
    console.error('Cancel event error:', error);
    return NextResponse.json(
      { error: 'Failed to cancel event' },
      { status: 500 }
    );
  }
}
