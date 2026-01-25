import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getCurrentUser } from '@/lib/auth';

// POST /api/venues/[id]/approve - Approve a venue
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getCurrentUser();
    if (!user || user.role !== 'admin') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const { id } = await params;

    const venue = await prisma.venue.update({
      where: { id },
      data: { status: 'approved' },
    });

    return NextResponse.json({ venue });
  } catch (error) {
    console.error('Approve venue error:', error);
    return NextResponse.json(
      { error: 'Failed to approve venue' },
      { status: 500 }
    );
  }
}

