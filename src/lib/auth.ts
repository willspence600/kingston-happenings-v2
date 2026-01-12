import { createSupabaseServerClient } from './supabaseServer';

export interface AuthUser {
  id: string;
  email: string;
  name: string;
  role: 'user' | 'organizer' | 'admin';
  venueName?: string;
  createdAt: string;
}

interface Profile {
  id: string;
  role: 'user' | 'organizer' | 'admin';
  name: string | null;
  venue_name: string | null;
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
    
    return {
      id: user.id,
      email: user.email || '',
      name: profile?.name || metadata.name || metadata.full_name || user.email?.split('@')[0] || 'User',
      role: (profile?.role as AuthUser['role']) || 'user', // Role from profiles table
      venueName: profile?.venue_name || metadata.venueName,
      createdAt: user.created_at,
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
