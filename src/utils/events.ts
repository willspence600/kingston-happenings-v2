/**
 * Event utility functions
 * Pure functions for event sorting, filtering, and business logic
 */

import type { Event, Venue } from '@/types/event';

/**
 * Get the priority value for a venue's promotion tier
 * Used for sorting events by promotional importance
 */
export function getPromotionTierPriority(tier?: string): number {
  switch (tier) {
    case 'featured':
      return 3;
    case 'promoted':
      return 2;
    case 'standard':
      return 1;
    default:
      return 1;
  }
}

/**
 * Sort events by promotion tier (highest first), then by date and time
 */
export function sortEventsByPromotion(events: Event[]): Event[] {
  return [...events].sort((a, b) => {
    const aPriority = getPromotionTierPriority(a.venue?.promotionTier);
    const bPriority = getPromotionTierPriority(b.venue?.promotionTier);
    if (bPriority !== aPriority) {
      return bPriority - aPriority;
    }
    const dateCompare = a.date.localeCompare(b.date);
    if (dateCompare !== 0) return dateCompare;
    return a.startTime.localeCompare(b.startTime);
  });
}

/**
 * Sort events by date and time (chronological order)
 */
export function sortEventsByDate(events: Event[]): Event[] {
  return [...events].sort((a, b) => {
    const dateCompare = a.date.localeCompare(b.date);
    if (dateCompare !== 0) return dateCompare;
    return a.startTime.localeCompare(b.startTime);
  });
}

/**
 * Filter events to only include food deals
 */
export function filterFoodDeals(events: Event[]): Event[] {
  return events.filter((e) => e.categories.includes('food-deal'));
}

/**
 * Filter events to exclude food deals (regular events only)
 */
export function filterRegularEvents(events: Event[]): Event[] {
  return events.filter((e) => !e.categories.includes('food-deal'));
}

/**
 * Filter events by category
 */
export function filterByCategory(events: Event[], category: string): Event[] {
  return events.filter((e) => e.categories.includes(category as Event['categories'][number]));
}

/**
 * Filter events by venue
 */
export function filterByVenue(events: Event[], venueId: string): Event[] {
  return events.filter((e) => e.venue?.id === venueId);
}

/**
 * Filter events by date
 */
export function filterByDate(events: Event[], date: string): Event[] {
  return events.filter((e) => e.date === date);
}

/**
 * Check if an event is free
 */
export function isEventFree(event: Event): boolean {
  return !event.price || event.price.toLowerCase() === 'free';
}

/**
 * Parse event price to get numeric value (for filtering)
 * Returns null if price can't be parsed
 */
export function parseEventPrice(price: string | undefined): number | null {
  if (!price) return null;
  const match = price.match(/\$?(\d+)/);
  return match ? parseInt(match[1], 10) : null;
}

/**
 * Group events by date
 * Returns an array of [date, events[]] pairs sorted by date
 */
export function groupEventsByDate(events: Event[]): [string, Event[]][] {
  const grouped: Record<string, Event[]> = {};

  events.forEach((event) => {
    const dateKey = event.date;
    if (!grouped[dateKey]) {
      grouped[dateKey] = [];
    }
    grouped[dateKey].push(event);
  });

  // Sort events within each date group by promotion tier, then time
  Object.keys(grouped).forEach((dateKey) => {
    grouped[dateKey] = sortEventsByPromotion(grouped[dateKey]);
  });

  // Return sorted by date
  return Object.entries(grouped).sort(([a], [b]) => a.localeCompare(b));
}

/**
 * Group events by venue
 * Returns an array of [venueName, events[]] pairs sorted by venue name
 */
export function groupEventsByVenue(events: Event[]): [string, Event[]][] {
  const grouped: Record<string, Event[]> = {};

  events.forEach((event) => {
    const venueName = event.venue?.name || 'Unknown Venue';
    if (!grouped[venueName]) {
      grouped[venueName] = [];
    }
    grouped[venueName].push(event);
  });

  return Object.entries(grouped).sort(([a], [b]) => a.localeCompare(b));
}

