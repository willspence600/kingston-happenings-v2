import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import { EventsService } from '@/services/database';
import { handleApiError } from '@/lib/error-handler';

// POST /api/events/[id]/approve - Approve a pending event
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
    const event = await EventsService.approve(id, user.id);
    return NextResponse.json({ event });
  } catch (error) {
    return handleApiError(error);
  }
}

