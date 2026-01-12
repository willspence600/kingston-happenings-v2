'use client';

import { useRouter } from 'next/navigation';
import { useEffect, useState, useCallback, useMemo, useRef } from 'react';
import Link from 'next/link';
import { Heart, Calendar, ArrowRight, FileText, Clock, CheckCircle, AlertTriangle, XCircle, Loader2, Utensils } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { useEvents } from '@/contexts/EventsContext';
import { EventCard, DatePicker } from '@/components';
import { format, parseISO, startOfDay, isWithinInterval, isAfter, isEqual, isToday, isTomorrow, addDays } from 'date-fns';
import { categoryLabels, categoryColors, EventCategory } from '@/types/event';

interface SubmittedEvent {
  id: string;
  title: string;
  description: string;
  date: string;
  startTime: string;
  endTime?: string;
  price?: string;
  imageUrl?: string;
  status: string;
  createdAt: string;
  venue: { id: string; name: string; address: string };
  categories: string[];
  likeCount: number;
}

export default function MyEventsPage() {
  const router = useRouter();
  const { user, isLoading: authLoading } = useAuth();
  const { events, userLikes, isLiked, toggleLike, getLikeCount } = useEvents();
  const [activeTab, setActiveTab] = useState<'liked' | 'submitted'>('liked');
  const [likedView, setLikedView] = useState<'all' | 'events' | 'specials'>('all');
  const [submittedEvents, setSubmittedEvents] = useState<SubmittedEvent[]>([]);
  const [loadingSubmissions, setLoadingSubmissions] = useState(false);
  const [dateFilterMode, setDateFilterMode] = useState<'none' | 'single' | 'range'>('none');
  const [dateFilter, setDateFilter] = useState('');
  const [dateRangeStart, setDateRangeStart] = useState<string>('');
  const [dateRangeEnd, setDateRangeEnd] = useState<string>('');
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [tempDateMode, setTempDateMode] = useState<'single' | 'range'>('single');
  const datePickerRef = useRef<HTMLDivElement>(null);

  const allLikedEvents = useMemo(() => {
    if (!events || !userLikes) return [];
    return events.filter(event => userLikes.includes(event.id));
  }, [events, userLikes]);
  
  // Separate into regular events and food & drink specials, then group by date
  const likedRegularEventsByDate = useMemo(() => {
    const filtered = allLikedEvents.filter(event => 
      !event.categories.includes('food-deal') && 
      !event.categories.includes('food') && 
      !event.categories.includes('drink')
    );
    
    // Filter by date range (default: today onwards)
    const today = startOfDay(new Date());
    const filteredByDate = filtered.filter(event => {
      const eventDate = startOfDay(parseISO(event.date));
      
      if (dateRangeStart && dateRangeEnd) {
        const rangeStart = startOfDay(parseISO(dateRangeStart));
        const rangeEnd = startOfDay(parseISO(dateRangeEnd));
        return isWithinInterval(eventDate, { start: rangeStart, end: rangeEnd });
      }
      
      // Default: today onwards
      return isAfter(eventDate, today) || isEqual(eventDate, today);
    }).sort((a, b) => {
      const dateCompare = a.date.localeCompare(b.date);
      if (dateCompare !== 0) return dateCompare;
      return a.startTime.localeCompare(b.startTime);
    });
    
    // Group by date
    const grouped: { [date: string]: typeof filteredByDate } = {};
    filteredByDate.forEach(event => {
      if (!grouped[event.date]) {
        grouped[event.date] = [];
      }
      grouped[event.date].push(event);
    });
    
    return grouped;
  }, [allLikedEvents, dateFilterMode, dateFilter, dateRangeStart, dateRangeEnd]);
  
  const likedSpecialsByDate = useMemo(() => {
    const filtered = allLikedEvents.filter(event => 
      event.categories.includes('food-deal') || 
      event.categories.includes('food') || 
      event.categories.includes('drink')
    );
    
    // Filter by date (default: today onwards)
    const today = startOfDay(new Date());
    const filteredByDate = filtered.filter(event => {
      const eventDate = startOfDay(parseISO(event.date));
      
      if (dateFilterMode === 'single' && dateFilter) {
        const filterDate = startOfDay(parseISO(dateFilter));
        return isEqual(eventDate, filterDate);
      } else if (dateFilterMode === 'range' && dateRangeStart && dateRangeEnd) {
        const rangeStart = startOfDay(parseISO(dateRangeStart));
        const rangeEnd = startOfDay(parseISO(dateRangeEnd));
        return isWithinInterval(eventDate, { start: rangeStart, end: rangeEnd });
      }
      
      // Default: today onwards
      return isAfter(eventDate, today) || isEqual(eventDate, today);
    }).sort((a, b) => {
      const dateCompare = a.date.localeCompare(b.date);
      if (dateCompare !== 0) return dateCompare;
      return a.startTime.localeCompare(b.startTime);
    });
    
    // Group by date
    const grouped: { [date: string]: typeof filteredByDate } = {};
    filteredByDate.forEach(event => {
      if (!grouped[event.date]) {
        grouped[event.date] = [];
      }
      grouped[event.date].push(event);
    });
    
    return grouped;
  }, [allLikedEvents, dateFilterMode, dateFilter, dateRangeStart, dateRangeEnd]);
  
  // Get sorted date arrays for iteration
  const regularEventDates = useMemo(() => {
    return Object.keys(likedRegularEventsByDate).sort();
  }, [likedRegularEventsByDate]);
  
  const specialDates = useMemo(() => {
    return Object.keys(likedSpecialsByDate).sort();
  }, [likedSpecialsByDate]);
  
  // Combined dates for "All Liked" view (default: today, tomorrow, day after tomorrow)
  const allLikedDates = useMemo(() => {
    const today = new Date();
    const tomorrow = addDays(today, 1);
    const dayAfterTomorrow = addDays(today, 2);
    
    // Get all unique dates from both events and specials
    const allDatesSet = new Set([
      ...Object.keys(likedRegularEventsByDate),
      ...Object.keys(likedSpecialsByDate)
    ]);
    
    // If date range is set, filter by range
    if (dateRangeStart && dateRangeEnd) {
      const rangeStart = startOfDay(parseISO(dateRangeStart));
      const rangeEnd = startOfDay(parseISO(dateRangeEnd));
      return Array.from(allDatesSet)
        .filter(dateStr => {
          const date = startOfDay(parseISO(dateStr));
          return isWithinInterval(date, { start: rangeStart, end: rangeEnd });
        })
        .sort();
    }
    
    // Default: today, tomorrow, and day after tomorrow
    const defaultDates = [
      format(today, 'yyyy-MM-dd'),
      format(tomorrow, 'yyyy-MM-dd'),
      format(dayAfterTomorrow, 'yyyy-MM-dd')
    ];
    
    return Array.from(allDatesSet)
      .filter(dateStr => defaultDates.includes(dateStr))
      .sort();
  }, [likedRegularEventsByDate, likedSpecialsByDate, dateFilterMode, dateFilter, dateRangeStart, dateRangeEnd]);
  
  // Get button display text
  const getDateButtonText = () => {
    if (dateFilterMode === 'single' && dateFilter) {
      return dateFilter;
    } else if (dateFilterMode === 'range' && dateRangeStart && dateRangeEnd) {
      return `${dateRangeStart} to ${dateRangeEnd}`;
    }
    return 'yyyy-mm-dd';
  };
  
  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (datePickerRef.current && !datePickerRef.current.contains(event.target as Node)) {
        setShowDatePicker(false);
      }
    };

    if (showDatePicker) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [showDatePicker]);

  useEffect(() => {
    if (!authLoading && !user) {
      router.push('/login');
    }
  }, [user, authLoading, router]);

  // Fetch submitted events for all users
  const fetchSubmissions = useCallback(async () => {
    if (user) {
      setLoadingSubmissions(true);
      try {
        const res = await fetch('/api/events/my-submissions');
        const data = await res.json();
        console.log('[MyEvents] Fetched submissions:', data.events?.length || 0, 'events');
        if (data.events) {
          setSubmittedEvents(data.events);
        }
      } catch (error) {
        console.error('[MyEvents] Error fetching submissions:', error);
      } finally {
        setLoadingSubmissions(false);
      }
    }
  }, [user]);

  useEffect(() => {
    if (user && activeTab === 'submitted') {
      fetchSubmissions();
    }
  }, [user, activeTab, fetchSubmissions]);

  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 size={32} className="animate-spin text-primary" />
      </div>
    );
  }

  if (!user) {
    return null;
  }
  
  const isOrganizer = user.role === 'organizer' || user.role === 'admin';

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'approved':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-700">
            <CheckCircle size={12} />
            Approved
          </span>
        );
      case 'pending':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium bg-amber-100 text-amber-700">
            <AlertTriangle size={12} />
            Pending Review
          </span>
        );
      case 'rejected':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium bg-red-100 text-red-700">
            <XCircle size={12} />
            Rejected
          </span>
        );
      default:
        return null;
    }
  };

  return (
    <div className="min-h-screen">
      {/* Header */}
      <section className="bg-gradient-to-br from-muted to-background py-12 sm:py-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center gap-3 mb-4">
            {activeTab === 'liked' ? (
              <Heart size={32} className="text-primary" />
            ) : (
              <FileText size={32} className="text-primary" />
            )}
            <h1 className="font-display text-4xl sm:text-5xl text-foreground">
              My Events
            </h1>
          </div>
          <p className="text-muted-foreground text-lg">
            {activeTab === 'liked' 
              ? "Events you've saved for later. Never miss out on what interests you."
              : "Events you've submitted. Track their approval status here."
            }
          </p>
        </div>
      </section>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Tabs */}
        <div className="flex gap-2 mb-8 border-b border-border">
            <button
              onClick={() => setActiveTab('liked')}
              className={`flex items-center gap-2 px-4 py-3 font-medium transition-colors relative ${
                activeTab === 'liked'
                  ? 'text-primary'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              <Heart size={18} />
              Liked
              {activeTab === 'liked' && (
                <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-primary" />
              )}
            </button>
            <button
              onClick={() => setActiveTab('submitted')}
              className={`flex items-center gap-2 px-4 py-3 font-medium transition-colors relative ${
                activeTab === 'submitted'
                  ? 'text-primary'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              <FileText size={18} />
              My Submissions
              {submittedEvents.filter(e => e.status === 'pending').length > 0 && (
                <span className="ml-1 px-1.5 py-0.5 text-xs bg-amber-500 text-white rounded-full">
                  {submittedEvents.filter(e => e.status === 'pending').length}
                </span>
              )}
              {activeTab === 'submitted' && (
                <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-primary" />
              )}
            </button>
          </div>

        {/* Liked Events Tab */}
        {activeTab === 'liked' && (
          <>
            {allLikedEvents.length > 0 ? (
              <>
                {/* View Toggle Buttons */}
                <div className="mb-6 flex gap-3">
                  <button
                    onClick={() => setLikedView('all')}
                    className={`px-6 py-3 rounded-xl font-semibold text-base transition-all ${
                      likedView === 'all'
                        ? 'bg-primary text-primary-foreground shadow-lg shadow-primary/25 scale-105'
                        : 'bg-card text-foreground border-2 border-border hover:border-primary/50 hover:shadow-md'
                    }`}
                  >
                    All Liked
                  </button>
                  <button
                    onClick={() => setLikedView('events')}
                    className={`px-6 py-3 rounded-xl font-semibold text-base transition-all ${
                      likedView === 'events'
                        ? 'bg-primary text-primary-foreground shadow-lg shadow-primary/25 scale-105'
                        : 'bg-card text-foreground border-2 border-border hover:border-primary/50 hover:shadow-md'
                    }`}
                  >
                    Liked Events
                  </button>
                  <button
                    onClick={() => setLikedView('specials')}
                    className={`px-6 py-3 rounded-xl font-semibold text-base transition-all ${
                      likedView === 'specials'
                        ? 'bg-primary text-primary-foreground shadow-lg shadow-primary/25 scale-105'
                        : 'bg-card text-foreground border-2 border-border hover:border-primary/50 hover:shadow-md'
                    }`}
                  >
                    Liked Specials
                  </button>
                </div>

                {/* Calendar Filter */}
                <div className="mb-6 flex justify-end">
                  <div className="relative" ref={datePickerRef}>
                    <button
                      onClick={() => {
                        const wasOpen = showDatePicker;
                        setShowDatePicker(!wasOpen);
                        if (!wasOpen) {
                          // Initialize temp mode based on current filter mode
                          if (dateFilterMode === 'single' || dateFilterMode === 'range') {
                            setTempDateMode(dateFilterMode);
                          } else {
                            setTempDateMode('single');
                          }
                        }
                      }}
                      className={`px-4 py-2.5 bg-card border border-border rounded-xl focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary text-sm flex items-center gap-2 min-w-[140px] justify-center ${
                        dateFilterMode !== 'none' ? 'text-primary font-medium' : 'text-muted-foreground'
                      }`}
                    >
                      <Calendar size={16} className={dateFilterMode !== 'none' ? 'text-primary' : 'text-muted-foreground'} />
                      <span>{getDateButtonText()}</span>
                    </button>
                    
                    {/* Date Picker Dropdown */}
                    {showDatePicker && (
                      <div className="absolute top-full mt-2 right-0 bg-card border border-border rounded-xl shadow-lg z-50 p-4 min-w-[280px]">
                        {/* Mode Toggle */}
                        <div className="flex gap-2 mb-4">
                          <button
                            onClick={() => setTempDateMode('single')}
                            className={`flex-1 px-3 py-1.5 text-xs font-medium rounded-lg transition-colors ${
                              tempDateMode === 'single'
                                ? 'bg-primary text-primary-foreground'
                                : 'bg-muted text-muted-foreground hover:bg-muted/80'
                            }`}
                          >
                            Single Date
                          </button>
                          <button
                            onClick={() => setTempDateMode('range')}
                            className={`flex-1 px-3 py-1.5 text-xs font-medium rounded-lg transition-colors ${
                              tempDateMode === 'range'
                                ? 'bg-primary text-primary-foreground'
                                : 'bg-muted text-muted-foreground hover:bg-muted/80'
                            }`}
                          >
                            Date Range
                          </button>
                        </div>
                        
                        {/* Date Input(s) */}
                        {tempDateMode === 'single' ? (
                          <div className="mb-4">
                            <DatePicker
                              value={dateFilter}
                              onChange={(value) => setDateFilter(value)}
                              placeholder="Select date"
                              className="text-sm"
                            />
                          </div>
                        ) : (
                          <div className="space-y-3 mb-4">
                            <DatePicker
                              value={dateRangeStart}
                              onChange={(value) => setDateRangeStart(value)}
                              placeholder="Start date"
                              className="text-sm"
                            />
                            <DatePicker
                              value={dateRangeEnd}
                              onChange={(value) => setDateRangeEnd(value)}
                              placeholder="End date"
                              className="text-sm"
                            />
                          </div>
                        )}
                        
                        {/* Actions */}
                        <div className="flex gap-2">
                          <button
                            onClick={() => {
                              setDateFilterMode(tempDateMode);
                              if (tempDateMode === 'single') {
                                // Use the current dateFilter value from the input
                                if (!dateFilter) {
                                  setDateFilter(format(new Date(), 'yyyy-MM-dd'));
                                }
                              } else if (tempDateMode === 'range') {
                                // Use the current dateRangeStart and dateRangeEnd values from the inputs
                                if (!dateRangeStart) setDateRangeStart(format(new Date(), 'yyyy-MM-dd'));
                                if (!dateRangeEnd) setDateRangeEnd(format(addDays(new Date(), 7), 'yyyy-MM-dd'));
                              }
                              setShowDatePicker(false);
                            }}
                            className="flex-1 px-4 py-2 bg-primary text-primary-foreground rounded-lg text-sm font-medium hover:opacity-90 transition-opacity"
                          >
                            Apply
                          </button>
                          <button
                            onClick={() => {
                              setDateFilterMode('none');
                              setDateFilter('');
                              setDateRangeStart('');
                              setDateRangeEnd('');
                              setShowDatePicker(false);
                            }}
                            className="px-4 py-2 bg-muted text-muted-foreground rounded-lg text-sm font-medium hover:bg-muted/80 transition-colors"
                          >
                            Clear
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                {/* All Liked View - Same layout as browse tab "All" */}
                {likedView === 'all' && (
                  <div className="space-y-10">
                    {allLikedDates.length > 0 ? (
                      allLikedDates.map((dateStr) => {
                        const date = parseISO(dateStr);
                        const headingLabel = isToday(date) 
                          ? 'Today' 
                          : isTomorrow(date) 
                            ? 'Tomorrow' 
                            : format(date, 'EEEE, MMMM d');
                        
                        const eventsForDate = likedRegularEventsByDate[dateStr] || [];
                        const dealsForDate = likedSpecialsByDate[dateStr] || [];
                        
                        return (
                          <div key={dateStr}>
                            {/* Date Section Header */}
                            <div className="mb-3 pb-2 border-b border-border">
                              <p className="text-primary font-medium text-sm uppercase tracking-wider">
                                {format(date, 'EEEE, MMMM d')}
                              </p>
                              <h3 className="font-display text-xl text-foreground">
                                {headingLabel}
                              </h3>
                            </div>
                            
                            {/* Two columns: Events and Food & Drink Specials side by side */}
                            <div className="flex flex-col lg:flex-row gap-6">
                              {/* Events Column */}
                              <div className="flex-[1.2] min-w-0">
                                <h4 className="font-display text-lg text-foreground mb-3 flex items-center gap-2">
                                  <Calendar size={18} className="text-primary" />
                                  Events
                                  <span className="text-sm font-normal text-muted-foreground">({eventsForDate.length})</span>
                                </h4>
                                {eventsForDate.length > 0 ? (
                                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    {eventsForDate.map((event) => (
                                      <EventCard key={event.id} event={event} />
                                    ))}
                                  </div>
                                ) : (
                                  <div className="text-center py-6 bg-muted rounded-xl">
                                    <Calendar size={24} className="mx-auto text-muted-foreground mb-2" />
                                    <p className="text-muted-foreground text-sm">No events</p>
                                  </div>
                                )}
                              </div>
                              
                              {/* Food & Drink Specials Column */}
                              <div className="lg:w-[32rem] flex-shrink-0">
                                <h4 className="font-display text-lg text-foreground mb-3 flex items-center gap-2">
                                  <Utensils size={18} className="text-primary" />
                                  Food & Drink Specials
                                  <span className="text-sm font-normal text-muted-foreground">({dealsForDate.length})</span>
                                </h4>
                                {dealsForDate.length > 0 ? (
                                  <div className="space-y-3">
                                    {dealsForDate.map((deal) => {
                                      const liked = isLiked(deal.id);
                                      const likeCount = getLikeCount(deal.id);
                                      const handleLikeClick = (e: React.MouseEvent) => {
                                        e.preventDefault();
                                        e.stopPropagation();
                                        if (!user) {
                                          router.push('/login');
                                          return;
                                        }
                                        toggleLike(deal.id);
                                      };
                                      return (
                                        <div
                                          key={deal.id}
                                          className="group relative flex items-center gap-3 p-2 rounded-xl bg-muted/50 hover:bg-muted transition-all"
                                        >
                                          <Link
                                            href={`/events/${deal.id}`}
                                            className="flex items-center gap-3 flex-1 min-w-0"
                                          >
                                            <div className="w-14 h-14 rounded-lg overflow-hidden bg-muted flex-shrink-0">
                                              {deal.imageUrl ? (
                                                <img
                                                  src={deal.imageUrl}
                                                  alt={deal.title}
                                                  className="w-full h-full object-cover"
                                                />
                                              ) : (
                                                <div className="w-full h-full bg-gradient-to-br from-primary/20 to-accent/20 flex items-center justify-center">
                                                  <Utensils size={18} className="text-primary" />
                                                </div>
                                              )}
                                            </div>
                                            <div className="flex-1 min-w-0">
                                              <h5 className="font-medium text-foreground group-hover:text-primary transition-colors line-clamp-1 text-base">
                                                {deal.title}
                                              </h5>
                                              <div className="mt-1 min-h-[1.5rem]">
                                                <div className="flex items-center gap-2 opacity-100 group-hover:opacity-0 group-hover:hidden transition-opacity duration-200">
                                                  {deal.price && (
                                                    <span className="inline-flex items-center px-2.5 py-1 rounded-full bg-primary/10 text-primary font-semibold text-sm">
                                                      {deal.price}
                                                    </span>
                                                  )}
                                                  <span className="text-muted-foreground text-sm flex items-center gap-1.5">
                                                    <Clock size={14} />
                                                    {format(parseISO(`2000-01-01T${deal.startTime}`), 'h:mm a')}
                                                    {deal.endTime && ` - ${format(parseISO(`2000-01-01T${deal.endTime}`), 'h:mm a')}`}
                                                  </span>
                                                </div>
                                                {deal.description && (
                                                  <p className="text-muted-foreground text-sm line-clamp-2 opacity-0 group-hover:opacity-100 transition-opacity duration-200 hidden group-hover:block">
                                                    {deal.description}
                                                  </p>
                                                )}
                                              </div>
                                            </div>
                                          </Link>
                                          <button
                                            onClick={handleLikeClick}
                                            className={`flex items-center gap-1 p-1.5 rounded-full transition-all flex-shrink-0 ${
                                              liked 
                                                ? 'text-red-500' 
                                                : 'text-muted-foreground hover:text-red-500'
                                            }`}
                                            title={user ? (liked ? 'Unlike' : 'Like') : 'Sign in to like'}
                                          >
                                            <Heart 
                                              size={16} 
                                              className={liked ? 'fill-current' : ''} 
                                            />
                                            {likeCount > 0 && (
                                              <span className="text-xs font-medium">
                                                {likeCount}
                                              </span>
                                            )}
                                          </button>
                                        </div>
                                      );
                                    })}
                                  </div>
                                ) : (
                                  <div className="text-center py-6 bg-muted rounded-xl">
                                    <Utensils size={24} className="mx-auto text-muted-foreground mb-2" />
                                    <p className="text-muted-foreground text-sm">No specials</p>
                                  </div>
                                )}
                              </div>
                            </div>
                          </div>
                        );
                      })
                    ) : (
                      <div className="text-center py-16 bg-card border border-border rounded-2xl">
                        <Heart size={64} className="mx-auto text-muted-foreground mb-4" />
                        <h2 className="font-display text-2xl text-foreground mb-2">No Liked Events Found</h2>
                        <p className="text-muted-foreground mb-6 max-w-md mx-auto">
                          Try adjusting your date range filter or like some events.
                        </p>
                      </div>
                    )}
                  </div>
                )}

                {/* Liked Events View */}
                {likedView === 'events' && (
                  <div>
                    {regularEventDates.length > 0 ? (
                      <div className="space-y-8">
                        {regularEventDates.map((dateStr) => {
                          const date = parseISO(dateStr);
                          const eventsForDate = likedRegularEventsByDate[dateStr];
                          const headingLabel = isToday(date) 
                            ? 'Today' 
                            : isTomorrow(date) 
                              ? 'Tomorrow' 
                              : format(date, 'EEEE, MMMM d');
                          
                          return (
                            <div key={dateStr}>
                              <div className="mb-3 pb-2 border-b border-border">
                                <p className="text-primary font-medium text-sm uppercase tracking-wider">
                                  {format(date, 'EEEE, MMMM d')}
                                </p>
                                <h3 className="font-display text-xl text-foreground">
                                  {headingLabel}
                                </h3>
                              </div>
                              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                                {eventsForDate.map((event) => (
                                  <EventCard key={event.id} event={event} />
                                ))}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    ) : (
                      <div className="text-center py-12 bg-card border border-border rounded-xl">
                        <Calendar size={32} className="mx-auto text-muted-foreground mb-3" />
                        <p className="text-muted-foreground">No liked events found</p>
                      </div>
                    )}
                  </div>
                )}

                {/* Liked Specials View */}
                {likedView === 'specials' && (
                  <div>
                    {specialDates.length > 0 ? (
                      <div className="space-y-8">
                        {specialDates.map((dateStr) => {
                          const date = parseISO(dateStr);
                          const dealsForDate = likedSpecialsByDate[dateStr];
                          const headingLabel = isToday(date) 
                            ? 'Today' 
                            : isTomorrow(date) 
                              ? 'Tomorrow' 
                              : format(date, 'EEEE, MMMM d');
                          
                          return (
                            <div key={dateStr}>
                              <div className="mb-3 pb-2 border-b border-border">
                                <p className="text-primary font-medium text-sm uppercase tracking-wider">
                                  {format(date, 'EEEE, MMMM d')}
                                </p>
                                <h3 className="font-display text-xl text-foreground">
                                  {headingLabel}
                                </h3>
                              </div>
                              <div className="space-y-3">
                                {dealsForDate.map((deal) => {
                                  const liked = isLiked(deal.id);
                                  const likeCount = getLikeCount(deal.id);
                                  const handleLikeClick = (e: React.MouseEvent) => {
                                    e.preventDefault();
                                    e.stopPropagation();
                                    if (!user) {
                                      router.push('/login');
                                      return;
                                    }
                                    toggleLike(deal.id);
                                  };
                                  return (
                                    <div
                                      key={deal.id}
                                      className="group relative flex items-center gap-3 p-2 rounded-xl bg-muted/50 hover:bg-muted transition-all"
                                    >
                                      <Link
                                        href={`/events/${deal.id}`}
                                        className="flex items-center gap-3 flex-1 min-w-0"
                                      >
                                        <div className="w-14 h-14 rounded-lg overflow-hidden bg-muted flex-shrink-0">
                                          {deal.imageUrl ? (
                                            <img
                                              src={deal.imageUrl}
                                              alt={deal.title}
                                              className="w-full h-full object-cover"
                                            />
                                          ) : (
                                            <div className="w-full h-full bg-gradient-to-br from-primary/20 to-accent/20 flex items-center justify-center">
                                              <Utensils size={18} className="text-primary" />
                                            </div>
                                          )}
                                        </div>
                                        <div className="flex-1 min-w-0">
                                          <h5 className="font-medium text-foreground group-hover:text-primary transition-colors line-clamp-1 text-lg">
                                            {deal.title}
                                          </h5>
                                          <div className="mt-1 min-h-[1.5rem]">
                                            <div className="flex items-center gap-2 opacity-100 group-hover:opacity-0 group-hover:hidden transition-opacity duration-200">
                                              {deal.price && (
                                                <span className="inline-flex items-center px-3 py-1.5 rounded-full bg-primary/10 text-primary font-semibold text-base">
                                                  {deal.price}
                                                </span>
                                              )}
                                              <span className="text-muted-foreground text-base flex items-center gap-1.5">
                                                <Clock size={16} />
                                                {format(parseISO(`2000-01-01T${deal.startTime}`), 'h:mm a')}
                                                {deal.endTime && ` - ${format(parseISO(`2000-01-01T${deal.endTime}`), 'h:mm a')}`}
                                              </span>
                                            </div>
                                            {deal.description && (
                                              <p className="text-muted-foreground text-base line-clamp-2 opacity-0 group-hover:opacity-100 transition-opacity duration-200 hidden group-hover:block">
                                                {deal.description}
                                              </p>
                                            )}
                                          </div>
                                        </div>
                                      </Link>
                                      <button
                                        onClick={handleLikeClick}
                                        className={`flex items-center gap-1 p-1.5 rounded-full transition-all flex-shrink-0 ${
                                          liked 
                                            ? 'text-red-500' 
                                            : 'text-muted-foreground hover:text-red-500'
                                        }`}
                                        title={user ? (liked ? 'Unlike' : 'Like') : 'Sign in to like'}
                                      >
                                        <Heart 
                                          size={16} 
                                          className={liked ? 'fill-current' : ''} 
                                        />
                                        {likeCount > 0 && (
                                          <span className="text-xs font-medium">
                                            {likeCount}
                                          </span>
                                        )}
                                      </button>
                                    </div>
                                  );
                                })}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    ) : (
                      <div className="text-center py-12 bg-card border border-border rounded-xl">
                        <Utensils size={32} className="mx-auto text-muted-foreground mb-3" />
                        <p className="text-muted-foreground">No liked specials found</p>
                      </div>
                    )}
                  </div>
                )}

              </>
            ) : (
              <div className="text-center py-16 bg-card border border-border rounded-2xl">
                <Heart size={64} className="mx-auto text-muted-foreground mb-4" />
                <h2 className="font-display text-2xl text-foreground mb-2">No Saved Events Yet</h2>
                <p className="text-muted-foreground mb-6 max-w-md mx-auto">
                  When you find events you&apos;re interested in, click the heart icon to save them here.
                </p>
                <Link
                  href="/events"
                  className="inline-flex items-center gap-2 px-6 py-3 bg-primary text-primary-foreground rounded-xl font-medium hover:opacity-90 transition-opacity"
                >
                  Browse Events
                  <ArrowRight size={18} />
                </Link>
              </div>
            )}
          </>
        )}

        {/* Submitted Events Tab */}
        {activeTab === 'submitted' && (
          <>
            {loadingSubmissions ? (
              <div className="text-center py-16">
                <Loader2 size={32} className="animate-spin text-primary mx-auto" />
              </div>
            ) : submittedEvents.length > 0 ? (
              <>
                <div className="flex items-center justify-between mb-6">
                  <p className="text-muted-foreground">
                    {submittedEvents.length} submitted event{submittedEvents.length !== 1 ? 's' : ''}
                  </p>
                  <div className="flex gap-2">
                    <button
                      onClick={() => fetchSubmissions()}
                      className="flex items-center gap-2 px-4 py-2 border border-border rounded-lg font-medium hover:bg-muted transition-colors"
                    >
                      Refresh
                    </button>
                    <Link
                      href="/submit"
                      className="flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-lg font-medium hover:opacity-90 transition-opacity"
                    >
                      Submit New Event
                    </Link>
                  </div>
                </div>
                <div className="space-y-4">
                  {submittedEvents.map((event) => (
                    <div
                      key={event.id}
                      className="bg-card border border-border rounded-xl overflow-hidden"
                    >
                      <div className="p-6">
                        <div className="flex flex-col lg:flex-row lg:items-start gap-6">
                          {/* Event Image */}
                          <div className="w-full lg:w-40 h-28 rounded-lg overflow-hidden bg-muted flex-shrink-0">
                            {event.imageUrl ? (
                              <img
                                src={event.imageUrl}
                                alt={event.title}
                                className="w-full h-full object-cover"
                              />
                            ) : (
                              <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-primary/10 to-secondary/10">
                                <Calendar size={28} className="text-muted-foreground" />
                              </div>
                            )}
                          </div>

                          {/* Event Details */}
                          <div className="flex-1 min-w-0">
                            <div className="flex flex-wrap items-center gap-2 mb-2">
                              {getStatusBadge(event.status)}
                              {event.categories.slice(0, 2).map((cat) => (
                                <span
                                  key={cat}
                                  className={`px-2 py-0.5 rounded-full text-xs font-medium text-white ${categoryColors[cat as EventCategory]}`}
                                >
                                  {categoryLabels[cat as EventCategory]}
                                </span>
                              ))}
                            </div>
                            
                            <h3 className="font-display text-lg text-foreground mb-1">
                              {event.title}
                            </h3>
                            
                            <div className="flex flex-wrap items-center gap-4 text-sm text-muted-foreground mb-2">
                              <span className="flex items-center gap-1">
                                <Calendar size={14} />
                                {format(parseISO(event.date), 'EEE, MMM d, yyyy')}
                              </span>
                              <span className="flex items-center gap-1">
                                <Clock size={14} />
                                {format(parseISO(`2000-01-01T${event.startTime}`), 'h:mm a')}
                              </span>
                            </div>
                            
                            <p className="text-sm text-muted-foreground">
                              Submitted {format(parseISO(event.createdAt), 'MMM d, yyyy \'at\' h:mm a')}
                            </p>
                          </div>

                          {/* Actions */}
                          {event.status === 'approved' && (
                            <div className="flex-shrink-0">
                              <Link
                                href={`/events/${event.id}`}
                                className="flex items-center gap-2 px-4 py-2 bg-primary/10 text-primary rounded-lg hover:bg-primary/20 transition-colors"
                              >
                                View Event
                                <ArrowRight size={16} />
                              </Link>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </>
            ) : (
              <div className="text-center py-16 bg-card border border-border rounded-2xl">
                <FileText size={64} className="mx-auto text-muted-foreground mb-4" />
                <h2 className="font-display text-2xl text-foreground mb-2">No Submitted Events Yet</h2>
                <p className="text-muted-foreground mb-6 max-w-md mx-auto">
                  Share your events with Kingston&apos;s community. Submit your first event now!
                </p>
                <Link
                  href="/submit"
                  className="inline-flex items-center gap-2 px-6 py-3 bg-primary text-primary-foreground rounded-xl font-medium hover:opacity-90 transition-opacity"
                >
                  Submit an Event
                  <ArrowRight size={18} />
                </Link>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
