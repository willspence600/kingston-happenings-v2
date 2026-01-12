'use client';

import { createContext, useContext, useState, useEffect, ReactNode, useCallback } from 'react';
import { Event, Venue, EventCategory } from '@/types/event';
import { useAuth } from '@/contexts/AuthContext';
import { format } from 'date-fns';

interface EventsContextType {
  events: Event[];
  pendingEvents: Event[];
  venues: Venue[];
  userLikes: string[];
  likeCounts: Record<string, number>;
  isLoading: boolean;
  toggleLike: (eventId: string) => Promise<void>;
  isLiked: (eventId: string) => boolean;
  getLikeCount: (eventId: string) => number;
  submitEvent: (eventData: EventSubmission) => Promise<Event | null>;
  approveEvent: (eventId: string) => Promise<void>;
  rejectEvent: (eventId: string) => Promise<void>;
  deleteEvent: (eventId: string) => Promise<void>;
  getEventById: (id: string) => Event | undefined;
  getEventsByDate: (date: string) => Event[];
  getTodaysEvents: () => Event[];
  getFeaturedEvents: () => Event[];
  getUpcomingEvents: (limit?: number) => Event[];
  getEventsByVenue: (venueId: string) => Event[];
  getVenueById: (id: string) => Venue | undefined;
  refreshEvents: () => Promise<void>;
  refreshPendingEvents: () => Promise<void>;
  refreshVenues: () => Promise<void>;
}

interface EventSubmission {
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
  // Recurrence fields
  isRecurring?: boolean;
  recurrencePattern?: string;
  recurrenceEndDate?: string;
}

const EventsContext = createContext<EventsContextType | undefined>(undefined);

export function EventsProvider({ children }: { children: ReactNode }) {
  const { user, isAdmin, isLoading: authLoading } = useAuth();
  const [events, setEvents] = useState<Event[]>([]);
  const [pendingEvents, setPendingEvents] = useState<Event[]>([]);
  const [venues, setVenues] = useState<Venue[]>([]);
  const [userLikes, setUserLikes] = useState<string[]>([]);
  const [likeCounts, setLikeCounts] = useState<Record<string, number>>({});
  const [isLoading, setIsLoading] = useState(true);

  const refreshEvents = useCallback(async () => {
    try {
      const res = await fetch('/api/events');
      const data = await res.json();
      if (data.events) {
        // Transform API response to match Event type
        const transformedEvents = data.events.map((e: Record<string, unknown>) => ({
          ...e,
          venue: e.venue as Venue,
          categories: e.categories as EventCategory[],
        }));
        setEvents(transformedEvents);
        
        // Update like counts from events
        const counts: Record<string, number> = {};
        data.events.forEach((e: { id: string; likeCount?: number }) => {
          if (e.likeCount) counts[e.id] = e.likeCount;
        });
        setLikeCounts(prev => ({ ...prev, ...counts }));
      }
    } catch (error) {
      console.error('Failed to fetch events:', error);
    }
  }, []);

  const refreshPendingEvents = useCallback(async () => {
    try {
      const res = await fetch('/api/events?status=pending');
      if (res.ok) {
        const data = await res.json();
        if (data.events) {
          const transformedEvents = data.events.map((e: Record<string, unknown>) => ({
            ...e,
            venue: e.venue as Venue,
            categories: e.categories as EventCategory[],
          }));
          setPendingEvents(transformedEvents);
        }
      }
    } catch (error) {
      console.error('Failed to fetch pending events:', error);
    }
  }, []);

  const refreshVenues = useCallback(async () => {
    try {
      const res = await fetch('/api/venues');
      const data = await res.json();
      if (data.venues) {
        setVenues(data.venues);
      }
    } catch (error) {
      console.error('Failed to fetch venues:', error);
    }
  }, []);

  const refreshLikes = useCallback(async () => {
    try {
      const res = await fetch('/api/likes');
      const data = await res.json();
      if (data.likes) {
        setUserLikes(data.likes);
      }
      if (data.likeCounts) {
        setLikeCounts(data.likeCounts);
      }
    } catch (error) {
      console.error('Failed to fetch likes:', error);
    }
  }, []);

  // Initial load
  useEffect(() => {
    Promise.all([
      refreshEvents(),
      refreshVenues(),
      refreshLikes(),
    ]).finally(() => setIsLoading(false));
  }, [refreshEvents, refreshVenues, refreshLikes]);

  // Refresh likes when user changes (login/logout)
  useEffect(() => {
    if (!authLoading) {
      refreshLikes();
    }
  }, [user, authLoading, refreshLikes]);

  // Fetch pending events when admin is detected and auth is done loading
  useEffect(() => {
    if (!authLoading && isAdmin) {
      refreshPendingEvents();
    }
  }, [authLoading, isAdmin, refreshPendingEvents]);

  const toggleLike = async (eventId: string) => {
    try {
      const res = await fetch('/api/likes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ eventId }),
      });

      if (res.ok) {
        const data = await res.json();
        // Update state immediately for responsive UI
        if (data.liked) {
          setUserLikes(prev => {
            // Prevent duplicates
            if (prev.includes(eventId)) return prev;
            return [...prev, eventId];
          });
        } else {
          setUserLikes(prev => prev.filter(id => id !== eventId));
        }
        setLikeCounts(prev => ({ ...prev, [eventId]: data.likeCount }));
        
        // Refresh likes from server to ensure consistency
        await refreshLikes();
      }
    } catch (error) {
      console.error('Failed to toggle like:', error);
    }
  };

  const isLiked = (eventId: string) => userLikes.includes(eventId);
  
  const getLikeCount = (eventId: string) => likeCounts[eventId] || 0;

  const submitEvent = async (eventData: EventSubmission): Promise<Event | null> => {
    try {
      console.log('[EventsContext] Submitting event:', eventData.title);
      const res = await fetch('/api/events', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(eventData),
      });

      const data = await res.json();
      
      if (res.ok) {
        console.log('[EventsContext] Event submitted successfully:', data.event?.id, 'submittedById:', data.event?.submittedById, 'status:', data.event?.status);
        // Refresh events lists
        await refreshEvents();
        await refreshPendingEvents();
        await refreshVenues(); // In case a new venue was created
        return data.event;
      } else {
        console.error('[EventsContext] Failed to submit event:', res.status, data);
        throw new Error(data.error || 'Failed to submit event');
      }
    } catch (error) {
      console.error('[EventsContext] Exception submitting event:', error);
      throw error;
    }
  };

  const approveEvent = async (eventId: string) => {
    try {
      const res = await fetch(`/api/events/${eventId}/approve`, {
        method: 'POST',
      });

      if (res.ok) {
        await refreshEvents();
        await refreshPendingEvents();
      }
    } catch (error) {
      console.error('Failed to approve event:', error);
    }
  };

  const rejectEvent = async (eventId: string) => {
    try {
      const res = await fetch(`/api/events/${eventId}/reject`, {
        method: 'POST',
      });

      if (res.ok) {
        await refreshPendingEvents();
      }
    } catch (error) {
      console.error('Failed to reject event:', error);
    }
  };

  const deleteEvent = async (eventId: string) => {
    try {
      const res = await fetch(`/api/events/${eventId}`, {
        method: 'DELETE',
      });

      if (res.ok) {
        await refreshEvents();
        await refreshPendingEvents();
      }
    } catch (error) {
      console.error('Failed to delete event:', error);
    }
  };

  // Helper function to get promotion tier priority
  const getPromotionTierPriority = (tier?: string): number => {
    switch (tier) {
      case 'featured': return 3;
      case 'promoted': return 2;
      case 'standard': return 1;
      default: return 1;
    }
  };

  // Query functions
  const getEventById = (id: string) => events.find(e => e.id === id);
  
  const getEventsByDate = (date: string) => {
    const eventsForDate = events.filter(e => e.date === date);
    return eventsForDate.sort((a, b) => {
      const aPriority = getPromotionTierPriority(a.venue?.promotionTier);
      const bPriority = getPromotionTierPriority(b.venue?.promotionTier);
      if (bPriority !== aPriority) {
        return bPriority - aPriority; // Higher priority first
      }
      return a.startTime.localeCompare(b.startTime);
    });
  };
  
  const getTodaysEvents = () => getEventsByDate(format(new Date(), 'yyyy-MM-dd'));
  
  const getFeaturedEvents = () => {
    try {
      // Early return if no events
      if (!events || events.length === 0) {
        return [];
      }

      const today = format(new Date(), 'yyyy-MM-dd');
      
      // Get upcoming events (today or future) that are not food deals and have a venue
      const upcoming = events.filter(e => {
        try {
          return (
            e &&
            e.date &&
            e.date >= today &&
            e.categories &&
            !e.categories.includes('food-deal') &&
            e.venue &&
            e.venue.id &&
            e.startTime
          );
        } catch {
          return false;
        }
      });
      
      // Sort by like count (highest first), then by venue promotion tier, then by date/time
      const sorted = [...upcoming].sort((a, b) => {
        try {
          // Get like counts for comparison (use likeCount from event or from likeCounts state)
          const aLikes = (a.likeCount ?? getLikeCount(a.id) ?? 0) || 0;
          const bLikes = (b.likeCount ?? getLikeCount(b.id) ?? 0) || 0;
          
          // Primary sort: like count (highest first)
          if (bLikes !== aLikes) {
            return bLikes - aLikes;
          }
          
          // Secondary sort: venue promotion tier (higher priority first)
          const aPriority = getPromotionTierPriority(a.venue?.promotionTier);
          const bPriority = getPromotionTierPriority(b.venue?.promotionTier);
          if (bPriority !== aPriority) {
            return bPriority - aPriority;
          }
          
          // Tertiary sort: date and time (earliest first)
          const dateCompare = (a.date || '').localeCompare(b.date || '');
          if (dateCompare !== 0) return dateCompare;
          return (a.startTime || '').localeCompare(b.startTime || '');
        } catch (err) {
          console.error('Error sorting featured events:', err);
          // Return 0 to maintain order if there's an error
          return 0;
        }
      });
      
      // Filter to only include one event per venue (take the first/highest liked event from each venue)
      const venueIds = new Set<string>();
      const featured: Event[] = [];
      
      for (const event of sorted) {
        if (!event || !event.venue || !event.venue.id) continue;
        
        const venueId = event.venue.id;
        if (!venueIds.has(venueId)) {
          featured.push(event);
          venueIds.add(venueId);
        }
      }
      
      return featured;
    } catch (error) {
      console.error('Error in getFeaturedEvents:', error);
      // Return empty array on error to prevent breaking the page
      return [];
    }
  };
  
  const getUpcomingEvents = (limit?: number) => {
    const upcoming = events
      .filter(e => e.date >= format(new Date(), 'yyyy-MM-dd'))
      .sort((a, b) => {
        const aPriority = getPromotionTierPriority(a.venue?.promotionTier);
        const bPriority = getPromotionTierPriority(b.venue?.promotionTier);
        if (bPriority !== aPriority) {
          return bPriority - aPriority; // Higher priority first
        }
        return a.date.localeCompare(b.date) || a.startTime.localeCompare(b.startTime);
      });
    return limit ? upcoming.slice(0, limit) : upcoming;
  };
  
  const getEventsByVenue = (venueId: string) => events.filter(e => e.venue.id === venueId);
  
  const getVenueById = (id: string) => venues.find(v => v.id === id);

  return (
    <EventsContext.Provider
      value={{
        events,
        pendingEvents,
        venues,
        userLikes,
        likeCounts,
        isLoading,
        toggleLike,
        isLiked,
        getLikeCount,
        submitEvent,
        approveEvent,
        rejectEvent,
        deleteEvent,
        getEventById,
        getEventsByDate,
        getTodaysEvents,
        getFeaturedEvents,
        getUpcomingEvents,
        getEventsByVenue,
        getVenueById,
        refreshEvents,
        refreshPendingEvents,
        refreshVenues,
      }}
    >
      {children}
    </EventsContext.Provider>
  );
}

export function useEvents() {
  const context = useContext(EventsContext);
  if (context === undefined) {
    throw new Error('useEvents must be used within an EventsProvider');
  }
  return context;
}
