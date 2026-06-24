import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getCurrentUser } from '@/lib/auth';
import { getAbsoluteImageUrl } from '@/utils/url';

// GET /api/venues - Get all venues
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const status = searchParams.get('status') || 'approved';
    const DEFAULT_LIMIT = 250;
    const MAX_LIMIT = 500;
    const rawLimit = parseInt(searchParams.get('limit') || `${DEFAULT_LIMIT}`, 10);
    const limit = Number.isFinite(rawLimit) ? Math.min(Math.max(rawLimit, 1), MAX_LIMIT) : DEFAULT_LIMIT;
    const rawPage = parseInt(searchParams.get('page') || '1', 10);
    const page = Number.isFinite(rawPage) && rawPage > 0 ? rawPage : 1;
    const skip = (page - 1) * limit;

    // Only admins can see pending venues
    if (status === 'pending') {
      const user = await getCurrentUser();
      if (!user || user.role !== 'admin') {
        return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
      }
    }

    const where = status === 'all' ? {} : { status };

    const venues = await prisma.venue.findMany({
      where,
      include: {
        _count: {
          select: { events: true },
        },
      },
      orderBy: { name: 'asc' },
      take: limit,
      skip,
    });

    const res = NextResponse.json({
      venues: venues.map((v) => ({
        id: v.id,
        name: v.name,
        address: v.address,
        neighborhood: v.neighborhood,
        website: v.website,
        imageUrl: getAbsoluteImageUrl(v.imageUrl),
        status: v.status,
        promotionTier: v.promotionTier || 'standard',
        eventCount: v._count.events,
      })),
    });
    if (status !== 'pending') {
      res.headers.set('Cache-Control', 'public, s-maxage=60, stale-while-revalidate=300');
    }
    return res;
  } catch (error) {
    console.error('Get venues error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch venues' },
      { status: 500 }
    );
  }
}

// POST /api/venues - Create a new venue
export async function POST(request: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    const body = await request.json();
    const { name, address, neighborhood, website, imageUrl } = body;

    if (!name || !address) {
      return NextResponse.json(
        { error: 'Name and address are required' },
        { status: 400 }
      );
    }

    // Auto-approve if admin
    const status = user?.role === 'admin' ? 'approved' : 'pending';

    const venue = await prisma.venue.create({
      data: {
        name,
        address,
        neighborhood,
        website,
        imageUrl,
        status,
      },
    });

    return NextResponse.json({ venue });
  } catch (error) {
    console.error('Create venue error:', error);
    return NextResponse.json(
      { error: 'Failed to create venue' },
      { status: 500 }
    );
  }
}
