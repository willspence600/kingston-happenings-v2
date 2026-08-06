/**
 * Shared helpers for transforming Prisma Event rows into the frontend Event shape.
 */

import { getAbsoluteImageUrl } from '@/utils/url';

type SeriesRel = {
  recurrencePattern: string;
  recurrenceDays: number[];
  seriesEndDate: string | null;
  seriesStartDate?: string;
} | null;

type VenueRel = {
  id: string;
  name: string;
  address: string;
  neighborhood?: string | null;
  website?: string | null;
  imageUrl?: string | null;
  coverImageUrl?: string | null;
  promotionTier?: string | null;
  status?: string;
  [key: string]: unknown;
};

type CategoryRel = { name: string };

export type EventWithRelations = {
  id: string;
  title: string;
  description: string;
  date: string;
  startTime: string;
  endTime: string | null;
  price: string | null;
  ticketUrl: string | null;
  imageUrl: string | null;
  featured: boolean;
  status: string;
  isAllDay?: boolean;
  seriesId?: string | null;
  detachedFromSeries?: boolean;
  submittedById?: string | null;
  venue: VenueRel;
  categories: CategoryRel[];
  series?: SeriesRel;
  _count?: { likes: number };
  likeCount?: number;
};

export function transformVenue(venue: VenueRel) {
  return {
    id: venue.id,
    name: venue.name,
    address: venue.address,
    neighborhood: venue.neighborhood ?? undefined,
    website: venue.website ?? undefined,
    imageUrl: getAbsoluteImageUrl(venue.imageUrl ?? null) ?? undefined,
    coverImageUrl: getAbsoluteImageUrl(venue.coverImageUrl ?? null) ?? undefined,
    promotionTier: venue.promotionTier ?? undefined,
  };
}

export function transformEvent(event: EventWithRelations, options?: { stripDataUrls?: boolean }) {
  const safeImageUrl =
    options?.stripDataUrls && event.imageUrl?.startsWith('data:')
      ? null
      : event.imageUrl;

  const series = event.series ?? null;
  const isRecurring = Boolean(event.seriesId && series);

  return {
    id: event.id,
    title: event.title,
    description: event.description,
    date: event.date,
    startTime: event.startTime,
    endTime: event.endTime ?? undefined,
    price: event.price ?? undefined,
    ticketUrl: event.ticketUrl ?? undefined,
    imageUrl: getAbsoluteImageUrl(safeImageUrl),
    featured: event.featured,
    status: event.status,
    isAllDay: event.isAllDay ?? false,
    venue: transformVenue(event.venue),
    categories: event.categories.map((c) => c.name),
    likeCount: event._count?.likes ?? event.likeCount ?? 0,
    // Series-derived recurrence fields (backward-compatible shape)
    isRecurring,
    seriesId: event.seriesId ?? undefined,
    detachedFromSeries: event.detachedFromSeries ?? false,
    recurrencePattern: series?.recurrencePattern ?? undefined,
    recurrenceDays: series?.recurrenceDays ?? undefined,
    recurrenceDay: series?.recurrenceDays?.[0] ?? undefined,
    recurrenceEndDate: series?.seriesEndDate ?? undefined,
    submittedById: event.submittedById || undefined,
  };
}

/** Prisma include block for events that need series + venue + categories */
export const eventListInclude = {
  venue: true,
  categories: true,
  series: true,
  _count: {
    select: { likes: true },
  },
} as const;
