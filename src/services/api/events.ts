/**
 * Events API service
 * Client-side API functions for event operations
 */

import type { Event, Venue, EventCategory } from '@/types/event';

/**
 * Event submission data
 */
export interface EventSubmission {
  title: string;
  description: string;
  date: string;
  startTime: string;
  endTime?: string;
  venueId?: string;
  newVenueName?: string;
  newVenueAddress?: string;
  categories: EventCategory[];
  price?: string;
  ticketUrl?: string;
  imageUrl?: string;
  isRecurring?: boolean;
  recurrencePattern?: string;
  recurrenceEndDate?: string;
}

/**
 * API response for events list
 */
export interface EventsResponse {
  events: Event[];
}

/**
 * API response for single event
 */
export interface EventResponse {
  event: Event;
  totalCreated?: number;
}

/**
 * Transform raw API response to Event type
 */
function transformEvent(e: Event): Event {
  return {
    ...e,
    venue: e.venue as Venue,
    categories: e.categories as EventCategory[],
  };
}

/**
 * Fetch all approved events
 */
export async function fetchEvents(): Promise<Event[]> {
  const res = await fetch('/api/events');
  if (!res.ok) {
    throw new Error('Failed to fetch events');
  }
  const data: EventsResponse = await res.json();
  return data.events?.map(transformEvent) || [];
}

/**
 * Fetch pending events (admin only)
 */
export async function fetchPendingEvents(): Promise<Event[]> {
  const res = await fetch('/api/events?status=pending');
  if (!res.ok) {
    if (res.status === 403) {
      throw new Error('Forbidden: Admin access required');
    }
    throw new Error('Failed to fetch pending events');
  }
  const data: EventsResponse = await res.json();
  return data.events?.map(transformEvent) || [];
}

/**
 * Fetch events by date
 */
export async function fetchEventsByDate(date: string): Promise<Event[]> {
  const res = await fetch(`/api/events?date=${encodeURIComponent(date)}`);
  if (!res.ok) {
    throw new Error('Failed to fetch events');
  }
  const data: EventsResponse = await res.json();
  return data.events?.map(transformEvent) || [];
}

/**
 * Fetch events by category
 */
export async function fetchEventsByCategory(category: string): Promise<Event[]> {
  const res = await fetch(`/api/events?category=${encodeURIComponent(category)}`);
  if (!res.ok) {
    throw new Error('Failed to fetch events');
  }
  const data: EventsResponse = await res.json();
  return data.events?.map(transformEvent) || [];
}

/**
 * Fetch events by venue
 */
export async function fetchEventsByVenue(venueId: string): Promise<Event[]> {
  const res = await fetch(`/api/events?venueId=${encodeURIComponent(venueId)}`);
  if (!res.ok) {
    throw new Error('Failed to fetch events');
  }
  const data: EventsResponse = await res.json();
  return data.events?.map(transformEvent) || [];
}

/**
 * Fetch a single event by ID
 */
export async function fetchEventById(id: string): Promise<Event> {
  const res = await fetch(`/api/events/${id}`);
  if (!res.ok) {
    throw new Error('Failed to fetch event');
  }
  const data: EventResponse = await res.json();
  return transformEvent(data.event);
}

/**
 * Submit a new event
 */
export async function submitEvent(eventData: EventSubmission): Promise<Event> {
  const res = await fetch('/api/events', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(eventData),
  });

  const data = await res.json();

  if (!res.ok) {
    throw new Error(data.error || 'Failed to submit event');
  }

  return transformEvent(data.event);
}

/**
 * Approve an event (admin only)
 */
export async function approveEvent(eventId: string): Promise<void> {
  const res = await fetch(`/api/events/${eventId}/approve`, {
    method: 'POST',
  });

  if (!res.ok) {
    throw new Error('Failed to approve event');
  }
}

/**
 * Reject an event (admin only)
 */
export async function rejectEvent(eventId: string): Promise<void> {
  const res = await fetch(`/api/events/${eventId}/reject`, {
    method: 'POST',
  });

  if (!res.ok) {
    throw new Error('Failed to reject event');
  }
}

/**
 * Cancel an event
 */
export async function cancelEvent(eventId: string): Promise<void> {
  const res = await fetch(`/api/events/${eventId}/cancel`, {
    method: 'POST',
  });

  if (!res.ok) {
    throw new Error('Failed to cancel event');
  }
}

/**
 * Delete an event
 */
export async function deleteEvent(eventId: string): Promise<void> {
  const res = await fetch(`/api/events/${eventId}`, {
    method: 'DELETE',
  });

  if (!res.ok) {
    throw new Error('Failed to delete event');
  }
}

/**
 * Fetch user's submitted events
 */
export async function fetchMySubmissions(): Promise<Event[]> {
  const res = await fetch('/api/events/my-submissions');
  if (!res.ok) {
    throw new Error('Failed to fetch submissions');
  }
  const data: EventsResponse = await res.json();
  return data.events?.map(transformEvent) || [];
}

/**
 * Approve all recurring events by parent ID
 */
export async function approveRecurringEvents(parentId: string): Promise<void> {
  const res = await fetch(`/api/events/approve-recurring/${parentId}`, {
    method: 'POST',
  });

  if (!res.ok) {
    throw new Error('Failed to approve recurring events');
  }
}

/**
 * Reject all recurring events by parent ID
 */
export async function rejectRecurringEvents(parentId: string): Promise<void> {
  const res = await fetch(`/api/events/reject-recurring/${parentId}`, {
    method: 'POST',
  });

  if (!res.ok) {
    throw new Error('Failed to reject recurring events');
  }
}
