import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getCurrentUser } from '@/lib/auth';
import { supabaseAdmin } from '@/lib/supabaseAdmin';
import { getDocumentSignedUrl } from '@/lib/storage';
import { listAllAuthUsers, displayName } from '@/lib/organizers';
import { composeAddress, normalizeApplication } from '@/lib/organizerApplication';
import { linkOrganizerVenue } from '@/lib/venueRequests';
import { getAbsoluteImageUrl } from '@/utils/url';

// GET /api/admin/organizer-applications - New organizer sign-ups waiting for admin approval
export async function GET() {
  const user = await getCurrentUser();
  if (!user || user.role !== 'admin') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  try {
    const users = await listAllAuthUsers();
    const pending = users.filter((u) => {
      const app = u.app_metadata || {};
      return u.user_metadata?.organizerApplication && app.organizerApproved !== true && app.verifiedOrganizer !== true && !app.organizerDeclinedAt;
    });

    const venueIds = new Set<string>();
    const applications = pending.map((u) => {
      const application = normalizeApplication(u.user_metadata.organizerApplication, u.user_metadata.venueName)!;
      application.venues.forEach((v) => v.claimedVenueId && venueIds.add(v.claimedVenueId));
      return { u, application };
    });

    const claimed = await prisma.venue.findMany({ where: { id: { in: [...venueIds] } }, select: { id: true, name: true } });
    const claimedNames = new Map(claimed.map((v) => [v.id, v.name]));

    const result = await Promise.all(
      applications.map(async ({ u, application }) => ({
        id: u.id,
        email: u.email || '',
        emailConfirmed: !!u.email_confirmed_at,
        name: displayName(u),
        createdAt: u.created_at,
        application: {
          ...application,
          venues: application.venues.map((v) => ({
            ...v,
            claimedVenueName: v.claimedVenueId ? claimedNames.get(v.claimedVenueId) || null : null,
            address: composeAddress(v),
            logoUrl: getAbsoluteImageUrl(v.logoUrl ?? null) ?? undefined,
          })),
          documentUrl: application.documentPath ? await getDocumentSignedUrl(application.documentPath) : null,
        },
      }))
    );

    result.sort((a, b) => a.createdAt.localeCompare(b.createdAt));
    return NextResponse.json({ applications: result });
  } catch (error) {
    console.error('[Organizer applications] List error:', error);
    return NextResponse.json({ error: 'Failed to load organizer applications' }, { status: 500 });
  }
}

// POST /api/admin/organizer-applications - { userId, action: 'approve' | 'decline' }
// Approving links the organizer to their venues: claimed venues get the details they
// filled in, and new venues are created.
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
    const authUser = data.user;
    const appMetadata: Record<string, unknown> = { ...(authUser.app_metadata || {}) };

    if (action === 'decline') {
      appMetadata.organizerDeclinedAt = new Date().toISOString();
    } else {
      const application = normalizeApplication(authUser.user_metadata?.organizerApplication, authUser.user_metadata?.venueName);
      if (!application) {
        return NextResponse.json({ error: 'No application found' }, { status: 400 });
      }

      const linkedIds = new Set<string>(Array.isArray(appMetadata.organizerVenueIds) ? (appMetadata.organizerVenueIds as string[]) : []);
      for (const v of application.venues) {
        const venueId = await linkOrganizerVenue(v, application);
        if (venueId) linkedIds.add(venueId);
      }

      appMetadata.organizerApproved = true;
      appMetadata.organizerApprovedAt = new Date().toISOString();
      appMetadata.organizerVenueIds = [...linkedIds];
    }

    const { error } = await supabaseAdmin.auth.admin.updateUserById(userId, { app_metadata: appMetadata });
    if (error) throw error;

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('[Organizer applications] Update error:', error);
    return NextResponse.json({ error: 'Failed to update organizer application' }, { status: 500 });
  }
}
