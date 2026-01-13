import { NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import { EventsService } from '@/services/database';
import { handleApiError } from '@/lib/error-handler';

// GET /api/events/my-submissions - Get events submitted by the current user
export async function GET() {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const events = await EventsService.findBySubmitter(user.id);
    return NextResponse.json({ events });
  } catch (error) {
    return handleApiError(error);
  }
}

