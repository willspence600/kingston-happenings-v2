import { z } from 'zod';

/**
 * Validation schemas for event-related operations
 */

export const CreateEventSchema = z.object({
  title: z.string().min(1, 'Title is required').max(200, 'Title must be less than 200 characters'),
  description: z.string().min(1, 'Description is required').max(5000, 'Description must be less than 5000 characters'),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Date must be in YYYY-MM-DD format'),
  startTime: z.string().regex(/^\d{2}:\d{2}$/, 'Start time must be in HH:MM format'),
  endTime: z.string().regex(/^\d{2}:\d{2}$/, 'End time must be in HH:MM format').optional().or(z.literal('')),
  venueId: z.string().optional(),
  newVenueName: z.string().optional(),
  newVenueAddress: z.string().optional(),
  categories: z.array(z.string()).min(1, 'At least one category is required'),
  price: z.string().optional(),
  ticketUrl: z.string().url('Ticket URL must be a valid URL').optional().or(z.literal('')),
  imageUrl: z.string().url('Image URL must be a valid URL').optional().or(z.literal('')),
  isRecurring: z.boolean().optional(),
  recurrencePattern: z.enum(['weekly', 'biweekly', 'monthly']).optional(),
  recurrenceEndDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Recurrence end date must be in YYYY-MM-DD format').optional().or(z.literal('')),
}).refine((data) => {
  // If venueId is 'new', newVenueName and newVenueAddress must be provided
  if (data.venueId === 'new') {
    return data.newVenueName && data.newVenueAddress;
  }
  return true;
}, {
  message: 'New venue name and address are required when creating a new venue',
  path: ['newVenueName'],
});

export const UpdateEventSchema = z.object({
  title: z.string().min(1).max(200).optional(),
  description: z.string().min(1).max(5000).optional(),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  startTime: z.string().regex(/^\d{2}:\d{2}$/).optional(),
  endTime: z.string().regex(/^\d{2}:\d{2}$/).optional().or(z.literal('')),
  venueId: z.string().optional(),
  price: z.string().optional(),
  ticketUrl: z.string().url().optional().or(z.literal('')),
  imageUrl: z.string().url().optional().or(z.literal('')),
  featured: z.boolean().optional(),
  status: z.enum(['pending', 'approved', 'rejected', 'cancelled']).optional(),
});

export const EventFiltersSchema = z.object({
  status: z.enum(['pending', 'approved', 'rejected', 'cancelled', 'all']).optional(),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  category: z.string().optional(),
  venueId: z.string().optional(),
  featured: z.string().transform((val) => val === 'true').optional(),
});
