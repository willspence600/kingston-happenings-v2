'use client';

import { useState } from 'react';
import Link from 'next/link';
import { 
  ChevronLeft, 
  ChevronRight, 
  Calendar as CalendarIcon,
  ArrowRight
} from 'lucide-react';
import { 
  format, 
  startOfMonth, 
  endOfMonth, 
  startOfWeek, 
  endOfWeek, 
  eachDayOfInterval, 
  isSameMonth, 
  isSameDay, 
  addMonths, 
  subMonths,
  isToday
} from 'date-fns';
import { useEvents } from '@/contexts/EventsContext';
import { categoryColors, categoryLabels, EventCategory, browseCategories } from '@/types/event';
import { EventCard } from '@/components';

export default function CalendarPage() {
  const { getEventsByDate } = useEvents();
  
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState<Date | null>(new Date());
  const [selectedCategories, setSelectedCategories] = useState<EventCategory[]>(browseCategories);
  const [expandedEvents, setExpandedEvents] = useState(false);

  const monthStart = startOfMonth(currentMonth);
  const monthEnd = endOfMonth(currentMonth);
  const calendarStart = startOfWeek(monthStart);
  const calendarEnd = endOfWeek(monthEnd);

  const days = eachDayOfInterval({ start: calendarStart, end: calendarEnd });

  const selectedDateEvents = selectedDate 
    ? getEventsByDate(format(selectedDate, 'yyyy-MM-dd'))
    : [];

  // Filter events by selected categories and exclude food & drink specials
  const eventsOnly = selectedDateEvents.filter(e => 
    !e.categories.includes('food-deal') &&
    e.categories.some(cat => selectedCategories.includes(cat))
  );

  const getEventsForDay = (date: Date) => {
    const events = getEventsByDate(format(date, 'yyyy-MM-dd'));
    // Filter by selected categories and exclude food & drink specials
    return events.filter(event => 
      !event.categories.includes('food-deal') &&
      event.categories.some(cat => selectedCategories.includes(cat))
    );
  };

  const toggleCategory = (category: EventCategory) => {
    setSelectedCategories(prev => 
      prev.includes(category)
        ? prev.filter(c => c !== category)
        : [...prev, category]
    );
  };

  const goToPreviousMonth = () => setCurrentMonth(subMonths(currentMonth, 1));
  const goToNextMonth = () => setCurrentMonth(addMonths(currentMonth, 1));
  const goToToday = () => {
    setCurrentMonth(new Date());
    setSelectedDate(new Date());
  };

  return (
    <div className="min-h-screen">
      {/* Header */}
      <section className="bg-gradient-to-br from-muted to-background py-12 sm:py-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <h1 className="font-display text-4xl sm:text-5xl text-foreground mb-4">
            Event Calendar
          </h1>
          <p className="text-muted-foreground text-lg max-w-2xl">
            Plan ahead and discover all the events happening in Kingston this month.
          </p>
        </div>
      </section>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Calendar */}
          <div className="lg:col-span-2">
            <div className="bg-card border border-border rounded-2xl p-4 sm:p-6">
              {/* Legend at Top - Filterable categories */}
              <div className="mb-6 pb-4 border-b border-border">
                <div className="flex items-center justify-between mb-3">
                  <p className="text-base font-medium text-foreground">Filter Event Categories</p>
                  <button
                    onClick={() => {
                      setSelectedCategories(
                        selectedCategories.length === browseCategories.length 
                          ? [] 
                          : browseCategories
                      );
                    }}
                    className="text-sm text-primary hover:underline font-medium"
                  >
                    {selectedCategories.length === browseCategories.length ? 'Deselect All' : 'Select All'}
                  </button>
                </div>
                <div className="flex flex-wrap gap-x-4 gap-y-2">
                  {browseCategories.map((category) => {
                    const isSelected = selectedCategories.includes(category);
                    return (
                      <button
                        key={category}
                        onClick={() => toggleCategory(category)}
                        className={`flex items-center gap-1.5 px-2 py-1 rounded-lg transition-all ${
                          isSelected 
                            ? 'bg-primary/10 hover:bg-primary/20' 
                            : 'hover:bg-muted/50 opacity-50'
                        }`}
                      >
                        <div className={`w-2.5 h-2.5 rounded-full ${categoryColors[category]}`} />
                        <span className={`text-sm ${isSelected ? 'text-foreground font-medium' : 'text-muted-foreground'}`}>
                          {categoryLabels[category]}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Calendar Header */}
              <div className="flex items-center justify-between mb-6">
                <h2 className="font-display text-2xl text-foreground">
                  {format(currentMonth, 'MMMM yyyy')}
                </h2>
                <div className="flex items-center gap-2">
                  <button
                    onClick={goToToday}
                    className="px-3 py-1.5 text-sm font-medium text-primary border border-primary rounded-lg hover:bg-primary/5 transition-colors"
                  >
                    Today
                  </button>
                  <button
                    onClick={goToPreviousMonth}
                    className="p-2 rounded-lg hover:bg-muted transition-colors"
                    aria-label="Previous month"
                  >
                    <ChevronLeft size={20} />
                  </button>
                  <button
                    onClick={goToNextMonth}
                    className="p-2 rounded-lg hover:bg-muted transition-colors"
                    aria-label="Next month"
                  >
                    <ChevronRight size={20} />
                  </button>
                </div>
              </div>

              {/* Day Names */}
              <div className="grid grid-cols-7 mb-2">
                {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((day) => (
                  <div
                    key={day}
                    className="text-center text-sm font-medium text-muted-foreground py-2"
                  >
                    {day}
                  </div>
                ))}
              </div>

              {/* Calendar Grid */}
              <div className="grid grid-cols-7 gap-1">
                {days.map((day) => {
                  const dayEvents = getEventsForDay(day);
                  const isCurrentMonth = isSameMonth(day, currentMonth);
                  const isSelected = selectedDate && isSameDay(day, selectedDate);
                  const isDayToday = isToday(day);

                  return (
                    <button
                      key={day.toISOString()}
                      onClick={() => setSelectedDate(day)}
                      className={`
                        relative aspect-square p-1 sm:p-2 rounded-xl transition-all
                        ${isCurrentMonth ? 'text-foreground' : 'text-muted-foreground/50'}
                        ${isSelected ? 'bg-primary text-primary-foreground ring-2 ring-primary ring-offset-2 ring-offset-card' : 'hover:bg-muted'}
                        ${isDayToday && !isSelected ? 'bg-accent/20' : ''}
                      `}
                    >
                      <span className={`
                        text-sm sm:text-base font-medium
                        ${isDayToday && !isSelected ? 'text-primary' : ''}
                      `}>
                        {format(day, 'd')}
                      </span>
                      
                      {/* Event indicators */}
                      {dayEvents.length > 0 && (
                        <div className="absolute bottom-1 left-1/2 -translate-x-1/2 flex gap-0.5">
                          {dayEvents.slice(0, 3).map((event) => (
                            <div
                              key={event.id}
                              className={`w-1.5 h-1.5 rounded-full ${
                                isSelected ? 'bg-primary-foreground' : categoryColors[event.categories[0]]
                              }`}
                            />
                          ))}
                          {dayEvents.length > 3 && (
                            <div className={`w-1.5 h-1.5 rounded-full ${isSelected ? 'bg-primary-foreground/50' : 'bg-muted-foreground'}`} />
                          )}
                        </div>
                      )}
                    </button>
                  );
                })}
              </div>

            </div>
          </div>

          {/* Selected Day Events */}
          <div className="lg:col-span-1">
            <div className="sticky top-24">
              <div className="bg-card border border-border rounded-2xl p-4 sm:p-6">
                <h3 className="font-display text-xl text-foreground mb-4">
                  {selectedDate ? format(selectedDate, 'EEEE, MMMM d') : 'Select a Date'}
                </h3>

                {selectedDate && (
                  <>
                    {eventsOnly.length > 0 ? (
                      <div className="space-y-4">
                        {/* Events Section */}
                        <div>
                          <div className="flex items-center gap-2 mb-3 pb-2 border-b border-border">
                            <CalendarIcon size={18} className="text-primary" />
                            <h4 className="font-medium text-foreground text-base">
                              Events ({eventsOnly.length})
                            </h4>
                          </div>
                          <div className="space-y-3">
                            {(expandedEvents ? eventsOnly : eventsOnly.slice(0, 10)).map((event) => (
                              <EventCard key={event.id} event={event} variant="compact" />
                            ))}
                          </div>
                          {eventsOnly.length > 10 && (
                            <button
                              onClick={() => setExpandedEvents(!expandedEvents)}
                              className="mt-3 w-full py-2 text-sm text-primary hover:underline font-medium"
                            >
                              {expandedEvents 
                                ? `Show Less (showing all ${eventsOnly.length})` 
                                : `Show More (${eventsOnly.length - 10} more)`}
                            </button>
                          )}
                        </div>
                        
                        <Link
                          href={`/events?tab=events&date=${format(selectedDate, 'yyyy-MM-dd')}`}
                          className="flex items-center justify-center gap-2 w-full py-2 text-sm text-primary hover:underline"
                        >
                          See all
                          <ArrowRight size={14} />
                        </Link>
                      </div>
                    ) : (
                      <div className="text-center py-8">
                        <CalendarIcon size={32} className="mx-auto text-muted-foreground mb-3" />
                        <p className="text-muted-foreground text-sm">
                          No events scheduled for this day.
                        </p>
                        <Link
                          href="/submit"
                          className="inline-block mt-4 text-sm text-primary hover:underline"
                        >
                          Submit an event
                        </Link>
                      </div>
                    )}
                  </>
                )}
              </div>

              {/* Quick Stats */}
              <div className="mt-4 grid grid-cols-2 gap-4">
                <div className="bg-card border border-border rounded-xl p-4 text-center">
                  <p className="text-2xl font-display text-primary">
                    {getEventsForDay(new Date()).length}
                  </p>
                  <p className="text-sm text-muted-foreground">Today&apos;s Events</p>
                </div>
                <div className="bg-card border border-border rounded-xl p-4 text-center">
                  <p className="text-2xl font-display text-secondary">
                    {days.reduce((sum, day) => sum + getEventsForDay(day).length, 0)}
                  </p>
                  <p className="text-sm text-muted-foreground">This Month</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
