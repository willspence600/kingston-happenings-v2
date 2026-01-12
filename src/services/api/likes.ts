/**
 * Likes API service
 * Client-side API functions for like/favorite operations
 */

/**
 * API response for likes
 */
export interface LikesResponse {
  likes: string[];
  likeCounts: Record<string, number>;
}

/**
 * API response for toggle like action
 */
export interface ToggleLikeResponse {
  liked: boolean;
  likeCount: number;
}

/**
 * Fetch user's likes and like counts for all events
 */
export async function fetchLikes(): Promise<LikesResponse> {
  const res = await fetch('/api/likes');
  if (!res.ok) {
    throw new Error('Failed to fetch likes');
  }
  const data: LikesResponse = await res.json();
  return {
    likes: data.likes || [],
    likeCounts: data.likeCounts || {},
  };
}

/**
 * Toggle like status for an event
 */
export async function toggleLike(eventId: string): Promise<ToggleLikeResponse> {
  const res = await fetch('/api/likes', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ eventId }),
  });

  if (!res.ok) {
    throw new Error('Failed to toggle like');
  }

  return res.json();
}

