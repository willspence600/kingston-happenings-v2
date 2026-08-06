import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getCurrentUser } from '@/lib/auth';

/**
 * Reject (delete) all pending occurrences in a series.
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

    let seriesId = parentId;
    const series = await prisma.eventSeries.findUnique({ where: { id: parentId } });
    if (!series) {
      const event = await prisma.event.findUnique({
        where: { id: parentId },
        select: { seriesId: true },
      });
      if (!event?.seriesId) {
        const result = await prisma.event.deleteMany({
          where: { id: parentId, status: 'pending' },
        });
        return NextResponse.json({ success: true, count: result.count });
      }
      seriesId = event.seriesId;
    }

    // Deleting the series cascades to all occurrences
    await prisma.eventSeries.delete({ where: { id: seriesId } });

    return NextResponse.json({ success: true, count: 1, deletedSeries: true });
  } catch (error) {
    console.error('Reject recurring events error:', error);
    return NextResponse.json({ error: 'Failed to reject events' }, { status: 500 });
  }
}
