import { z } from 'zod';

/**
 * Validation schemas for venue-related operations
 */

export const CreateVenueSchema = z.object({
  name: z.string().min(1, 'Name is required').max(200, 'Name must be less than 200 characters'),
  address: z.string().min(1, 'Address is required').max(500, 'Address must be less than 500 characters'),
  neighborhood: z.string().max(100).optional().or(z.literal('')),
  website: z.string().url('Website must be a valid URL').optional().or(z.literal('')),
  imageUrl: z.string().url('Image URL must be a valid URL').optional().or(z.literal('')),
});

export const UpdateVenueSchema = z.object({
  name: z.string().min(1).max(200).optional(),
  address: z.string().min(1).max(500).optional(),
  neighborhood: z.string().max(100).optional().nullable(),
  website: z.string().url().optional().nullable(),
  imageUrl: z.string().url().optional().nullable(),
  promotionTier: z.enum(['standard', 'promoted', 'featured']).optional(),
});
