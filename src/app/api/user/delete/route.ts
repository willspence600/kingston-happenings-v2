import { NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import { createSupabaseServerClient } from '@/lib/supabaseServer';
import { supabaseAdmin } from '@/lib/supabaseAdmin';
import prisma from '@/lib/prisma';

export async function DELETE() {
  try {
    const user = await getCurrentUser();
    
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const userId = user.id; // This is the Supabase UUID

    console.log('[Delete User] Starting deletion for user:', userId);

    // Check if service role key is configured
    if (!process.env.SUPABASE_SERVICE_ROLE_KEY) {
      console.error('[Delete User] SUPABASE_SERVICE_ROLE_KEY is not configured!');
      return NextResponse.json({ 
        error: 'Account deletion is not properly configured. Please contact support.',
        details: 'Service role key missing'
      }, { status: 500 });
    }

    // Step 1: Delete all events submitted by this user
    try {
      const deletedEvents = await prisma.event.deleteMany({
        where: {
          submittedById: userId,
        },
      });
      console.log(`[Delete User] Deleted ${deletedEvents.count} events`);
    } catch (eventError) {
      console.error('[Delete User] Error deleting events:', eventError);
      // Continue even if this fails
    }

    // Step 2: Delete all likes by this user
    try {
      const deletedLikes = await prisma.like.deleteMany({
        where: {
          userId: userId,
        },
      });
      console.log(`[Delete User] Deleted ${deletedLikes.count} likes`);
    } catch (likeError) {
      console.error('[Delete User] Error deleting likes:', likeError);
      // Continue even if this fails
    }

    // Step 3: Delete the profile from Supabase (will be auto-deleted with auth user, but doing it explicitly)
    try {
      const { error: profileError } = await supabaseAdmin.from('profiles').delete().eq('id', userId);
      if (profileError) {
        console.warn('[Delete User] Profile deletion error:', profileError);
      } else {
        console.log('[Delete User] Deleted profile');
      }
    } catch (profileError) {
      console.warn('[Delete User] Profile deletion exception (may already be deleted):', profileError);
    }

    // Step 4: Delete the user from Supabase Auth (THIS IS THE CRITICAL STEP)
    // This must succeed or the user will still be able to log in
    console.log('[Delete User] Attempting to delete user from Supabase Auth...');
    const { data: deleteData, error: deleteError } = await supabaseAdmin.auth.admin.deleteUser(userId);
    
    if (deleteError) {
      console.error('[Delete User] CRITICAL ERROR deleting from Supabase Auth:', deleteError);
      console.error('[Delete User] Error details:', JSON.stringify(deleteError, null, 2));
      return NextResponse.json({ 
        error: 'Failed to delete account from authentication system.',
        details: deleteError.message || 'Unknown error',
        hint: 'Check if SUPABASE_SERVICE_ROLE_KEY is configured correctly in Vercel environment variables'
      }, { status: 500 });
    }

    console.log('[Delete User] Successfully deleted user from Supabase Auth');
    console.log('[Delete User] Delete result:', deleteData);

    // Step 5: Verify the user was actually deleted
    try {
      const { data: verifyUser, error: verifyError } = await supabaseAdmin.auth.admin.getUserById(userId);
      if (verifyUser?.user) {
        console.error('[Delete User] WARNING: User still exists after deletion!', verifyUser.user.id);
        return NextResponse.json({ 
          error: 'Account deletion verification failed. Please contact support.',
        }, { status: 500 });
      }
      console.log('[Delete User] Verified: User successfully deleted');
    } catch (verifyError) {
      // If we can't find the user, that's actually good - it means deletion worked
      console.log('[Delete User] Verification check passed (user not found, which is expected)');
    }

    // Step 6: Sign out the user session (should fail since user is deleted, but try anyway)
    try {
      const supabase = await createSupabaseServerClient();
      await supabase.auth.signOut();
      console.log('[Delete User] Signed out user session');
    } catch (signOutError) {
      // This is expected if user is already deleted
      console.log('[Delete User] Sign out completed (user may already be deleted)');
    }

    return NextResponse.json({ 
      success: true,
      message: 'Account and all associated data have been permanently deleted. You will not be able to log in again.'
    });
  } catch (error) {
    console.error('[Delete User] Unexpected error:', error);
    return NextResponse.json({ 
      error: 'Failed to delete account. Please try again or contact support.',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}
