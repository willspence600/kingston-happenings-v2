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
  | 'community'
  // Listing details (shown as tags on the detail page, not browse categories)
  | 'sold-out'
  | 'rsvp'
  | 'happy-hour'
  | 'dine-in'
  | 'takeout'
  | 'with-drink'
  | 'while-supplies-last'
  | 'no-other-offers';

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
  coverImageUrl?: string;
  promotionTier?: string;
  eventPromotionTier?: string;
  specialPromotionTier?: string;
  isMajor?: boolean;
  isDowntownDistrict?: boolean;
  venueTypes?: string[];
  phone?: string;
  instagram?: string;
  about?: string;
  hours?: VenueHours | null;
  accessibility?: string[];
  accessibilityNotes?: string;
  status?: string;
}

/**
 * Weekly opening hours, keyed by short day name (Mon … Sun). Times are HH:mm.
 */
export type VenueHours = Record<string, { open: string; close: string; closed: boolean }>;

/**
 * Event data model
 */
export interface Event {
  id: string;
  title: string;
  /** Short description shown on cards and previews */
  summary?: string;
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
  // Recurrence fields (series-derived)
  isRecurring?: boolean;
  seriesId?: string;
  detachedFromSeries?: boolean;
  recurrencePattern?: RecurrencePattern;
  recurrenceDays?: number[]; // 0-6 for days of week
  recurrenceDay?: number; // 0-6 legacy single-day
  recurrenceEndDate?: string;
  /** @deprecated Use seriesId instead */
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
  submitterVerified?: boolean;
  // Admin's note to the submitter when the listing was rejected
  rejectionReason?: string;
  // Shown at Standard regardless of the venue's promotion tier
  hiddenFromPromotion?: boolean;
  // ISO timestamp of the last edit by the submitter/admin
  lastEditedAt?: string;
  createdAt?: string;
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
  categoryTagStyles,
  categoryDotColors,
  browseCategories,
  allCategories,
} from '@/constants/categories';
