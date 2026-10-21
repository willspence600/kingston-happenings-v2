import type { User } from '@supabase/supabase-js';
import { supabaseAdmin } from './supabaseAdmin';
import { isOrganizerApproved } from './auth';

const PER_PAGE = 1000;

/** Every auth user, paging through the admin API */
export async function listAllAuthUsers(): Promise<User[]> {
  const users: User[] = [];
  for (let page = 1; ; page++) {
    const { data, error } = await supabaseAdmin.auth.admin.listUsers({ page, perPage: PER_PAGE });
    if (error) throw error;
    users.push(...data.users);
    if (data.users.length < PER_PAGE) break;
  }
  return users;
}

export function displayName(u: User): string {
  const meta = u.user_metadata || {};
  return meta.name || meta.full_name || u.email?.split('@')[0] || 'User';
}

export function organizerVenueIds(u: User): string[] {
  const ids = (u.app_metadata || {}).organizerVenueIds;
  return Array.isArray(ids) ? ids.filter((id): id is string => typeof id === 'string') : [];
}

export interface VenueAssociate {
  id: string;
  name: string;
  email: string;
  role: string | null;
  isVerifiedOrganizer: boolean;
}

/** Approved organizers associated with a venue */
export async function getVenueAssociates(venueId: string): Promise<VenueAssociate[]> {
  const users = await listAllAuthUsers();
  return users
    .filter((u) => {
      const meta = u.user_metadata || {};
      const app = u.app_metadata || {};
      return organizerVenueIds(u).includes(venueId) && isOrganizerApproved('organizer', meta, app);
    })
    .map((u) => ({
      id: u.id,
      name: displayName(u),
      email: u.email || '',
      role: (u.user_metadata?.organizerApplication?.role as string | undefined) || null,
      isVerifiedOrganizer: u.app_metadata?.verifiedOrganizer === true,
    }))
    .sort((a, b) => a.name.localeCompare(b.name));
}
