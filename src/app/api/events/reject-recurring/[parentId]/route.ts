import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getCurrentUser } from '@/lib/auth';

/**
 * Reject all pending occurrences in a series.
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
    const body = await request.json().catch(() => ({}));
    const reason = typeof body.reason === 'string' && body.reason.trim() ? body.reason.trim().slice(0, 1000) : null;

    let seriesId = parentId;
    const series = await prisma.eventSeries.findUnique({ where: { id: parentId } });
    if (!series) {
      const event = await prisma.event.findUnique({
        where: { id: parentId },
        select: { seriesId: true },
      });
      if (!event?.seriesId) {
        const result = await prisma.event.updateMany({
          where: { id: parentId, status: 'pending' },
          data: { status: 'rejected', rejectionReason: reason },
        });
        return NextResponse.json({ success: true, count: result.count });
      }
      seriesId = event.seriesId;
    }

    // Keep the series (marked rejected) so the submitter sees the admin's note under My Submissions
    const result = await prisma.event.updateMany({
      where: { seriesId, status: 'pending' },
      data: { status: 'rejected', rejectionReason: reason },
    });
    await prisma.eventSeries.update({
      where: { id: seriesId },
      data: { status: 'rejected', rejectionReason: reason },
    });

    return NextResponse.json({ success: true, count: result.count });
  } catch (error) {
    console.error('Reject recurring events error:', error);
    return NextResponse.json({ error: 'Failed to reject events' }, { status: 500 });
  }
}
