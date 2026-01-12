'use client';

import Link from 'next/link';
import { ArrowRight, Calendar, Sparkles, Clock, MapPin, Utensils, Music, PartyPopper, Ticket, Sun, Trophy } from 'lucide-react';
import { format, parseISO } from 'date-fns';
import { useEvents } from '@/contexts/EventsContext';
import { useAuth } from '@/contexts/AuthContext';
import { categoryLabels, categoryColors, EventCategory } from '@/types/event';
import { useState, useEffect, useRef } from 'react';

// Filter button config
const filterButtons: { id: EventCategory; label: string; icon: typeof Music }[] = [
  { id: 'live-music', label: 'Live Music', icon: Music },
  { id: 'activity-nights', label: 'Activity Nights', icon: PartyPopper },
  { id: 'concert', label: 'Concerts', icon: Ticket },
  { id: 'daytime', label: 'Daytime Events', icon: Sun },
  { id: 'sports', label: 'Sports', icon: Trophy },
];

export default function HomePage() {
  const { getTodaysEvents, getFeaturedEvents, events } = useEvents();
  const { user } = useAuth();
  const [activeFilter, setActiveFilter] = useState<EventCategory | null>(null);
  const eventsContainerRef = useRef<HTMLDivElement>(null);
  const specialsContainerRef = useRef<HTMLDivElement>(null);
  
  const todaysEvents = getTodaysEvents();
  const featuredEvents = getFeaturedEvents();
  const today = new Date();
  
  // Separate events and food deals for today
  // getTodaysEvents() already sorts by promotion tier, so we just filter
  const allTodayEvents = todaysEvents.filter(e => !e.categories.includes('food-deal'));
  const filteredTodayEvents = activeFilter 
    ? allTodayEvents.filter(e => e.categories.includes(activeFilter))
    : allTodayEvents;
  // Keep the sorted order from getTodaysEvents (already sorted by promotion tier)
  const todayEvents = filteredTodayEvents.slice(0, 9);
  
  // Debug: Log events for troubleshooting
  useEffect(() => {
    console.log('Homepage Events Debug:', {
      totalEvents: events.length,
      todaysEventsCount: todaysEvents.length,
      allTodayEventsCount: allTodayEvents.length,
      filteredTodayEventsCount: filteredTodayEvents.length,
      todayEventsCount: todayEvents.length,
      activeFilter,
      todayDate: format(today, 'yyyy-MM-dd'),
    });
  }, [events.length, todaysEvents.length, allTodayEvents.length, filteredTodayEvents.length, todayEvents.length, activeFilter, today]);
  
  // Filter food & drink specials and limit featured/promoted venues to 1 special each
  // getTodaysEvents() already sorts by promotion tier, so we maintain that order
  const allDeals = todaysEvents.filter(e => e.categories.includes('food-deal'));
  const processedDeals: typeof allDeals = [];
  const featuredPromotedVenueIds = new Set<string>();
  
  // Process deals: for featured/promoted venues, only take first special per venue
  // For standard venues, take all their specials
  allDeals.forEach(deal => {
    const venueId = deal.venue?.id || 'unknown';
    const promotionTier = deal.venue?.promotionTier;
    
    // If venue is featured or promoted and we haven't added a deal from this venue yet
    if ((promotionTier === 'featured' || promotionTier === 'promoted')) {
      if (!featuredPromotedVenueIds.has(venueId)) {
        processedDeals.push(deal);
        featuredPromotedVenueIds.add(venueId);
      }
      // Skip additional deals from this featured/promoted venue
    } else {
      // For standard venues, add all their deals
      processedDeals.push(deal);
    }
  });
  
  const todayDeals = processedDeals.slice(0, 7);
  
  // Get first name from user name
  const firstName = user?.name?.split(' ')[0];

  // Note: Height matching removed to allow event cards to maintain their natural size
  // Event cards now use aspect-square to maintain consistent sizing

  return (
    <div className="min-h-screen">
      {/* Hero Section - Shorter */}
      <section className="relative overflow-hidden bg-gradient-to-br from-secondary via-secondary/95 to-primary/80 text-white">
        {/* Decorative elements */}
        <div className="absolute inset-0 pattern-bg opacity-10" />
        <div className="absolute -top-24 -right-24 w-96 h-96 bg-primary/30 rounded-full blur-3xl" />
        <div className="absolute -bottom-24 -left-24 w-96 h-96 bg-accent/20 rounded-full blur-3xl" />
        
        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 sm:py-16">
          <div className="max-w-3xl">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/10 backdrop-blur-sm text-sm mb-4 animate-fade-in">
              <Sparkles size={14} className="text-accent" />
              <span>What&apos;s Happening in Kingston Today</span>
            </div>
            <h1 className="font-display text-4xl sm:text-5xl lg:text-6xl mb-4 animate-slide-up">
              {user && firstName ? (
                <>
                  Welcome back,{' '}
                  <span className="italic text-accent">{firstName}.</span>
                </>
              ) : (
                <>
                  Every Event.{' '}
                  <span className="italic text-accent">Every Day.</span>
                </>
              )}
            </h1>
            <p className="text-lg text-white/80 mb-6 animate-slide-up stagger-1">
              Live music, local events, food specials and more. Kingston, all in one place.
            </p>
            
            {/* Quick Actions */}
            <div className="flex flex-col sm:flex-row gap-3 animate-slide-up stagger-2">
              <Link
                href="/events"
                className="flex items-center justify-center gap-2 px-5 py-2.5 bg-white text-secondary rounded-xl font-medium hover:bg-white/90 transition-colors"
              >
                Browse All Events
              </Link>
              <Link
                href="/calendar"
                className="flex items-center justify-center gap-2 px-5 py-2.5 bg-white/10 backdrop-blur-sm border border-white/20 text-white rounded-xl font-medium hover:bg-white/20 transition-colors"
              >
                <Calendar size={18} />
                View Calendar
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* Happening Today Section */}
      <section className="py-12 sm:py-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          {/* Filter Section - Centered */}
          <div className="text-center mb-10">
            <h2 className="font-display text-2xl sm:text-3xl text-foreground mb-6">
              What do you feel like doing today?
            </h2>
            <div className="flex flex-wrap justify-center gap-2 sm:gap-3">
              {filterButtons.map((filter) => {
                const Icon = filter.icon;
                const isActive = activeFilter === filter.id;
                return (
                  <button
                    key={filter.id}
                    onClick={() => setActiveFilter(isActive ? null : filter.id)}
                    className={`flex items-center gap-2 px-4 py-2 rounded-full font-medium text-sm transition-all ${
                      isActive
                        ? 'bg-primary text-white shadow-md'
                        : 'bg-muted text-foreground hover:bg-border'
                    }`}
                  >
                    <Icon size={16} />
                    {filter.label}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Date Header */}
          <div className="mb-8">
            <p className="text-primary font-medium text-sm uppercase tracking-wider mb-1">
              {format(today, 'EEEE, MMMM d')}
            </p>
            <h3 className="font-display text-2xl sm:text-3xl text-foreground">
              Happening Today
            </h3>
          </div>

          {/* Two Column Layout - Events wider, Deals narrower */}
          <div className="grid grid-cols-1 lg:grid-cols-5 gap-8 items-start">
            {/* Left Column - Events (3 cols wide) */}
            <div className="lg:col-span-3 flex flex-col">
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-display text-xl text-foreground flex items-center gap-2">
                  <Calendar size={18} className="text-primary" />
                  Events
                </h3>
                <Link
                  href="/events"
                  className="flex items-center gap-1 text-primary hover:underline font-medium text-sm"
                >
                  View all
                  <ArrowRight size={14} />
                </Link>
              </div>
              
              {todayEvents.length > 0 ? (
                <div ref={eventsContainerRef} className="grid grid-cols-3 gap-4">
                  {todayEvents.map((event) => (
                    <Link
                      key={event.id}
                      href={`/events/${event.id}`}
                      className="group relative aspect-square rounded-xl overflow-hidden bg-muted border border-border hover:border-primary/50 transition-all hover:shadow-lg"
                    >
                      {event.imageUrl ? (
                        <img
                          src={event.imageUrl}
                          alt={event.title}
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                        />
                      ) : (
                        <div className="w-full h-full bg-gradient-to-br from-primary/20 to-secondary/20 flex items-center justify-center">
                          <Calendar size={32} className="text-muted-foreground" />
                        </div>
                      )}
                      <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent" />
                      <div className="absolute bottom-0 left-0 right-0 p-3">
                        {event.categories[0] && (
                          <span className={`inline-block px-2 py-0.5 rounded-full text-xs font-medium text-white mb-1.5 ${categoryColors[event.categories[0] as EventCategory]}`}>
                            {categoryLabels[event.categories[0] as EventCategory]}
                          </span>
                        )}
                        <h4 className="font-medium text-white text-base line-clamp-2 leading-tight">
                          {event.title}
                        </h4>
                        <div className="flex flex-col gap-0.5 mt-1">
                          <p className="text-white/70 text-sm flex items-center gap-1">
                            <Clock size={12} />
                            {format(parseISO(`2000-01-01T${event.startTime}`), 'h:mm a')}
                          </p>
                          <p className="text-white/70 text-sm flex items-center gap-1">
                            <MapPin size={12} />
                            {event.venue.name}
                          </p>
                        </div>
                      </div>
                    </Link>
                  ))}
                </div>
              ) : (
                <div className="aspect-[3/2] rounded-xl bg-muted flex items-center justify-center">
                  <div className="text-center">
                    <Calendar size={32} className="mx-auto text-muted-foreground mb-2" />
                    <p className="text-muted-foreground text-sm">No events today</p>
                  </div>
                </div>
              )}
            </div>

            {/* Right Column - Food & Drink Specials (2 cols wide) */}
            <div className="lg:col-span-2 flex flex-col">
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-display text-xl text-foreground flex items-center gap-2">
                  <Utensils size={18} className="text-primary" />
                  Food & Drink Specials
                </h3>
                <Link
                  href="/events?tab=deals"
                  className="flex items-center gap-1 text-primary hover:underline font-medium text-sm"
                >
                  View all
                  <ArrowRight size={14} />
                </Link>
              </div>
              
              {todayDeals.length > 0 ? (
                <div ref={specialsContainerRef} className="space-y-3">
                  {todayDeals.map((deal) => (
                    <Link
                      key={deal.id}
                      href={`/events/${deal.id}`}
                      className="group flex items-center gap-4 p-3 rounded-xl bg-card border border-border hover:border-primary/50 transition-all hover:shadow-md"
                    >
                      <div className="w-16 h-16 rounded-lg overflow-hidden bg-muted flex-shrink-0">
                        {deal.imageUrl ? (
                          <img
                            src={deal.imageUrl}
                            alt={deal.title}
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <div className="w-full h-full bg-gradient-to-br from-primary/20 to-orange-500/20 flex items-center justify-center">
                            <Utensils size={20} className="text-primary" />
                          </div>
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <h4 className="font-medium text-foreground group-hover:text-primary transition-colors line-clamp-1">
                          {deal.title}
                        </h4>
                        <p className="text-muted-foreground text-sm flex items-center gap-1 mt-0.5">
                          <MapPin size={12} />
                          {deal.venue.name}
                        </p>
                        {deal.price && (
                          <p className="text-primary font-medium text-sm mt-1">
                            {deal.price}
                          </p>
                        )}
                      </div>
                      <ArrowRight size={16} className="text-muted-foreground group-hover:text-primary transition-colors flex-shrink-0" />
                    </Link>
                  ))}
                </div>
              ) : (
                <div className="h-full min-h-[200px] rounded-xl bg-muted flex items-center justify-center">
                  <div className="text-center">
                    <Utensils size={32} className="mx-auto text-muted-foreground mb-2" />
                    <p className="text-muted-foreground text-sm">No specials today</p>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </section>

      {/* Featured Events */}
      {featuredEvents.length > 0 && (
        <section className="py-12 sm:py-16 bg-muted">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex items-end justify-between mb-8">
              <div>
                <p className="text-primary font-medium text-sm uppercase tracking-wider mb-1">
                  Don&apos;t Miss
                </p>
                <h2 className="font-display text-3xl sm:text-4xl text-foreground">
                  Featured Events
                </h2>
              </div>
              <Link
                href="/events"
                className="hidden sm:flex items-center gap-1 text-primary hover:underline font-medium"
              >
                View all
                <ArrowRight size={16} />
              </Link>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
              {featuredEvents.slice(0, 4).map((event) => (
                <Link
                  key={event.id}
                  href={`/events/${event.id}`}
                  className="group relative aspect-[16/9] rounded-2xl overflow-hidden bg-muted border border-border hover:border-primary/50 transition-all hover:shadow-xl"
                >
                  {event.imageUrl ? (
                    <img
                      src={event.imageUrl}
                      alt={event.title}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                    />
                  ) : (
                    <div className="w-full h-full bg-gradient-to-br from-primary/20 to-secondary/20 flex items-center justify-center">
                      <Calendar size={56} className="text-muted-foreground" />
                    </div>
                  )}
                  <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/30 to-transparent" />
                  <div className="absolute bottom-0 left-0 right-0 p-5">
                    <p className="text-white/70 text-sm mb-2">
                      {format(parseISO(event.date), 'EEE, MMM d')} • {format(parseISO(`2000-01-01T${event.startTime}`), 'h:mm a')}
                    </p>
                    <h3 className="font-display text-xl sm:text-2xl text-white line-clamp-2">
                      {event.title}
                    </h3>
                    <p className="text-white/70 text-sm mt-2 flex items-center gap-1">
                      <MapPin size={14} />
                      {event.venue.name}
                    </p>
                  </div>
                </Link>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* CTA Section */}
      <section className="py-12 sm:py-16 bg-gradient-to-br from-primary to-primary/80 text-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="font-display text-3xl sm:text-4xl mb-4">
            Have an Event to Share?
          </h2>
          <p className="text-white/80 text-lg mb-6 max-w-2xl mx-auto">
            Whether you&apos;re a venue, restaurant, or event organizer, we&apos;d love to help 
            you reach Kingston&apos;s event-goers.
          </p>
          <Link
            href="/submit"
            className="inline-flex items-center gap-2 px-6 py-3 bg-white text-primary rounded-xl font-medium hover:bg-white/90 transition-colors"
          >
            Submit Your Event
            <ArrowRight size={18} />
          </Link>
        </div>
      </section>
    </div>
  );
}
