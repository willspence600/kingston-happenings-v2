import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getCurrentUser } from '@/lib/auth';
import { supabaseAdmin } from '@/lib/supabaseAdmin';
import { listAllAuthUsers, displayName, organizerVenueIds } from '@/lib/organizers';
import { composeAddress } from '@/lib/organizerApplication';
import { linkOrganizerVenue, readVenueRequests } from '@/lib/venueRequests';
import { getAbsoluteImageUrl } from '@/utils/url';

export interface AdminVenueRequest {
  id: string;
  userId: string;
  userName: string;
  email: string;
  requestedAt: string;
  /** Venues already on the organizer's profile */
  currentVenues: string[];
  venue: {
    claimedVenueId?: string;
    claimedVenueName: string | null;
    name: string;
    venueTypes: string[];
    address: string;
    phone: string;
    website: string;
    instagram: string;
    about: string;
    logoUrl?: string;
  };
}

// GET /api/admin/venue-requests - Venues approved organizers asked to add to their profile
export async function GET() {
  const user = await getCurrentUser();
  if (!user || user.role !== 'admin') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  try {
    const users = (await listAllAuthUsers()).filter((u) => readVenueRequests(u).length > 0);
    const venueIds = new Set<string>();
    users.forEach((u) => {
      organizerVenueIds(u).forEach((id) => venueIds.add(id));
      readVenueRequests(u).forEach((r) => r.claimedVenueId && venueIds.add(r.claimedVenueId));
    });
    const rows = await prisma.venue.findMany({ where: { id: { in: [...venueIds] } }, select: { id: true, name: true } });
    const names = new Map(rows.map((v) => [v.id, v.name]));

    const requests: AdminVenueRequest[] = users.flatMap((u) =>
      readVenueRequests(u).map((r) => ({
        id: r.id,
        userId: u.id,
        userName: displayName(u),
        email: u.email || '',
        requestedAt: r.requestedAt,
        currentVenues: organizerVenueIds(u).map((id) => names.get(id) || 'Removed venue'),
        venue: {
          claimedVenueId: r.claimedVenueId,
          claimedVenueName: r.claimedVenueId ? names.get(r.claimedVenueId) || null : null,
          name: r.name,
          venueTypes: r.venueTypes,
          address: composeAddress(r),
          phone: r.phone,
          website: r.website,
          instagram: r.instagram,
          about: r.about,
          logoUrl: getAbsoluteImageUrl(r.logoUrl ?? null) ?? undefined,
        },
      }))
    );
    requests.sort((a, b) => a.requestedAt.localeCompare(b.requestedAt));
    return NextResponse.json({ requests });
  } catch (error) {
    console.error('[Admin venue requests] List error:', error);
    return NextResponse.json({ error: 'Failed to load venue requests' }, { status: 500 });
  }
}

// POST /api/admin/venue-requests - { userId, requestId, action: 'approve' | 'decline' }
// Approving links the venue to the organizer (creating it if it's new), like sign-up approval.
export async function POST(request: NextRequest) {
  const user = await getCurrentUser();
  if (!user || user.role !== 'admin') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  try {
    const { userId, requestId, action } = await request.json();
    if (!userId || !requestId || (action !== 'approve' && action !== 'decline')) {
      return NextResponse.json({ error: 'Invalid request' }, { status: 400 });
    }

    const { data, error: fetchError } = await supabaseAdmin.auth.admin.getUserById(userId);
    if (fetchError || !data.user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }
    const authUser = data.user;
    const pending = readVenueRequests(authUser);
    const venueRequest = pending.find((r) => r.id === requestId);
    if (!venueRequest) {
      return NextResponse.json({ error: 'That request was already handled' }, { status: 404 });
    }

    const appMetadata: Record<string, unknown> = {
      ...(authUser.app_metadata || {}),
      venueRequests: pending.filter((r) => r.id !== requestId),
    };
    if (action === 'approve') {
      const venueId = await linkOrganizerVenue(venueRequest);
      if (!venueId) {
        return NextResponse.json({ error: 'The venue they claimed no longer exists' }, { status: 409 });
      }
      appMetadata.organizerVenueIds = [...new Set([...organizerVenueIds(authUser), venueId])];
    }

    const { error } = await supabaseAdmin.auth.admin.updateUserById(userId, { app_metadata: appMetadata });
    if (error) throw error;
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('[Admin venue requests] Update error:', error);
    return NextResponse.json({ error: 'Failed to update venue request' }, { status: 500 });
  }
}
