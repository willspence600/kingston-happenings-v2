import type { VenueHours } from '@/types/event';

/**
 * Organizer sign-up applications are stored on the auth user's user_metadata
 * (`organizerApplication`) until an admin approves them.
 */

export interface OrganizerVenueApplication {
  /** Set when the organizer claimed a venue that's already on Kingston Happenings */
  claimedVenueId?: string;
  name: string;
  venueTypes: string[];
  street: string;
  unit: string;
  city: string;
  postal: string;
  phone: string;
  website: string;
  instagram: string;
  about: string;
  hours: VenueHours;
  logoUrl?: string;
}

export interface OrganizerApplication {
  phone: string;
  role: string;
  venues: OrganizerVenueApplication[];
  accessibility: string[];
  accessibilityNotes: string;
  confirmMethod: 'email' | 'document';
  documentPath?: string;
  notes: string;
  agreedToTerms: boolean;
  newsletter: boolean;
  submittedAt: string;
}

export function composeAddress(v: Pick<OrganizerVenueApplication, 'street' | 'unit' | 'city' | 'postal'>): string {
  const street = [v.street.trim(), v.unit.trim()].filter(Boolean).join(', ');
  return [street, v.city.trim(), v.postal.trim()].filter(Boolean).join(', ');
}

const str = (v: unknown) => (typeof v === 'string' ? v : '');
const list = (v: unknown) => (Array.isArray(v) ? v.filter((x): x is string => typeof x === 'string') : []);

function normalizeVenue(raw: Record<string, unknown>, claimedVenueId?: string): OrganizerVenueApplication {
  return {
    claimedVenueId: claimedVenueId || str(raw.claimedVenueId) || undefined,
    name: str(raw.name),
    venueTypes: list(raw.venueTypes ?? raw.types),
    street: str(raw.street),
    unit: str(raw.unit),
    city: str(raw.city),
    postal: str(raw.postal),
    phone: str(raw.phone),
    website: str(raw.website),
    instagram: str(raw.instagram),
    about: str(raw.about),
    hours: (raw.hours && typeof raw.hours === 'object' ? raw.hours : {}) as VenueHours,
    logoUrl: str(raw.logoUrl) || undefined,
  };
}

/** Read an application from user_metadata, including the older single-venue shape */
export function normalizeApplication(raw: unknown, fallbackVenueName?: string): OrganizerApplication | null {
  if (!raw || typeof raw !== 'object') return null;
  const app = raw as Record<string, unknown>;

  let venues: OrganizerVenueApplication[];
  if (Array.isArray(app.venues)) {
    venues = app.venues.filter((v) => v && typeof v === 'object').map((v) => normalizeVenue(v as Record<string, unknown>));
  } else if (app.venue && typeof app.venue === 'object') {
    venues = [normalizeVenue(app.venue as Record<string, unknown>)];
  } else if (app.claimedVenueId) {
    venues = [normalizeVenue({ name: fallbackVenueName || '' }, str(app.claimedVenueId))];
  } else {
    venues = [];
  }

  return {
    phone: str(app.phone),
    role: str(app.role),
    venues,
    accessibility: list(app.accessibility),
    accessibilityNotes: str(app.accessibilityNotes),
    confirmMethod: app.confirmMethod === 'document' ? 'document' : 'email',
    documentPath: str(app.documentPath) || undefined,
    notes: str(app.notes),
    agreedToTerms: app.agreedToTerms === true,
    newsletter: app.newsletter === true,
    submittedAt: str(app.submittedAt),
  };
}
