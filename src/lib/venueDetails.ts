import { Prisma } from '@prisma/client';
import type { VenueHours } from '@/types/event';

export const VENUE_DAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'] as const;

export interface VenueDetailsInput {
  venueTypes?: unknown;
  phone?: unknown;
  instagram?: unknown;
  about?: unknown;
  hours?: unknown;
  accessibility?: unknown;
  accessibilityNotes?: unknown;
}

const TIME = /^\d{2}:\d{2}$/;

function cleanString(value: unknown, max = 2000): string | null {
  if (typeof value !== 'string') return null;
  const trimmed = value.trim().slice(0, max);
  return trimmed || null;
}

function cleanList(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return [...new Set(value.filter((v): v is string => typeof v === 'string').map((v) => v.trim().slice(0, 80)).filter(Boolean))];
}

export function cleanHours(value: unknown): VenueHours | null {
  if (!value || typeof value !== 'object') return null;
  const input = value as Record<string, { open?: unknown; close?: unknown; closed?: unknown }>;
  const hours: VenueHours = {};
  for (const day of VENUE_DAYS) {
    const h = input[day];
    if (!h) continue;
    const open = typeof h.open === 'string' && TIME.test(h.open) ? h.open : '';
    const close = typeof h.close === 'string' && TIME.test(h.close) ? h.close : '';
    hours[day] = { open, close, closed: h.closed === true };
  }
  return Object.keys(hours).length > 0 ? hours : null;
}

/** Strip a leading @ or a full instagram.com URL down to the handle */
export function cleanInstagram(value: unknown): string | null {
  const raw = cleanString(value, 200);
  if (!raw) return null;
  const handle = raw
    .replace(/^https?:\/\/(www\.)?instagram\.com\//i, '')
    .replace(/^@/, '')
    .split(/[/?#]/)[0];
  return handle || null;
}

/**
 * Pick the venue detail fields out of a request body. Only keys present in the
 * body are returned, so a partial update leaves the other fields alone.
 */
export function parseVenueDetails(body: VenueDetailsInput) {
  const data: {
    venueTypes?: string[];
    phone?: string | null;
    instagram?: string | null;
    about?: string | null;
    hours?: Prisma.InputJsonValue | typeof Prisma.DbNull;
    accessibility?: string[];
    accessibilityNotes?: string | null;
  } = {};
  if (body.venueTypes !== undefined) data.venueTypes = cleanList(body.venueTypes);
  if (body.phone !== undefined) data.phone = cleanString(body.phone, 40);
  if (body.instagram !== undefined) data.instagram = cleanInstagram(body.instagram);
  if (body.about !== undefined) data.about = cleanString(body.about);
  if (body.hours !== undefined) {
    const hours = cleanHours(body.hours);
    data.hours = hours ?? Prisma.DbNull;
  }
  if (body.accessibility !== undefined) data.accessibility = cleanList(body.accessibility);
  if (body.accessibilityNotes !== undefined) data.accessibilityNotes = cleanString(body.accessibilityNotes);
  return data;
}
