import { z } from 'zod';

/**
 * Validation schemas for user-related operations
 */

export const UpdateProfileSchema = z.object({
  name: z.string().min(1, 'Name is required').max(100, 'Name must be less than 100 characters').optional(),
  venueName: z.string().max(200, 'Venue name must be less than 200 characters').optional(),
});
