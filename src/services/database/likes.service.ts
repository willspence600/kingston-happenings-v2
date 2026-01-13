import prisma from '@/lib/prisma';
import { NotFoundError, UnauthorizedError, ValidationError } from './errors';

export class LikesService {
  /**
   * Toggle like/unlike for an event
   */
  static async toggle(eventId: string, userId: string) {
    if (!userId) {
      throw new UnauthorizedError('Authentication required');
    }

    if (!eventId) {
      throw new ValidationError('Event ID is required');
    }

    // Verify event exists
    const event = await prisma.event.findUnique({
      where: { id: eventId },
    });

    if (!event) {
      throw new NotFoundError('Event not found');
    }

    // Check if like exists
    const existingLike = await prisma.like.findUnique({
      where: {
        userId_eventId: {
          userId,
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

      return { liked: false, likeCount: newCount };
    } else {
      // Like
      await prisma.like.create({
        data: {
          userId,
          eventId,
        },
      });

      const newCount = await prisma.like.count({
        where: { eventId },
      });

      return { liked: true, likeCount: newCount };
    }
  }

  /**
   * Check if user liked an event
   */
  static async isLiked(eventId: string, userId: string): Promise<boolean> {
    if (!userId) {
      return false;
    }

    const like = await prisma.like.findUnique({
      where: {
        userId_eventId: {
          userId,
          eventId,
        },
      },
    });

    return !!like;
  }

  /**
   * Get like count for an event
   */
  static async getLikeCount(eventId: string): Promise<number> {
    return await prisma.like.count({
      where: { eventId },
    });
  }

  /**
   * Get all like counts for events (for batch operations)
   */
  static async getLikeCounts(): Promise<Record<string, number>> {
    const likeCounts = await prisma.like.groupBy({
      by: ['eventId'],
      _count: { eventId: true },
    });

    const likeCountMap: Record<string, number> = {};
    likeCounts.forEach((lc) => {
      likeCountMap[lc.eventId] = lc._count.eventId;
    });

    return likeCountMap;
  }

  /**
   * Get user's liked event IDs
   */
  static async getUserLikes(userId: string): Promise<string[]> {
    if (!userId) {
      return [];
    }

    const likes = await prisma.like.findMany({
      where: { userId },
      select: { eventId: true },
    });

    return likes.map((l) => l.eventId);
  }
}
