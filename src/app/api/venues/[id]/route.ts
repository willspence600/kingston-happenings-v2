import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getCurrentUser } from '@/lib/auth';

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
        events: venue.events.map((e) => ({
          ...e,
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
    if (!user || user.role !== 'admin') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const { id } = await params;
    const body = await request.json();
    const { name, address, neighborhood, website, imageUrl, promotionTier } = body;

    console.log('API received venue update request:', { id, name, address, promotionTier });

    if (!name || !address) {
      return NextResponse.json(
        { error: 'Name and address are required' },
        { status: 400 }
      );
    }

    // Validate promotionTier value
    const validTiers = ['standard', 'promoted', 'featured'];
    const tier = promotionTier || 'standard';
    if (!validTiers.includes(tier)) {
      return NextResponse.json(
        { error: `Invalid promotion tier. Must be one of: ${validTiers.join(', ')}` },
        { status: 400 }
      );
    }

    const updateData: {
      name: string;
      address: string;
      neighborhood?: string | null;
      website?: string | null;
      imageUrl?: string | null;
      promotionTier: string;
    } = {
      name,
      address,
      promotionTier: tier,
    };
    
    // Only include optional fields if they are explicitly provided in the request
    // This allows clearing fields by sending null, or updating them with new values
    if (neighborhood !== undefined) {
      updateData.neighborhood = neighborhood === '' ? null : neighborhood;
    }
    if (website !== undefined) {
      updateData.website = website === '' ? null : website;
    }
    if (imageUrl !== undefined) {
      updateData.imageUrl = imageUrl === '' ? null : imageUrl;
    }

    console.log('Updating venue with data:', updateData);

    try {
      const venue = await prisma.venue.update({
        where: { id },
        data: updateData,
      });
      
      console.log('Venue updated successfully:', venue);
      return NextResponse.json({ venue });
    } catch (prismaError) {
      console.error('Prisma update error:', prismaError);
      throw prismaError;
    }
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
