import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import { supabaseAdmin } from '@/lib/supabaseAdmin';

const PER_PAGE = 1000;

// GET /api/admin/organizer-requests - Organizer accounts waiting to be verified
export async function GET() {
  const user = await getCurrentUser();
  if (!user || user.role !== 'admin') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  try {
    const pending: {
      id: string;
      email: string;
      name: string;
      venueName: string | null;
      requestedAt: string;
      createdAt: string;
    }[] = [];

    for (let page = 1; ; page++) {
      const { data, error } = await supabaseAdmin.auth.admin.listUsers({ page, perPage: PER_PAGE });
      if (error) throw error;
      for (const u of data.users) {
        const app = u.app_metadata || {};
        if (!app.verificationRequestedAt || app.verifiedOrganizer === true) continue;
        const meta = u.user_metadata || {};
        pending.push({
          id: u.id,
          email: u.email || '',
          name: meta.name || meta.full_name || u.email?.split('@')[0] || 'User',
          venueName: meta.venueName || null,
          requestedAt: app.verificationRequestedAt,
          createdAt: u.created_at,
        });
      }
      if (data.users.length < PER_PAGE) break;
    }

    // Prefer the profile's name/venue (users can edit those after signing up)
    if (pending.length > 0) {
      const { data: profiles } = await supabaseAdmin
        .from('profiles')
        .select('id, name, venue_name, role')
        .in('id', pending.map((p) => p.id));
      const byId = new Map(
        ((profiles || []) as { id: string; name: string | null; venue_name: string | null; role: string }[]).map((p) => [p.id, p])
      );
      for (const p of pending) {
        const profile = byId.get(p.id);
        if (profile?.name) p.name = profile.name;
        if (profile?.venue_name) p.venueName = profile.venue_name;
      }
    }

    pending.sort((a, b) => a.requestedAt.localeCompare(b.requestedAt));
    return NextResponse.json({ requests: pending });
  } catch (error) {
    console.error('[Organizer requests] List error:', error);
    return NextResponse.json({ error: 'Failed to load organizer requests' }, { status: 500 });
  }
}

// POST /api/admin/organizer-requests - { userId, action: 'approve' | 'decline' }
export async function POST(request: NextRequest) {
  const user = await getCurrentUser();
  if (!user || user.role !== 'admin') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  try {
    const { userId, action } = await request.json();
    if (!userId || (action !== 'approve' && action !== 'decline')) {
      return NextResponse.json({ error: 'Invalid request' }, { status: 400 });
    }

    const { data, error: fetchError } = await supabaseAdmin.auth.admin.getUserById(userId);
    if (fetchError || !data.user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    // Drop the pending request either way (null removes the key, since GoTrue merges
    // app_metadata); approving also marks the account verified
    const appMetadata: Record<string, unknown> = { ...(data.user.app_metadata || {}), verificationRequestedAt: null };
    if (action === 'approve') {
      appMetadata.verifiedOrganizer = true;
      appMetadata.verifiedAt = new Date().toISOString();
    }

    const { error } = await supabaseAdmin.auth.admin.updateUserById(userId, { app_metadata: appMetadata });
    if (error) throw error;

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('[Organizer requests] Update error:', error);
    return NextResponse.json({ error: 'Failed to update organizer request' }, { status: 500 });
  }
}
