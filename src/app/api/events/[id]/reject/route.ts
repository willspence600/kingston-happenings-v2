import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getCurrentUser } from '@/lib/auth';

// POST /api/events/[id]/reject - Reject a pending event. Body: { reason?: string }
// The listing is kept (status "rejected") so the submitter can see the admin's note under My Submissions.
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
    const body = await request.json().catch(() => ({}));
    const reason = typeof body.reason === 'string' && body.reason.trim() ? body.reason.trim().slice(0, 1000) : null;

    await prisma.event.update({
      where: { id },
      data: { status: 'rejected', rejectionReason: reason },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Reject event error:', error);
    return NextResponse.json(
      { error: 'Failed to reject event' },
      { status: 500 }
    );
  }
}
