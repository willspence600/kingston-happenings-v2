import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getCurrentUser } from '@/lib/auth';
import { supabaseAdmin } from '@/lib/supabaseAdmin';
import { uploadImage } from '@/lib/storage';
import { normalizeApplication } from '@/lib/organizerApplication';
import { MAX_PENDING_VENUE_REQUESTS, readVenueRequests, type VenueRequest } from '@/lib/venueRequests';

async function loadAuthUser(id: string) {
  const { data, error } = await supabaseAdmin.auth.admin.getUserById(id);
  if (error || !data.user) throw error || new Error('User not found');
  return data.user;
}

// GET /api/user/venue-requests - The signed-in organizer's venues waiting for admin approval
export async function GET() {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  if (user.role !== 'organizer') return NextResponse.json({ requests: [] });

  try {
    return NextResponse.json({ requests: readVenueRequests(await loadAuthUser(user.id)) });
  } catch (error) {
    console.error('[Venue requests] List error:', error);
    return NextResponse.json({ error: 'Failed to load your venue requests' }, { status: 500 });
  }
}

// POST /api/user/venue-requests - { venue, logo? } Ask an admin to add another venue to this organizer
export async function POST(request: NextRequest) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  if (user.role !== 'organizer') {
    return NextResponse.json({ error: 'Only organizer accounts can add venues' }, { status: 403 });
  }

  try {
    const body = await request.json();
    const venue = normalizeApplication({ venues: [body?.venue] })?.venues[0];
    if (!venue || (!venue.claimedVenueId && !venue.name.trim())) {
      return NextResponse.json({ error: 'Pick your venue or add a new one.' }, { status: 400 });
    }
    if (!venue.claimedVenueId && !venue.street.trim()) {
      return NextResponse.json({ error: 'Add a street address for the new venue.' }, { status: 400 });
    }

    const authUser = await loadAuthUser(user.id);
    const pending = readVenueRequests(authUser);
    if (pending.length >= MAX_PENDING_VENUE_REQUESTS) {
      return NextResponse.json({ error: 'You have a lot of venues waiting for review already. We’ll get to them soon!' }, { status: 429 });
    }

    if (venue.claimedVenueId) {
      if (user.organizerVenueIds.includes(venue.claimedVenueId)) {
        return NextResponse.json({ error: 'That venue is already on your profile.' }, { status: 409 });
      }
      if (pending.some((r) => r.claimedVenueId === venue.claimedVenueId)) {
        return NextResponse.json({ error: 'You’ve already asked to add that venue. It’s waiting for review.' }, { status: 409 });
      }
      const existing = await prisma.venue.findUnique({ where: { id: venue.claimedVenueId }, select: { name: true } });
      if (!existing) {
        return NextResponse.json({ error: 'That venue no longer exists. Try searching again.' }, { status: 404 });
      }
      venue.name = existing.name;
    }

    const id = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    if (typeof body.logo === 'string' && body.logo.startsWith('data:image/')) {
      venue.logoUrl = await uploadImage(body.logo, `venue-logos/${user.id}-request-${id}`);
    }

    const newRequest: VenueRequest = { ...venue, id, requestedAt: new Date().toISOString() };
    const { error } = await supabaseAdmin.auth.admin.updateUserById(user.id, {
      app_metadata: { ...(authUser.app_metadata || {}), venueRequests: [...pending, newRequest] },
    });
    if (error) throw error;

    return NextResponse.json({ request: newRequest });
  } catch (error) {
    console.error('[Venue requests] Create error:', error);
    return NextResponse.json({ error: 'We couldn’t send your request. Please try again.' }, { status: 500 });
  }
}

// DELETE /api/user/venue-requests?id= - Withdraw a request that hasn't been reviewed yet
export async function DELETE(request: NextRequest) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  const id = request.nextUrl.searchParams.get('id');
  if (!id) {
    return NextResponse.json({ error: 'id is required' }, { status: 400 });
  }

  try {
    const authUser = await loadAuthUser(user.id);
    const remaining = readVenueRequests(authUser).filter((r) => r.id !== id);
    const { error } = await supabaseAdmin.auth.admin.updateUserById(user.id, {
      app_metadata: { ...(authUser.app_metadata || {}), venueRequests: remaining },
    });
    if (error) throw error;
    return NextResponse.json({ requests: remaining });
  } catch (error) {
    console.error('[Venue requests] Withdraw error:', error);
    return NextResponse.json({ error: 'Failed to withdraw your request' }, { status: 500 });
  }
}
