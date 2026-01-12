/**
 * Venues API service
 * Client-side API functions for venue operations
 */

import type { Venue } from '@/types/event';

/**
 * API response for venues list
 */
export interface VenuesResponse {
  venues: Venue[];
}

/**
 * API response for single venue
 */
export interface VenueResponse {
  venue: Venue;
}

/**
 * Fetch all approved venues
 */
export async function fetchVenues(): Promise<Venue[]> {
  const res = await fetch('/api/venues');
  if (!res.ok) {
    throw new Error('Failed to fetch venues');
  }
  const data: VenuesResponse = await res.json();
  return data.venues || [];
}

/**
 * Fetch a single venue by ID
 */
export async function fetchVenueById(id: string): Promise<Venue> {
  const res = await fetch(`/api/venues/${id}`);
  if (!res.ok) {
    throw new Error('Failed to fetch venue');
  }
  const data: VenueResponse = await res.json();
  return data.venue;
}

/**
 * Fetch pending venues (admin only)
 */
export async function fetchPendingVenues(): Promise<Venue[]> {
  const res = await fetch('/api/venues?status=pending');
  if (!res.ok) {
    if (res.status === 403) {
      throw new Error('Forbidden: Admin access required');
    }
    throw new Error('Failed to fetch pending venues');
  }
  const data: VenuesResponse = await res.json();
  return data.venues || [];
}

/**
 * Approve a venue (admin only)
 */
export async function approveVenue(venueId: string): Promise<void> {
  const res = await fetch(`/api/venues/${venueId}/approve`, {
    method: 'POST',
  });

  if (!res.ok) {
    throw new Error('Failed to approve venue');
  }
}

/**
 * Reject a venue (admin only)
 */
export async function rejectVenue(venueId: string): Promise<void> {
  const res = await fetch(`/api/venues/${venueId}/reject`, {
    method: 'POST',
  });

  if (!res.ok) {
    throw new Error('Failed to reject venue');
  }
}

/**
 * Update venue details
 */
export async function updateVenue(venueId: string, data: Partial<Venue>): Promise<Venue> {
  const res = await fetch(`/api/venues/${venueId}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });

  if (!res.ok) {
    throw new Error('Failed to update venue');
  }

  const response: VenueResponse = await res.json();
  return response.venue;
}

