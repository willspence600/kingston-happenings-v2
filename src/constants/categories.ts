/**
 * Event category constants
 * Centralized definitions for category labels, colors, and configurations
 */

import type { EventCategory } from '@/types/event';

/**
 * Human-readable labels for each category
 */
export const categoryLabels: Record<EventCategory, string> = {
  'live-music': 'Live music',
  'activity-nights': 'Activity nights',
  'daytime': 'Daytime events',
  'sports': 'Sports',
  'all-day': 'All Day Events',
  '19plus': '19+',
  'workshop': 'Workshops & classes',
  'concert': 'Concerts',
  'theatre': 'Theatre & Arts',
  'market': 'Markets',
  'nightlife': 'Nightlife',
  'food-deal': 'Food & Drink Specials',
  'food': 'Food',
  'drink': 'Drink',
  'trivia': 'Trivia Nights',
  'festival': 'Festivals',
  'family': 'Family activities',
  'community': 'Community Events',
  'sold-out': 'Sold out',
  'rsvp': 'RSVP required',
  'happy-hour': 'Happy Hour',
  'dine-in': 'Dine-in only',
  'takeout': 'Takeout too',
  'with-drink': 'With a drink purchase',
  'while-supplies-last': 'While supplies last',
  'no-other-offers': 'Not with other offers',
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
  'sold-out': 'bg-slate-500',
  'rsvp': 'bg-slate-500',
  'happy-hour': 'bg-slate-500',
  'dine-in': 'bg-slate-500',
  'takeout': 'bg-slate-500',
  'with-drink': 'bg-slate-500',
  'while-supplies-last': 'bg-slate-500',
  'no-other-offers': 'bg-slate-500',
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
  'sold-out': 'bg-card text-foreground hover:bg-muted border border-border',
  'rsvp': 'bg-card text-foreground hover:bg-muted border border-border',
  'happy-hour': 'bg-card text-foreground hover:bg-muted border border-border',
  'dine-in': 'bg-card text-foreground hover:bg-muted border border-border',
  'takeout': 'bg-card text-foreground hover:bg-muted border border-border',
  'with-drink': 'bg-card text-foreground hover:bg-muted border border-border',
  'while-supplies-last': 'bg-card text-foreground hover:bg-muted border border-border',
  'no-other-offers': 'bg-card text-foreground hover:bg-muted border border-border',
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
  'sold-out': 'bg-slate-500 text-white',
  'rsvp': 'bg-slate-500 text-white',
  'happy-hour': 'bg-slate-500 text-white',
  'dine-in': 'bg-slate-500 text-white',
  'takeout': 'bg-slate-500 text-white',
  'with-drink': 'bg-slate-500 text-white',
  'while-supplies-last': 'bg-slate-500 text-white',
  'no-other-offers': 'bg-slate-500 text-white',
};

/**
 * Brand tag styles (Figma "Tag" component) – background + text color per category
 */
export const categoryTagStyles: Record<EventCategory, string> = {
  'live-music': 'bg-[#ff6b4a] text-[#1b2a41]',
  'activity-nights': 'bg-[#1b2a41] text-white',
  'daytime': 'bg-[#ffb547] text-[#1b2a41]',
  'sports': 'bg-[#3e7ca6] text-white',
  'all-day': 'bg-[#ddebf7] text-[#1b2a41]',
  '19plus': 'bg-[#c4452b] text-white',
  'workshop': 'bg-[#ddebf7] text-[#1f5f94]',
  'concert': 'bg-[#1f5f94] text-white',
  'theatre': 'bg-[#ffe1da] text-[#b3412a]',
  'market': 'bg-[#fff1d6] text-[#8a5a00]',
  'nightlife': 'bg-[#1b2a41] text-white',
  'food-deal': 'bg-[#ff6b4a] text-[#1b2a41]',
  'food': 'bg-[#ff6b4a] text-[#1b2a41]',
  'drink': 'bg-[#ddebf7] text-[#1f5f94]',
  'trivia': 'bg-[#ddebf7] text-[#1b2a41]',
  'festival': 'bg-[#ffb547] text-[#1b2a41]',
  'family': 'bg-[#ffe8d6] text-[#a84a12]',
  'community': 'bg-[#fff1d6] text-[#8a5a00]',
  'sold-out': 'bg-danger text-white',
  'rsvp': 'bg-[#fff1d6] text-[#8a5a00]',
  'happy-hour': 'bg-[#ffb547] text-[#1b2a41]',
  'dine-in': 'bg-sky text-navy',
  'takeout': 'bg-sky text-navy',
  'with-drink': 'bg-sky text-navy',
  'while-supplies-last': 'bg-sky text-navy',
  'no-other-offers': 'bg-sky text-navy',
};

/**
 * Small dot colors for category bullets in list rows
 */
export const categoryDotColors: Record<EventCategory, string> = {
  'live-music': 'bg-[#ff6b4a]',
  'activity-nights': 'bg-[#1b2a41]',
  'daytime': 'bg-[#ffb547]',
  'sports': 'bg-[#3e7ca6]',
  'all-day': 'bg-[#3e7ca6]',
  '19plus': 'bg-[#c4452b]',
  'workshop': 'bg-[#1f5f94]',
  'concert': 'bg-[#1f5f94]',
  'theatre': 'bg-[#b3412a]',
  'market': 'bg-[#e0a030]',
  'nightlife': 'bg-[#1b2a41]',
  'food-deal': 'bg-[#ff6b4a]',
  'food': 'bg-[#ff6b4a]',
  'drink': 'bg-[#3e7ca6]',
  'trivia': 'bg-[#1b2a41]',
  'festival': 'bg-[#ffb547]',
  'family': 'bg-[#e07a3a]',
  'community': 'bg-[#e0a030]',
  'sold-out': 'bg-[#c4452b]',
  'rsvp': 'bg-[#e0a030]',
  'happy-hour': 'bg-[#ffb547]',
  'dine-in': 'bg-[#3e7ca6]',
  'takeout': 'bg-[#3e7ca6]',
  'with-drink': 'bg-[#3e7ca6]',
  'while-supplies-last': 'bg-[#3e7ca6]',
  'no-other-offers': 'bg-[#3e7ca6]',
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


/**
 * Event categories organizers can pick on Submit — the same set (and order) as the
 * Browse page category rail. 19+ doubles as the age-limit control.
 */
export const eventCategoryOptions: EventCategory[] = [
  'live-music',
  'activity-nights',
  'concert',
  'daytime',
  'sports',
  'theatre',
  'market',
  'workshop',
  'family',
  '19plus',
];

/** Fine-print conditions a food & drink special can carry (shown as tags on the detail page) */
export const specialConditionCategories: EventCategory[] = [
  'dine-in',
  'takeout',
  'with-drink',
  'while-supplies-last',
  'no-other-offers',
];

/**
 * Listing-detail flags stored alongside categories. They render as tags on the detail
 * page but aren't browse categories (never a listing's "primary" category).
 */
export const listingDetailCategories: EventCategory[] = ['sold-out', 'rsvp', 'happy-hour', ...specialConditionCategories];

export function isListingDetailCategory(category: EventCategory) {
  return listingDetailCategories.includes(category);
}
