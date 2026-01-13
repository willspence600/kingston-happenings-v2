import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import { EventsService } from '@/services/database';
import { handleApiError } from '@/lib/error-handler';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;
    const result = await EventsService.cancel(id, user.id);
    return NextResponse.json(result);
  } catch (error) {
    return handleApiError(error);
  }
}


