import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import { VenuesService } from '@/services/database';
import { handleApiError } from '@/lib/error-handler';
import { validateBody } from '@/lib/validation/middleware';
import { UpdateVenueSchema } from '@/lib/validation/venues.schema';

// GET /api/venues/[id] - Get a single venue
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const venue = await VenuesService.findById(id);
    return NextResponse.json({ venue });
  } catch (error) {
    return handleApiError(error);
  }
}

// PUT /api/venues/[id] - Update a venue
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;
    const body = await validateBody(request, UpdateVenueSchema);
    const venue = await VenuesService.update(id, body, user.id, user.role);
    return NextResponse.json({ venue });
  } catch (error) {
    return handleApiError(error);
  }
}

// DELETE /api/venues/[id] - Delete a venue (admin only)
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getCurrentUser();
    if (!user || user.role !== 'admin') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const { id } = await params;
    const result = await VenuesService.delete(id, user.id);
    return NextResponse.json(result);
  } catch (error) {
    return handleApiError(error);
  }
}
