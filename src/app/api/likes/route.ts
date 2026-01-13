import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import { LikesService } from '@/services/database';
import { handleApiError } from '@/lib/error-handler';
import { validateBody } from '@/lib/validation/middleware';
import { z } from 'zod';

const ToggleLikeSchema = z.object({
  eventId: z.string().min(1, 'Event ID is required'),
});

// GET /api/likes - Get current user's liked event IDs and like counts for all events
export async function GET() {
  try {
    const user = await getCurrentUser();
    
    const likeCounts = await LikesService.getLikeCounts();
    const likes = user ? await LikesService.getUserLikes(user.id) : [];

    return NextResponse.json({
      likes,
      likeCounts,
    });
  } catch (error) {
    return handleApiError(error);
  }
}

// POST /api/likes - Toggle like for an event
export async function POST(request: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      );
    }

    const { eventId } = await validateBody(request, ToggleLikeSchema);
    const result = await LikesService.toggle(eventId, user.id);
    return NextResponse.json(result);
  } catch (error) {
    return handleApiError(error);
  }
}
