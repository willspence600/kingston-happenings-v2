import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import { createSupabaseServerClient } from '@/lib/supabaseServer';

export async function PUT(request: NextRequest) {
  try {
    const user = await getCurrentUser();
    
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { name } = await request.json();

    const supabase = await createSupabaseServerClient();

    // Update user metadata in Supabase Auth
    const { data, error } = await supabase.auth.updateUser({
      data: {
        name,
        full_name: name,
      },
    });

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    // Persist the name to public.profiles, since getCurrentUser() reads
    // profiles.name first. Without this the displayed name stays stale.
    const { error: profileError } = await supabase
      .from('profiles')
      .update({ name })
      .eq('id', user.id);

    if (profileError) {
      return NextResponse.json({ error: profileError.message }, { status: 400 });
    }

    const metadata = data.user?.user_metadata || {};
    return NextResponse.json({ 
      success: true,
      user: {
        id: data.user?.id,
        name: metadata.name || metadata.full_name,
        email: data.user?.email,
        role: metadata.role || 'user',
      }
    });
  } catch (error) {
    console.error('Update user error:', error);
    return NextResponse.json({ error: 'Failed to update user' }, { status: 500 });
  }
}
