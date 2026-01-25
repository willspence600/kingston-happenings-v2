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

    // Update all events with this parentEventId OR this id
    const result = await prisma.event.updateMany({
      where: {
        OR: [
          { id: parentId },
          { parentEventId: parentId }
        ],
        status: 'pending'
      },
      data: { status: 'approved' },
    });

    return NextResponse.json({ success: true, count: result.count });
  } catch (error) {
    console.error('Approve recurring events error:', error);
    return NextResponse.json({ error: 'Failed to approve events' }, { status: 500 });
  }
}

