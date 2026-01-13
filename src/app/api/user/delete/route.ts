import { NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import { UsersService } from '@/services/database';
import { handleApiError } from '@/lib/error-handler';

export async function DELETE() {
  try {
    const user = await getCurrentUser();
    
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Check if service role key is configured
    if (!process.env.SUPABASE_SERVICE_ROLE_KEY) {
      return NextResponse.json({ 
        error: 'Account deletion is not properly configured. Please contact support.',
        details: 'Service role key missing'
      }, { status: 500 });
    }

    await UsersService.deleteAccount(user.id);

    return NextResponse.json({ 
      success: true,
      message: 'Account and all associated data have been permanently deleted. You will not be able to log in again.'
    });
  } catch (error) {
    return handleApiError(error);
  }
}
