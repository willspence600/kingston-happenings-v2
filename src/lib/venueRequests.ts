import type { User } from '@supabase/supabase-js';
import { Prisma } from '@prisma/client';
import prisma from './prisma';
import { composeAddress, normalizeApplication, type OrganizerVenueApplication } from './organizerApplication';
import { parseVenueDetails } from './venueDetails';

/**
 * Venues an approved organizer asks to add to their profile after sign-up. Stored on the
 * auth user's app_metadata (`venueRequests`, written only by the server) until an admin
 * approves or declines them.
 */
export interface VenueRequest extends OrganizerVenueApplication {
  id: string;
  requestedAt: string;
}

export const MAX_PENDING_VENUE_REQUESTS = 10;

export function readVenueRequests(u: Pick<User, 'app_metadata'>): VenueRequest[] {
  const list = (u.app_metadata || {}).venueRequests;
  if (!Array.isArray(list)) return [];
  return list
    .filter((r) => r && typeof r === 'object' && typeof r.id === 'string')
    .map((r) => {
      // Reuse the application normalizer so a request has the same shape as a sign-up venue
      const venue = normalizeApplication({ venues: [r] })!.venues[0];
      return { ...venue, id: r.id as string, requestedAt: typeof r.requestedAt === 'string' ? r.requestedAt : '' };
    });
}

/**
 * Link one venue from a sign-up application or venue request: a claimed venue gets the
 * details the organizer filled in, and a new venue is created. Returns the venue id, or
 * null if a claimed venue no longer exists.
 */
export async function linkOrganizerVenue(
  v: OrganizerVenueApplication,
  accessibility: { accessibility: string[]; accessibilityNotes: string } = { accessibility: [], accessibilityNotes: '' }
): Promise<string | null> {
  const details = parseVenueDetails({
    venueTypes: v.venueTypes,
    phone: v.phone,
    instagram: v.instagram,
    about: v.about,
    hours: v.hours,
    accessibility: accessibility.accessibility,
    accessibilityNotes: accessibility.accessibilityNotes,
  });

  if (v.claimedVenueId) {
    const existing = await prisma.venue.findUnique({ where: { id: v.claimedVenueId } });
    if (!existing) return null;
    // Only fill in what the organizer actually provided
    const update: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(details)) {
      if (value === Prisma.DbNull) continue;
      if (Array.isArray(value) ? value.length > 0 : value !== null && value !== undefined) update[key] = value;
    }
    if (v.website.trim()) update.website = v.website.trim();
    if (v.logoUrl && !existing.imageUrl) update.imageUrl = v.logoUrl;
    await prisma.venue.update({ where: { id: existing.id }, data: update });
    return existing.id;
  }

  if (!v.name.trim()) return null;
  const created = await prisma.venue.create({
    data: {
      name: v.name.trim(),
      address: composeAddress(v) || 'Kingston, ON',
      website: v.website.trim() || null,
      imageUrl: v.logoUrl || null,
      status: 'approved',
      ...details,
    },
  });
  return created.id;
}
