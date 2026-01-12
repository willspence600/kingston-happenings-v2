'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Search, MapPin, Calendar, ExternalLink } from 'lucide-react';
import { format } from 'date-fns';
import { useEvents } from '@/contexts/EventsContext';

export default function VenuesPage() {
  const { venues, getEventsByVenue } = useEvents();
  const [searchQuery, setSearchQuery] = useState('');

  const filteredVenues = venues.filter((venue) => {
    if (!searchQuery) return true;
    const query = searchQuery.toLowerCase();
    return (
      venue.name.toLowerCase().includes(query) ||
      venue.address.toLowerCase().includes(query) ||
      venue.neighborhood?.toLowerCase().includes(query)
    );
  });

  return (
    <div className="min-h-screen">
      {/* Header */}
      <section className="bg-gradient-to-br from-muted to-background py-12 sm:py-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <h1 className="font-display text-4xl sm:text-5xl text-foreground mb-4">
            Venues
          </h1>
          <p className="text-muted-foreground text-lg max-w-2xl">
            Search a venue and see all events happening there. From historic theatres to cozy neighborhood pubs.
          </p>
        </div>
      </section>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Search */}
        <div className="relative max-w-md mb-8">
          <Search size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <input
            type="text"
            placeholder="Search venues..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-11 pr-4 py-3 bg-card border border-border rounded-xl focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary"
          />
        </div>

        {/* Venues Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredVenues.map((venue) => {
            const upcomingEvents = getEventsByVenue(venue.id).filter(
              (e) => e.date >= format(new Date(), 'yyyy-MM-dd')
            );
            
            return (
              <Link
                key={venue.id}
                href={`/venues/${venue.id}`}
                className="group bg-card border border-border rounded-xl overflow-hidden card-hover"
              >
                {/* Venue Image/Placeholder */}
                <div className="h-40 bg-gradient-to-br from-primary/10 to-secondary/10 overflow-hidden">
                  {venue.imageUrl ? (
                    <img
                      src={venue.imageUrl}
                      alt={venue.name}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center">
                      <MapPin size={40} className="text-muted-foreground group-hover:text-primary transition-colors" />
                    </div>
                  )}
                </div>
                
                <div className="p-5">
                  <h3 className="font-display text-xl text-foreground group-hover:text-primary transition-colors mb-2">
                    {venue.name}
                  </h3>
                  <p className="text-muted-foreground text-sm mb-1">{venue.address}</p>
                  {venue.neighborhood && (
                    <p className="text-sm text-primary">{venue.neighborhood}</p>
                  )}
                  
                  <div className="flex items-center justify-between mt-4 pt-4 border-t border-border">
                    <span className="flex items-center gap-1 text-sm text-muted-foreground">
                      <Calendar size={14} />
                      {upcomingEvents.length} upcoming event{upcomingEvents.length !== 1 ? 's' : ''}
                    </span>
                    {venue.website && (
                      <span className="text-primary">
                        <ExternalLink size={14} />
                      </span>
                    )}
                  </div>
                </div>
              </Link>
            );
          })}
        </div>

        {filteredVenues.length === 0 && (
          <div className="text-center py-16">
            <MapPin size={48} className="mx-auto text-muted-foreground mb-4" />
            <h3 className="font-display text-xl text-foreground mb-2">No Venues Found</h3>
            <p className="text-muted-foreground">Try adjusting your search.</p>
          </div>
        )}
      </div>
    </div>
  );
}
