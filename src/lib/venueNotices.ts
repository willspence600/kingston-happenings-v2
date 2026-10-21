import type { User } from '@supabase/supabase-js';
import { supabaseAdmin } from './supabaseAdmin';
import { listAllAuthUsers, organizerVenueIds } from './organizers';

/**
 * Notices shown to a venue's organizers when an admin changes the venue or its
 * listings. Stored on each organizer's auth app_metadata (`venueNotices`), newest first.
 */
export interface VenueNotice {
  id: string;
  venueId: string;
  venueName: string;
  /** e.g. "An admin updated your venue details" */
  message: string;
  /** e.g. ["Phone: 613-555-0100 → 613-555-0199", "Opening hours"] */
  changes: string[];
  createdAt: string;
}

const MAX_NOTICES = 30;

export function readVenueNotices(u: Pick<User, 'app_metadata'>): VenueNotice[] {
  const list = (u.app_metadata || {}).venueNotices;
  return Array.isArray(list) ? (list as VenueNotice[]).filter((n) => n && typeof n.id === 'string') : [];
}

/** Add a notice for every organizer associated with the venue. Never throws. */
export async function notifyVenueOrganizers(venueId: string, venueName: string, message: string, changes: string[]) {
  try {
    const users = await listAllAuthUsers();
    const targets = users.filter((u) => organizerVenueIds(u).includes(venueId));
    if (targets.length === 0) return;
    const notice: VenueNotice = {
      id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      venueId,
      venueName,
      message,
      changes,
      createdAt: new Date().toISOString(),
    };
    await Promise.all(
      targets.map((u) =>
        supabaseAdmin.auth.admin.updateUserById(u.id, {
          app_metadata: { ...(u.app_metadata || {}), venueNotices: [notice, ...readVenueNotices(u)].slice(0, MAX_NOTICES) },
        })
      )
    );
  } catch (error) {
    console.error('[Venue notices] Failed to notify organizers:', error);
  }
}

const display = (value: unknown): string => {
  if (value === null || value === undefined || value === '') return '(none)';
  if (typeof value === 'boolean') return value ? 'Yes' : 'No';
  if (Array.isArray(value)) return value.length ? value.join(', ') : '(none)';
  const s = String(value);
  if (s.startsWith('data:')) return 'new image';
  return s.length > 60 ? `${s.slice(0, 57)}…` : s;
};

const same = (a: unknown, b: unknown) => JSON.stringify(a ?? null) === JSON.stringify(b ?? null);

/**
 * Describe what changed between two records. `fields` maps a key to its label;
 * keys listed in `summaryOnly` are reported by label alone (e.g. long text or JSON).
 */
export function describeChanges(
  before: Record<string, unknown>,
  after: Record<string, unknown>,
  fields: Record<string, string>,
  summaryOnly: string[] = []
): string[] {
  const changes: string[] = [];
  for (const [key, label] of Object.entries(fields)) {
    if (!(key in after) || same(before[key], after[key])) continue;
    changes.push(summaryOnly.includes(key) ? `${label} updated` : `${label}: ${display(before[key])} → ${display(after[key])}`);
  }
  return changes;
}
