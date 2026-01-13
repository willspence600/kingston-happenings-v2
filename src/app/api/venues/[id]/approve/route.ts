import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import { VenuesService } from '@/services/database';
import { handleApiError } from '@/lib/error-handler';

// POST /api/venues/[id]/approve - Approve a venue
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
    const venue = await VenuesService.approve(id, user.id);
    return NextResponse.json({ venue });
  } catch (error) {
    return handleApiError(error);
  }
}

