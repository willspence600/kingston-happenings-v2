import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getCurrentUser } from '@/lib/auth';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ parentId: string }> }
) {
  try {
    const user = await getCurrentUser();
    if (!user || user.role !== 'admin') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const { parentId } = await params;

    // Delete all events with this parentEventId OR this id
    const result = await prisma.event.deleteMany({
      where: {
        OR: [
          { id: parentId },
          { parentEventId: parentId }
        ],
        status: 'pending'
      },
    });

    return NextResponse.json({ success: true, count: result.count });
  } catch (error) {
    console.error('Reject recurring events error:', error);
    return NextResponse.json({ error: 'Failed to reject events' }, { status: 500 });
  }
}

