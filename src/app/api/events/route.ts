import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import { EventsService } from '@/services/database';
import { handleApiError } from '@/lib/error-handler';
import { validateBody, validateQuery } from '@/lib/validation/middleware';
import { CreateEventSchema, EventFiltersSchema } from '@/lib/validation/events.schema';

// GET /api/events - Get all events (with filters)
export async function GET(request: NextRequest) {
  try {
    const user = await getCurrentUser();
    const filters = validateQuery(request, EventFiltersSchema);
    const events = await EventsService.findAll(filters, user?.role);
    return NextResponse.json({ events });
  } catch (error) {
    return handleApiError(error);
  }
}

// POST /api/events - Create a new event
export async function POST(request: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const body = await validateBody(request, CreateEventSchema);
    const result = await EventsService.create(body, user.id, user.role);
    return NextResponse.json(result);
  } catch (error) {
    return handleApiError(error);
  }
}
