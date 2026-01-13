import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import { UsersService } from '@/services/database';
import { handleApiError } from '@/lib/error-handler';
import { validateBody } from '@/lib/validation/middleware';
import { UpdateProfileSchema } from '@/lib/validation/users.schema';

export async function PUT(request: NextRequest) {
  try {
    const user = await getCurrentUser();
    
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await validateBody(request, UpdateProfileSchema);
    const profile = await UsersService.updateProfile(user.id, body);

    return NextResponse.json({ 
      success: true,
      profile,
    });
  } catch (error) {
    return handleApiError(error);
  }
}
