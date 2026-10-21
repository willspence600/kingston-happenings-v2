import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getCurrentUser, isOrganizerApproved } from '@/lib/auth';
import { supabaseAdmin } from '@/lib/supabaseAdmin';
import { listAllAuthUsers, displayName, organizerVenueIds } from '@/lib/organizers';
import { composeAddress, normalizeApplication } from '@/lib/organizerApplication';
import { getDocumentSignedUrl } from '@/lib/storage';

export interface AdminOrganizer {
  id: string;
  name: string;
  email: string;
  emailConfirmed: boolean;
  /** Account role from profiles (organizer, admin, user) */
  accountRole: string;
  /** Their role at the venue, from the sign-up application (e.g. Owner) */
  venueRole: string | null;
  venues: { id: string | null; name: string }[];
  createdAt: string;
  lastSignInAt: string | null;
  organizerApproved: boolean;
  applicationDeclined: boolean;
  isVerifiedOrganizer: boolean;
  verificationRequestedAt: string | null;
  verifiedAt: string | null;
  application: {
    phone: string;
    confirmMethod: 'email' | 'document';
    hasDocument: boolean;
    notes: string;
    accessibility: string[];
    accessibilityNotes: string;
    newsletter: boolean;
    submittedAt: string;
    venues: { name: string; claimed: boolean; venueTypes: string[]; address: string; phone: string; website: string; instagram: string; about: string }[];
  } | null;
}

async function requireAdminUser() {
  const user = await getCurrentUser();
  return user && user.role === 'admin' ? user : null;
}

// GET /api/admin/organizers - Every organizer account (optionally ?id= for one, with a signed document link)
export async function GET(request: NextRequest) {
  if (!(await requireAdminUser())) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  try {
    const onlyId = request.nextUrl.searchParams.get('id');
    const [users, profilesRes] = await Promise.all([
      listAllAuthUsers(),
      supabaseAdmin.from('profiles').select('id, name, role, venue_name'),
    ]);
    const profiles = new Map(
      ((profilesRes.data || []) as { id: string; name: string | null; role: string; venue_name: string | null }[]).map((p) => [p.id, p])
    );

    const organizers = users.filter((u) => {
      if (onlyId && u.id !== onlyId) return false;
      const role = profiles.get(u.id)?.role;
      return role === 'organizer' || !!u.user_metadata?.organizerApplication;
    });

    const allVenueIds = new Set<string>();
    organizers.forEach((u) => organizerVenueIds(u).forEach((id) => allVenueIds.add(id)));
    const venueRows = await prisma.venue.findMany({ where: { id: { in: [...allVenueIds] } }, select: { id: true, name: true } });
    const venueNames = new Map(venueRows.map((v) => [v.id, v.name]));

    const result: AdminOrganizer[] = organizers.map((u) => {
      const profile = profiles.get(u.id);
      const meta = u.user_metadata || {};
      const app = u.app_metadata || {};
      const application = normalizeApplication(meta.organizerApplication, meta.venueName);
      const linked = organizerVenueIds(u).map((id) => ({ id, name: venueNames.get(id) || 'Removed venue' }));
      const applied = (application?.venues || []).map((v) => ({ id: v.claimedVenueId || null, name: v.claimedVenueId ? venueNames.get(v.claimedVenueId) || v.name : v.name }));
      const venues = linked.length > 0 ? linked : applied.length > 0 ? applied : profile?.venue_name ? [{ id: null, name: profile.venue_name }] : [];
      const accountRole = profile?.role || 'user';
      return {
        id: u.id,
        name: profile?.name || displayName(u),
        email: u.email || '',
        emailConfirmed: !!u.email_confirmed_at,
        accountRole,
        venueRole: application?.role || null,
        venues,
        createdAt: u.created_at,
        lastSignInAt: u.last_sign_in_at || null,
        organizerApproved: isOrganizerApproved(accountRole, meta, app),
        applicationDeclined: !!app.organizerDeclinedAt,
        isVerifiedOrganizer: app.verifiedOrganizer === true,
        verificationRequestedAt: app.verificationRequestedAt || null,
        verifiedAt: app.verifiedAt || null,
        application: application
          ? {
              phone: application.phone,
              confirmMethod: application.confirmMethod,
              hasDocument: !!application.documentPath,
              notes: application.notes,
              accessibility: application.accessibility,
              accessibilityNotes: application.accessibilityNotes,
              newsletter: application.newsletter,
              submittedAt: application.submittedAt,
              venues: application.venues.map((v) => ({
                name: v.claimedVenueId ? venueNames.get(v.claimedVenueId) || v.name : v.name,
                claimed: !!v.claimedVenueId,
                venueTypes: v.venueTypes,
                address: composeAddress(v),
                phone: v.phone,
                website: v.website,
                instagram: v.instagram,
                about: v.about,
              })),
            }
          : null,
      };
    });

    result.sort((a, b) => b.createdAt.localeCompare(a.createdAt));

    if (onlyId) {
      const organizer = result[0];
      if (!organizer) return NextResponse.json({ error: 'Organizer not found' }, { status: 404 });
      const raw = organizers[0].user_metadata?.organizerApplication;
      const path = normalizeApplication(raw)?.documentPath;
      return NextResponse.json({ organizer, documentUrl: path ? await getDocumentSignedUrl(path) : null });
    }
    return NextResponse.json({ organizers: result });
  } catch (error) {
    console.error('[Admin organizers] List error:', error);
    return NextResponse.json({ error: 'Failed to load organizers' }, { status: 500 });
  }
}

// POST /api/admin/organizers - { userId, verified: boolean } toggles Verified Organizer
export async function POST(request: NextRequest) {
  if (!(await requireAdminUser())) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  try {
    const { userId, verified } = await request.json();
    if (!userId || typeof verified !== 'boolean') {
      return NextResponse.json({ error: 'Invalid request' }, { status: 400 });
    }
    const { data, error: fetchError } = await supabaseAdmin.auth.admin.getUserById(userId);
    if (fetchError || !data.user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    // null removes the key (GoTrue merges app_metadata)
    const appMetadata: Record<string, unknown> = {
      ...(data.user.app_metadata || {}),
      verificationRequestedAt: null,
      verifiedOrganizer: verified,
      verifiedAt: verified ? new Date().toISOString() : null,
    };
    // Verifying an organizer also approves their account
    if (verified) appMetadata.organizerApproved = true;

    const { error } = await supabaseAdmin.auth.admin.updateUserById(userId, { app_metadata: appMetadata });
    if (error) throw error;
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('[Admin organizers] Update error:', error);
    return NextResponse.json({ error: 'Failed to update organizer' }, { status: 500 });
  }
}

// DELETE /api/admin/organizers?userId= - Permanently delete an account and its listings and saves
export async function DELETE(request: NextRequest) {
  const admin = await requireAdminUser();
  if (!admin) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const userId = request.nextUrl.searchParams.get('userId');
  if (!userId) {
    return NextResponse.json({ error: 'userId is required' }, { status: 400 });
  }
  if (userId === admin.id) {
    return NextResponse.json({ error: 'You can’t delete your own account here' }, { status: 400 });
  }

  try {
    await prisma.eventSeries.deleteMany({ where: { submittedById: userId } });
    await prisma.event.deleteMany({ where: { submittedById: userId } });
    await prisma.like.deleteMany({ where: { userId } });
    await supabaseAdmin.from('profiles').delete().eq('id', userId);
    const { error } = await supabaseAdmin.auth.admin.deleteUser(userId);
    if (error) throw error;
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('[Admin organizers] Delete error:', error);
    return NextResponse.json({ error: 'Failed to delete account' }, { status: 500 });
  }
}
