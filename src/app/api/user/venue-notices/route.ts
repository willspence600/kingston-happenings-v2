import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import { supabaseAdmin } from '@/lib/supabaseAdmin';
import { readVenueNotices } from '@/lib/venueNotices';

// GET /api/user/venue-notices - Changes an admin made to the signed-in organizer's venues
export async function GET() {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  try {
    const { data } = await supabaseAdmin.auth.admin.getUserById(user.id);
    return NextResponse.json({ notices: data?.user ? readVenueNotices(data.user) : [] });
  } catch (error) {
    console.error('[Venue notices] Read error:', error);
    return NextResponse.json({ notices: [] });
  }
}

// DELETE /api/user/venue-notices?id= - Dismiss one notice (or all, without an id)
export async function DELETE(request: NextRequest) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  try {
    const id = request.nextUrl.searchParams.get('id');
    const { data, error: fetchError } = await supabaseAdmin.auth.admin.getUserById(user.id);
    if (fetchError || !data.user) throw fetchError || new Error('User not found');
    const notices = id ? readVenueNotices(data.user).filter((n) => n.id !== id) : [];
    const { error } = await supabaseAdmin.auth.admin.updateUserById(user.id, {
      app_metadata: { ...(data.user.app_metadata || {}), venueNotices: notices },
    });
    if (error) throw error;
    return NextResponse.json({ notices });
  } catch (error) {
    console.error('[Venue notices] Dismiss error:', error);
    return NextResponse.json({ error: 'Failed to dismiss notice' }, { status: 500 });
  }
}
