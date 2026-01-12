/**
 * Types barrel export
 */

export type {
  EventCategory,
  EventStatus,
  UserRole,
  RecurrencePattern,
  Event,
  Venue,
  User,
} from './event';

// Re-export constants for backwards compatibility
export {
  categoryLabels,
  categoryColors,
  categoryColorsMuted,
  categoryColorsActive,
  browseCategories,
  allCategories,
} from './event';

