import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getCurrentUser } from '@/lib/auth';

// POST /api/events/[id]/cancel - Cancel an event (admin only)
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getCurrentUser();
    if (!user || user.role !== 'admin') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const { id } = await params;

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
