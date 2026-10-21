import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getCurrentUser } from '@/lib/auth';
import { getAbsoluteImageUrl } from '@/utils/url';
import { Prisma } from '@prisma/client';
import { parseVenueDetails } from '@/lib/venueDetails';
import { PROMOTION_TIERS, isPromotionTier } from '@/lib/promotion';
import { describeChanges, notifyVenueOrganizers } from '@/lib/venueNotices';

// GET /api/venues/[id] - Get a single venue
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    const venue = await prisma.venue.findUnique({
      where: { id },
      include: {
        events: {
          where: { status: 'approved' },
          include: {
            categories: true,
            _count: {
              select: { likes: true },
            },
          },
          orderBy: [
            { date: 'asc' },
            { startTime: 'asc' },
          ],
        },
      },
    });

    if (!venue) {
      return NextResponse.json(
        { error: 'Venue not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      venue: {
        ...venue,
        imageUrl: getAbsoluteImageUrl(venue.imageUrl),
        coverImageUrl: getAbsoluteImageUrl(venue.coverImageUrl),
        events: venue.events.map((e) => ({
          ...e,
          imageUrl: getAbsoluteImageUrl(e.imageUrl),
          categories: e.categories.map((c) => c.name),
          likeCount: e._count.likes,
        })),
      },
    });
  } catch (error) {
    console.error('Get venue error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch venue' },
      { status: 500 }
    );
  }
}

// PUT /api/venues/[id] - Update a venue
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const { id } = await params;
    const body = await request.json();

    // Approved organizers linked to this venue can update its details (not its name, address or promotion settings)
    if (user.role !== 'admin') {
      if (!user.organizerApproved || !user.organizerVenueIds.includes(id)) {
        return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
      }
      const venue = await prisma.venue.update({
        where: { id },
        data: {
          ...parseVenueDetails(body),
          ...(body.website !== undefined ? { website: body.website || null } : {}),
        },
      });
      return NextResponse.json({ venue });
    }

    const existing = await prisma.venue.findUnique({ where: { id } });
    if (!existing) {
      return NextResponse.json({ error: 'Venue not found' }, { status: 404 });
    }

    // Admins can send any subset of fields; anything left out is unchanged
    const { name, address, neighborhood, website, imageUrl, coverImageUrl, promotionTier, eventPromotionTier, specialPromotionTier, isMajor, isDowntownDistrict, status } = body;
    const optionalString = (value: unknown) => (value === '' || value === null ? null : String(value));
    const updateData: Prisma.VenueUpdateInput = {};

    if (name !== undefined) {
      if (!String(name).trim()) return NextResponse.json({ error: 'Name is required' }, { status: 400 });
      updateData.name = String(name).trim();
    }
    if (address !== undefined) {
      if (!String(address).trim()) return NextResponse.json({ error: 'Address is required' }, { status: 400 });
      updateData.address = String(address).trim();
    }
    if (neighborhood !== undefined) updateData.neighborhood = optionalString(neighborhood);
    if (website !== undefined) updateData.website = optionalString(website);
    if (imageUrl !== undefined) updateData.imageUrl = optionalString(imageUrl);
    if (coverImageUrl !== undefined) updateData.coverImageUrl = optionalString(coverImageUrl);
    if (typeof isMajor === 'boolean') updateData.isMajor = isMajor;
    if (typeof isDowntownDistrict === 'boolean') updateData.isDowntownDistrict = isDowntownDistrict;
    if (status === 'approved' || status === 'pending') updateData.status = status;

    for (const [key, value] of [['promotionTier', promotionTier], ['eventPromotionTier', eventPromotionTier], ['specialPromotionTier', specialPromotionTier]] as const) {
      if (value === undefined) continue;
      if (!isPromotionTier(value)) {
        return NextResponse.json({ error: `Invalid promotion tier. Must be one of: ${PROMOTION_TIERS.join(', ')}` }, { status: 400 });
      }
      updateData[key] = value;
    }
    // The legacy single tier follows the events tier
    if (eventPromotionTier !== undefined) updateData.promotionTier = eventPromotionTier;
    else if (promotionTier !== undefined && eventPromotionTier === undefined && specialPromotionTier === undefined) {
      updateData.eventPromotionTier = promotionTier;
      updateData.specialPromotionTier = promotionTier;
    }

    const details = parseVenueDetails(body);
    const venue = await prisma.venue.update({
      where: { id },
      data: { ...updateData, ...details },
    });

    // Let the venue's organizers know what an admin changed (promotion settings stay internal)
    const changes = describeChanges(
      existing as unknown as Record<string, unknown>,
      venue as unknown as Record<string, unknown>,
      {
        name: 'Name',
        address: 'Address',
        neighborhood: 'Neighbourhood',
        website: 'Website',
        phone: 'Phone',
        instagram: 'Instagram',
        venueTypes: 'Venue type',
        about: 'About',
        hours: 'Opening hours',
        accessibility: 'Accessibility',
        accessibilityNotes: 'Accessibility notes',
        imageUrl: 'Logo',
        coverImageUrl: 'Cover photo',
        isMajor: 'Major Venue',
        isDowntownDistrict: 'Downtown Kingston',
      },
      ['about', 'hours', 'imageUrl', 'coverImageUrl', 'accessibilityNotes']
    );
    if (changes.length > 0) {
      await notifyVenueOrganizers(venue.id, venue.name, 'An admin updated your venue details', changes);
    }

    return NextResponse.json({ venue });
  } catch (error) {
    console.error('Update venue error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    const errorDetails = error instanceof Error ? error.stack : String(error);
    console.error('Error details:', errorDetails);
    return NextResponse.json(
      { 
        error: 'Failed to update venue', 
        message: errorMessage,
        details: errorDetails 
      },
      { status: 500 }
    );
  }
}

// DELETE /api/venues/[id] - Delete a venue
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getCurrentUser();
    if (!user || user.role !== 'admin') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const { id } = await params;

    await prisma.venue.delete({
      where: { id },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Delete venue error:', error);
    return NextResponse.json(
      { error: 'Failed to delete venue' },
      { status: 500 }
    );
  }
}
