import { createSupabaseServerClient } from '@/lib/supabaseServer';
import { supabaseAdmin } from '@/lib/supabaseAdmin';
import prisma from '@/lib/prisma';
import { NotFoundError, UnauthorizedError } from './errors';

export interface UpdateProfileData {
  name?: string;
  venueName?: string;
}

export class UsersService {
  /**
   * Get user profile by ID (from Supabase, not Prisma)
   */
  static async findById(id: string) {
    const { data: profile, error } = await supabaseAdmin
      .from('profiles')
      .select('id, role, name, venue_name')
      .eq('id', id)
      .single();

    if (error || !profile) {
      throw new NotFoundError('User profile not found');
    }

    return profile;
  }

  /**
   * Update user profile
   */
  static async updateProfile(id: string, data: UpdateProfileData) {
    const supabase = await createSupabaseServerClient();

    // Update user metadata in Supabase Auth
    if (data.name) {
      const { error: authError } = await supabase.auth.updateUser({
        data: {
          name: data.name,
          full_name: data.name,
        },
      });

      if (authError) {
        throw new Error(`Failed to update auth metadata: ${authError.message}`);
      }
    }

    // Update profile in profiles table
    const updateData: any = {};
    if (data.name !== undefined) updateData.name = data.name;
    if (data.venueName !== undefined) updateData.venue_name = data.venueName;

    const { data: profile, error } = await supabaseAdmin
      .from('profiles')
      .update(updateData)
      .eq('id', id)
      .select()
      .single();

    if (error) {
      throw new Error(`Failed to update profile: ${error.message}`);
    }

    return profile;
  }

  /**
   * Delete user account and all related data
   */
  static async deleteAccount(id: string) {
    // Step 1: Delete all events submitted by this user
    try {
      await prisma.event.deleteMany({
        where: {
          submittedById: id,
        },
      });
    } catch (error) {
      console.error('Error deleting events:', error);
      // Continue even if this fails
    }

    // Step 2: Delete all likes by this user
    try {
      await prisma.like.deleteMany({
        where: {
          userId: id,
        },
      });
    } catch (error) {
      console.error('Error deleting likes:', error);
      // Continue even if this fails
    }

    // Step 3: Delete the profile from Supabase
    try {
      await supabaseAdmin
        .from('profiles')
        .delete()
        .eq('id', id);
    } catch (error) {
      console.error('Error deleting profile:', error);
      // Continue even if this fails
    }

    // Step 4: Delete the auth user from Supabase
    try {
      const { error } = await supabaseAdmin.auth.admin.deleteUser(id);
      if (error) {
        throw new Error(`Failed to delete auth user: ${error.message}`);
      }
    } catch (error) {
      console.error('Error deleting auth user:', error);
      throw error;
    }

    return { success: true };
  }
}
