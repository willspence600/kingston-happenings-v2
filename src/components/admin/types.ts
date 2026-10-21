import type { Venue } from '@/types/event';
import type { VenueDetailsDraft } from '@/components/venues';

export type { AdminOrganizer } from '@/app/api/admin/organizers/route';
export type { AdminVenueRequest } from '@/app/api/admin/venue-requests/route';

export type AdminTab = 'review' | 'published' | 'venues' | 'promotions' | 'organizers' | 'users' | 'site';

export type ToastType = 'success' | 'error' | 'info';
export type ShowToast = (message: string, type?: ToastType) => void;

/** Venue as returned by /api/venues (any status) */
export interface AdminVenue extends Venue {
  status?: string;
  eventCount?: number;
  /** Edited venue details, set by the edit form */
  details?: VenueDetailsDraft;
}

export interface OrganizerApplicationVenue {
  claimedVenueId?: string;
  claimedVenueName: string | null;
  name: string;
  venueTypes: string[];
  address: string;
  phone: string;
  website: string;
  instagram: string;
  about: string;
  logoUrl?: string;
}

export interface OrganizerApplicationItem {
  id: string;
  email: string;
  emailConfirmed: boolean;
  name: string;
  createdAt: string;
  application: {
    phone: string;
    role: string;
    venues: OrganizerApplicationVenue[];
    accessibility: string[];
    accessibilityNotes: string;
    confirmMethod: 'email' | 'document';
    documentUrl: string | null;
    notes: string;
    newsletter: boolean;
    submittedAt: string;
  };
}
