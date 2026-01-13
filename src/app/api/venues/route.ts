import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import { VenuesService } from '@/services/database';
import { handleApiError } from '@/lib/error-handler';
import { validateBody } from '@/lib/validation/middleware';
import { CreateVenueSchema } from '@/lib/validation/venues.schema';

// GET /api/venues - Get all venues
export async function GET(request: NextRequest) {
  try {
    const user = await getCurrentUser();
    const filters = {
      status: (request.nextUrl.searchParams.get('status') || 'approved') as any,
    };
    const venues = await VenuesService.findAll(filters, user?.role);
    return NextResponse.json({ venues });
  } catch (error) {
    return handleApiError(error);
  }
}

// POST /api/venues - Create a new venue
export async function POST(request: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await validateBody(request, CreateVenueSchema);
    const venue = await VenuesService.create(body, user.id, user.role);
    return NextResponse.json({ venue });
  } catch (error) {
    return handleApiError(error);
  }
}
