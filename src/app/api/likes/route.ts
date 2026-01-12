import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getCurrentUser } from '@/lib/auth';

// GET /api/likes - Get current user's liked event IDs and like counts for all events
export async function GET() {
  try {
    const user = await getCurrentUser();
    
    // Get like counts for all events (visible to everyone)
    const likeCounts = await prisma.like.groupBy({
      by: ['eventId'],
      _count: { eventId: true },
    });

    const likeCountMap: Record<string, number> = {};
    likeCounts.forEach((lc) => {
      likeCountMap[lc.eventId] = lc._count.eventId;
    });

    // Only get user's liked event IDs if they're logged in
    if (!user) {
      return NextResponse.json({ likes: [], likeCounts: likeCountMap });
    }

    const likes = await prisma.like.findMany({
      where: { userId: user.id },
      select: { eventId: true },
    });

    return NextResponse.json({
      likes: likes.map((l) => l.eventId),
      likeCounts: likeCountMap,
    });
  } catch (error) {
    console.error('Get likes error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch likes' },
      { status: 500 }
    );
  }
}

// POST /api/likes - Toggle like for an event
export async function POST(request: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      );
    }

    const body = await request.json();
    const { eventId } = body;

    if (!eventId) {
      return NextResponse.json(
        { error: 'Event ID is required' },
        { status: 400 }
      );
    }

    // Check if like exists
    const existingLike = await prisma.like.findUnique({
      where: {
        userId_eventId: {
          userId: user.id,
          eventId,
        },
      },
    });

    if (existingLike) {
      // Unlike
      await prisma.like.delete({
        where: { id: existingLike.id },
      });
      
      const newCount = await prisma.like.count({
        where: { eventId },
      });

      return NextResponse.json({ liked: false, likeCount: newCount });
    } else {
      // Like
      await prisma.like.create({
        data: {
          userId: user.id,
          eventId,
        },
      });

      const newCount = await prisma.like.count({
        where: { eventId },
      });

      return NextResponse.json({ liked: true, likeCount: newCount });
    }
  } catch (error) {
    console.error('Toggle like error:', error);
    return NextResponse.json(
      { error: 'Failed to toggle like' },
      { status: 500 }
    );
  }
}
