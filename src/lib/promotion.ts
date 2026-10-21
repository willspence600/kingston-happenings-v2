/**
 * Venue promotion tiers. Venues have one tier for their events and one for their
 * food & drink specials; an admin can also hide a single listing from its venue's tier.
 */

export type PromotionTier = 'standard' | 'boosted' | 'promoted' | 'featured';
export type PromotionKind = 'events' | 'specials';

/** Highest first */
export const PROMOTION_TIERS: PromotionTier[] = ['featured', 'promoted', 'boosted', 'standard'];

export const promotionTierLabels: Record<PromotionTier, string> = {
  featured: 'Featured',
  promoted: 'Promoted',
  boosted: 'Boosted',
  standard: 'Standard',
};

/** What each tier does on the site (keep in sync with the sorting rules below and on the pages) */
export const PROMOTION_RULES: Record<PromotionKind, Record<PromotionTier, string>> = {
  events: {
    featured:
      '1 upcoming event gets a spot in the Featured row at the top of the home page (up to 3 venues, ahead of the most-saved events). Major Venues also get the single Featured slot on Coming up. First in line for the home page’s Today list.',
    promoted: 'Next in line after Featured for the 9 spots in the home page’s Today list on days they have an event.',
    boosted: 'Ahead of Standard venues (after Promoted) for the home page’s Today spots.',
    standard: 'No priority — listed by time with everyone else.',
  },
  specials: {
    featured:
      'First in line for the 6 Today’s specials spots on the home page (1 special per venue there), and listed first among specials at the same time on Browse → Food & Drink.',
    promoted: 'Next in line after Featured for Today’s specials on the home page (1 special per venue there).',
    boosted: 'Ahead of Standard (after Promoted) for Today’s specials — every special the venue has can show.',
    standard: 'No priority — listed by time with everyone else.',
  },
};

export function isPromotionTier(value: unknown): value is PromotionTier {
  return typeof value === 'string' && (PROMOTION_TIERS as string[]).includes(value);
}

export function normalizeTier(value: unknown): PromotionTier {
  return isPromotionTier(value) ? value : 'standard';
}

export function tierPriority(tier?: string): number {
  switch (tier) {
    case 'featured':
      return 4;
    case 'promoted':
      return 3;
    case 'boosted':
      return 2;
    default:
      return 1;
  }
}

interface TierVenue {
  promotionTier?: string;
  eventPromotionTier?: string;
  specialPromotionTier?: string;
}

/** The venue's tier for events or for specials */
export function venueTier(venue: TierVenue | undefined | null, kind: PromotionKind): PromotionTier {
  if (!venue) return 'standard';
  const tier = kind === 'specials' ? venue.specialPromotionTier : venue.eventPromotionTier;
  return normalizeTier(tier ?? venue.promotionTier);
}

/** The tier a single listing is shown at (Standard when an admin hid it from promotion) */
export function listingTier(event: {
  categories: string[];
  hiddenFromPromotion?: boolean;
  venue?: TierVenue | null;
}): PromotionTier {
  if (event.hiddenFromPromotion) return 'standard';
  return venueTier(event.venue, event.categories.includes('food-deal') ? 'specials' : 'events');
}

export function listingPriority(event: Parameters<typeof listingTier>[0]): number {
  return tierPriority(listingTier(event));
}
