import { createSupabaseServerClient } from './supabaseServer';

export interface AuthUser {
  id: string;
  email: string;
  name: string;
  role: 'user' | 'organizer' | 'admin';
  venueName?: string;
  createdAt: string;
  /** Admins, plus organizers an admin has verified (stored in auth app_metadata) */
  isVerifiedOrganizer: boolean;
  /** ISO timestamp of a pending "verified organizer" request, if any */
  verificationRequestedAt?: string;
  /** Organizer accounts are approved by an admin after sign-up (accounts made before sign-up applications existed count as approved) */
  organizerApproved: boolean;
  /** Venues this organizer is associated with (set by an admin on approval) */
  organizerVenueIds: string[];
}

interface Profile {
  id: string;
  role: 'user' | 'organizer' | 'admin';
  name: string | null;
  venue_name: string | null;
}

export function isOrganizerApproved(
  role: string,
  metadata: Record<string, unknown>,
  appMetadata: Record<string, unknown>
): boolean {
  if (role === 'admin') return true;
  if (role !== 'organizer') return false;
  return appMetadata.organizerApproved === true || appMetadata.verifiedOrganizer === true || !metadata.organizerApplication;
}

export async function getCurrentUser(): Promise<AuthUser | null> {
  try {
    const supabase = await createSupabaseServerClient();
    
    const { data: { user }, error } = await supabase.auth.getUser();
    
    if (error || !user) {
      return null;
    }

    // Fetch role from profiles table
    const { data: profile } = await supabase
      .from('profiles')
      .select('id, role, name, venue_name')
      .eq('id', user.id)
      .single();

    const metadata = user.user_metadata || {};
    const appMetadata = user.app_metadata || {};
    const role = (profile?.role as AuthUser['role']) || 'user';
    
    return {
      id: user.id,
      email: user.email || '',
      name: profile?.name || metadata.name || metadata.full_name || user.email?.split('@')[0] || 'User',
      role, // Role from profiles table
      venueName: profile?.venue_name || metadata.venueName,
      createdAt: user.created_at,
      isVerifiedOrganizer: role === 'admin' || (role === 'organizer' && appMetadata.verifiedOrganizer === true),
      verificationRequestedAt: appMetadata.verificationRequestedAt || undefined,
      organizerApproved: isOrganizerApproved(role, metadata, appMetadata),
      organizerVenueIds: Array.isArray(appMetadata.organizerVenueIds) ? appMetadata.organizerVenueIds : [],
    };
  } catch (error) {
    console.error('Error getting current user:', error);
    return null;
  }
}

export async function requireAuth(): Promise<AuthUser> {
  const user = await getCurrentUser();
  if (!user) {
    throw new Error('Unauthorized');
  }
  return user;
}

export async function requireAdmin(): Promise<AuthUser> {
  const user = await getCurrentUser();
  if (!user || user.role !== 'admin') {
    throw new Error('Forbidden');
  }
  return user;
}

/** Verified organizers and admins publish listings without admin review */
export function canAutoPublish(user: AuthUser | null): boolean {
  return !!user && user.isVerifiedOrganizer;
}
