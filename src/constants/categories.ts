/**
 * Event category constants
 * Centralized definitions for category labels, colors, and configurations
 */

import type { EventCategory } from '@/types/event';

/**
 * Human-readable labels for each category
 */
export const categoryLabels: Record<EventCategory, string> = {
  'live-music': 'Live Music',
  'activity-nights': 'Activity Nights',
  'daytime': 'Daytime Events',
  'sports': 'Sports',
  'all-day': 'All Day Events',
  '19plus': '19+',
  'workshop': 'Workshops & Classes',
  'concert': 'Concerts',
  'theatre': 'Theatre & Arts',
  'market': 'Markets',
  'nightlife': 'Nightlife',
  'food-deal': 'Food & Drink Specials',
  'food': 'Food',
  'drink': 'Drink',
  'trivia': 'Trivia Nights',
  'festival': 'Festivals',
  'family': 'Family Friendly',
  'community': 'Community Events',
};

/**
 * Background colors for category badges
 */
export const categoryColors: Record<EventCategory, string> = {
  'live-music': 'bg-rose-500',
  'activity-nights': 'bg-violet-500',
  'daytime': 'bg-amber-500',
  'sports': 'bg-emerald-500',
  'all-day': 'bg-teal-500',
  '19plus': 'bg-red-600',
  'workshop': 'bg-sky-500',
  'concert': 'bg-pink-500',
  'theatre': 'bg-fuchsia-500',
  'market': 'bg-cyan-500',
  'nightlife': 'bg-indigo-500',
  'food-deal': 'bg-yellow-500',
  'food': 'bg-orange-500',
  'drink': 'bg-blue-500',
  'trivia': 'bg-purple-500',
  'festival': 'bg-yellow-500',
  'family': 'bg-lime-500',
  'community': 'bg-blue-500',
};

/**
 * Muted/default styles for category buttons (unselected state)
 */
export const categoryColorsMuted: Record<EventCategory, string> = {
  'live-music': 'bg-card text-foreground hover:bg-muted border border-border',
  'activity-nights': 'bg-card text-foreground hover:bg-muted border border-border',
  'daytime': 'bg-card text-foreground hover:bg-muted border border-border',
  'sports': 'bg-card text-foreground hover:bg-muted border border-border',
  'all-day': 'bg-card text-foreground hover:bg-muted border border-border',
  '19plus': 'bg-card text-foreground hover:bg-muted border border-border',
  'workshop': 'bg-card text-foreground hover:bg-muted border border-border',
  'concert': 'bg-card text-foreground hover:bg-muted border border-border',
  'theatre': 'bg-card text-foreground hover:bg-muted border border-border',
  'market': 'bg-card text-foreground hover:bg-muted border border-border',
  'nightlife': 'bg-card text-foreground hover:bg-muted border border-border',
  'food-deal': 'bg-card text-foreground hover:bg-muted border border-border',
  'food': 'bg-card text-foreground hover:bg-muted border border-border',
  'drink': 'bg-card text-foreground hover:bg-muted border border-border',
  'trivia': 'bg-card text-foreground hover:bg-muted border border-border',
  'festival': 'bg-card text-foreground hover:bg-muted border border-border',
  'family': 'bg-card text-foreground hover:bg-muted border border-border',
  'community': 'bg-card text-foreground hover:bg-muted border border-border',
};

/**
 * Active/selected styles for category buttons
 */
export const categoryColorsActive: Record<EventCategory, string> = {
  'live-music': 'bg-rose-500 text-white',
  'activity-nights': 'bg-violet-500 text-white',
  'daytime': 'bg-amber-500 text-white',
  'sports': 'bg-emerald-500 text-white',
  'all-day': 'bg-teal-500 text-white',
  '19plus': 'bg-red-600 text-white',
  'workshop': 'bg-sky-500 text-white',
  'concert': 'bg-pink-500 text-white',
  'theatre': 'bg-fuchsia-500 text-white',
  'market': 'bg-cyan-500 text-white',
  'nightlife': 'bg-indigo-500 text-white',
  'food-deal': 'bg-yellow-500 text-white',
  'food': 'bg-orange-500 text-white',
  'drink': 'bg-blue-500 text-white',
  'trivia': 'bg-purple-500 text-white',
  'festival': 'bg-yellow-500 text-white',
  'family': 'bg-lime-500 text-white',
  'community': 'bg-blue-500 text-white',
};

/**
 * Categories to display in the Browse page sidebar
 */
export const browseCategories: EventCategory[] = [
  'live-music',
  'activity-nights',
  'daytime',
  'sports',
  'all-day',
  '19plus',
  'workshop',
  'concert',
  'theatre',
  'market',
  'nightlife',
  'family',
];

/**
 * All available categories
 */
export const allCategories: EventCategory[] = [
  'live-music',
  'activity-nights',
  'daytime',
  'sports',
  'all-day',
  '19plus',
  'workshop',
  'concert',
  'theatre',
  'market',
  'nightlife',
  'food-deal',
  'food',
  'drink',
  'trivia',
  'festival',
  'family',
  'community',
];

