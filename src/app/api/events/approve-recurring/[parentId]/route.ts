import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getCurrentUser } from '@/lib/auth';

/**
 * Approve all pending occurrences in a series.
 * Param `parentId` is treated as seriesId (or an event id whose seriesId is used).
 */
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

    // Resolve seriesId: param may be a series id or an event id
    let seriesId = parentId;
    const series = await prisma.eventSeries.findUnique({ where: { id: parentId } });
    if (!series) {
      const event = await prisma.event.findUnique({
        where: { id: parentId },
        select: { seriesId: true },
      });
      if (!event?.seriesId) {
        // Fall back to approving just this single event
        const result = await prisma.event.updateMany({
          where: { id: parentId, status: 'pending' },
          data: { status: 'approved' },
        });
        return NextResponse.json({ success: true, count: result.count });
      }
      seriesId = event.seriesId;
    }

    const result = await prisma.event.updateMany({
      where: {
        seriesId,
        status: 'pending',
      },
      data: { status: 'approved' },
    });

    await prisma.eventSeries.update({
      where: { id: seriesId },
      data: { status: 'approved' },
    });

    return NextResponse.json({ success: true, count: result.count });
  } catch (error) {
    console.error('Approve recurring events error:', error);
    return NextResponse.json({ error: 'Failed to approve events' }, { status: 500 });
  }
}
