import { NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import { supabaseAdmin } from '@/lib/supabaseAdmin';

// GET /api/user/organizer-verification - Current user's verified-organizer status
export async function GET() {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  return NextResponse.json({
    isVerifiedOrganizer: user.isVerifiedOrganizer,
    verificationRequestedAt: user.verificationRequestedAt ?? null,
    organizerApproved: user.organizerApproved,
    organizerVenueIds: user.organizerVenueIds,
  });
}

// POST /api/user/organizer-verification - Ask an admin to verify this organizer account.
// The request is stored on the auth user's app_metadata (not user-editable), so no
// database schema change is needed; admins see it under "Requested approved organizers".
export async function POST() {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    if (user.role !== 'organizer') {
      return NextResponse.json({ error: 'Only organizer accounts can request verification' }, { status: 403 });
    }
    if (!user.organizerApproved) {
      return NextResponse.json({ error: 'Your organizer account is still being reviewed. You can request verification once it’s approved.' }, { status: 403 });
    }
    if (user.isVerifiedOrganizer) {
      return NextResponse.json({ isVerifiedOrganizer: true, verificationRequestedAt: null });
    }
    if (user.verificationRequestedAt) {
      return NextResponse.json({ isVerifiedOrganizer: false, verificationRequestedAt: user.verificationRequestedAt });
    }

    const { data, error: fetchError } = await supabaseAdmin.auth.admin.getUserById(user.id);
    if (fetchError || !data.user) {
      throw fetchError || new Error('User not found');
    }

    const verificationRequestedAt = new Date().toISOString();
    const { error } = await supabaseAdmin.auth.admin.updateUserById(user.id, {
      app_metadata: { ...(data.user.app_metadata || {}), verificationRequestedAt },
    });
    if (error) throw error;

    return NextResponse.json({ isVerifiedOrganizer: false, verificationRequestedAt });
  } catch (error) {
    console.error('[Organizer verification] Request error:', error);
    return NextResponse.json({ error: 'Failed to send your request. Please try again.' }, { status: 500 });
  }
}
