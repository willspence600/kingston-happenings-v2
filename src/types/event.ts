/**
 * Event and venue type definitions
 */

/**
 * Available event categories
 */
export type EventCategory = 
  | 'live-music'
  | 'activity-nights'
  | 'daytime'
  | 'sports'
  | 'all-day'
  | '19plus'
  | 'workshop'
  | 'concert'
  | 'theatre'
  | 'market'
  | 'nightlife'
  | 'food-deal'
  | 'food'
  | 'drink'
  | 'trivia'
  | 'festival'
  | 'family'
  | 'community';

/**
 * Event status values
 */
export type EventStatus = 'pending' | 'approved' | 'rejected' | 'cancelled';

/**
 * User role values
 */
export type UserRole = 'user' | 'organizer' | 'admin';

/**
 * Recurrence pattern options
 */
export type RecurrencePattern = 'weekly' | 'biweekly' | 'monthly';

/**
 * Venue data model
 */
export interface Venue {
  id: string;
  name: string;
  address: string;
  neighborhood?: string;
  website?: string;
  imageUrl?: string;
  promotionTier?: string;
}

/**
 * Event data model
 */
export interface Event {
  id: string;
  title: string;
  description: string;
  date: string; // ISO date string (YYYY-MM-DD)
  startTime: string; // HH:mm format
  endTime?: string;
  venue: Venue;
  categories: EventCategory[];
  imageUrl?: string;
  price?: string;
  ticketUrl?: string;
  featured?: boolean;
  // Recurrence fields
  isRecurring?: boolean;
  recurrencePattern?: RecurrencePattern;
  recurrenceDay?: number; // 0-6 for day of week
  recurrenceEndDate?: string;
  parentEventId?: string;
  // Event type flags
  isDeal?: boolean;
  isAllDay?: boolean;
  // Status
  status?: EventStatus;
  // Like count from API
  likeCount?: number;
  // Submitter information
  submittedById?: string;
  submitterName?: string;
  submitterRole?: UserRole;
}

/**
 * User data model
 */
export interface User {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  venueId?: string; // If they're an organizer
}

// Re-export constants for backwards compatibility
// New code should import directly from @/constants/categories
export {
  categoryLabels,
  categoryColors,
  categoryColorsMuted,
  categoryColorsActive,
  browseCategories,
  allCategories,
} from '@/constants/categories';
