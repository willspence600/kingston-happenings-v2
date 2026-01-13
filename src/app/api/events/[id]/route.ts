import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import { EventsService } from '@/services/database';
import { handleApiError } from '@/lib/error-handler';
import { validateBody } from '@/lib/validation/middleware';
import { UpdateEventSchema } from '@/lib/validation/events.schema';

// GET /api/events/[id] - Get a single event
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const event = await EventsService.findById(id);
    return NextResponse.json({ event });
  } catch (error) {
    return handleApiError(error);
  }
}

// PATCH /api/events/[id] - Update an event
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;
    const body = await validateBody(request, UpdateEventSchema);
    const event = await EventsService.update(id, body, user.id, user.role);
    return NextResponse.json({ event });
  } catch (error) {
    return handleApiError(error);
  }
}

// DELETE /api/events/[id] - Delete an event
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;
    const result = await EventsService.delete(id, user.id, user.role);
    return NextResponse.json(result);
  } catch (error) {
    return handleApiError(error);
  }
}
