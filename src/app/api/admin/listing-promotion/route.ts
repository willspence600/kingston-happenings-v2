import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getCurrentUser } from '@/lib/auth';

// POST /api/admin/listing-promotion - { eventId, hidden: boolean }
// Hides a listing from its venue's promotion tier (it's shown at Standard).
// For a recurring listing this applies to the whole series.
export async function POST(request: NextRequest) {
  const user = await getCurrentUser();
  if (!user || user.role !== 'admin') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  try {
    const { eventId, hidden } = await request.json();
    if (!eventId || typeof hidden !== 'boolean') {
      return NextResponse.json({ error: 'Invalid request' }, { status: 400 });
    }
    const event = await prisma.event.findUnique({ where: { id: eventId }, select: { seriesId: true } });
    if (!event) {
      return NextResponse.json({ error: 'Event not found' }, { status: 404 });
    }

    if (event.seriesId) {
      await prisma.eventSeries.update({ where: { id: event.seriesId }, data: { hiddenFromPromotion: hidden } });
      const res = await prisma.event.updateMany({ where: { seriesId: event.seriesId }, data: { hiddenFromPromotion: hidden } });
      return NextResponse.json({ success: true, count: res.count });
    }
    await prisma.event.update({ where: { id: eventId }, data: { hiddenFromPromotion: hidden } });
    return NextResponse.json({ success: true, count: 1 });
  } catch (error) {
    console.error('[Listing promotion] Update error:', error);
    return NextResponse.json({ error: 'Failed to update listing' }, { status: 500 });
  }
}
