import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabaseAdmin';
import { uploadImage, uploadPrivateDocument } from '@/lib/storage';

// Uploads are only accepted for a brand-new account, right after sign-up
const SIGNUP_WINDOW_MS = 30 * 60 * 1000;

// POST /api/organizer-signup/files - { userId, kind: 'logo' | 'document', venueIndex?, dataUrl }
// The organizer isn't signed in yet (they still have to verify their email), so each
// file can only be attached once, to an organizer application created in the last 30 minutes.
export async function POST(request: NextRequest) {
  try {
    const { userId, kind, venueIndex, dataUrl } = await request.json();
    if (typeof userId !== 'string' || typeof dataUrl !== 'string' || (kind !== 'logo' && kind !== 'document')) {
      return NextResponse.json({ error: 'Invalid request' }, { status: 400 });
    }

    const { data, error: fetchError } = await supabaseAdmin.auth.admin.getUserById(userId);
    const authUser = data?.user;
    const application = authUser?.user_metadata?.organizerApplication;
    if (fetchError || !authUser || !application || typeof application !== 'object') {
      return NextResponse.json({ error: 'Application not found' }, { status: 404 });
    }
    if (Date.now() - new Date(authUser.created_at).getTime() > SIGNUP_WINDOW_MS) {
      return NextResponse.json({ error: 'Uploads are closed for this application' }, { status: 403 });
    }

    const next = { ...application };
    if (kind === 'logo') {
      const venues = Array.isArray(next.venues) ? [...next.venues] : [];
      const venue = typeof venueIndex === 'number' ? venues[venueIndex] : undefined;
      if (!venue) return NextResponse.json({ error: 'Venue not found' }, { status: 400 });
      if (venue.logoUrl) return NextResponse.json({ error: 'Logo already uploaded' }, { status: 409 });
      const logoUrl = await uploadImage(dataUrl, `venue-logos/${userId}-${venueIndex}`);
      venues[venueIndex] = { ...venue, logoUrl };
      next.venues = venues;
    } else {
      if (next.confirmMethod !== 'document') return NextResponse.json({ error: 'No document requested' }, { status: 400 });
      if (next.documentPath) return NextResponse.json({ error: 'Document already uploaded' }, { status: 409 });
      next.documentPath = await uploadPrivateDocument(dataUrl, `${userId}/verification`);
    }

    const { error } = await supabaseAdmin.auth.admin.updateUserById(userId, {
      user_metadata: { ...authUser.user_metadata, organizerApplication: next },
    });
    if (error) throw error;

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('[Organizer sign-up] File upload error:', error);
    return NextResponse.json({ error: 'Failed to upload file' }, { status: 500 });
  }
}
