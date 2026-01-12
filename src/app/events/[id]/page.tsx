'use client';

import { use, useState, useCallback } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { 
  ArrowLeft, 
  Calendar, 
  Clock, 
  MapPin, 
  Ticket, 
  ExternalLink,
  Share2,
  Heart,
  Navigation,
  Copy,
  Check,
  Repeat
} from 'lucide-react';
import { format, parseISO } from 'date-fns';
import { useEvents } from '@/contexts/EventsContext';
import { useAuth } from '@/contexts/AuthContext';
import { categoryLabels, categoryColors } from '@/types/event';
import { EventCard, Toast } from '@/components';

export default function EventDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const router = useRouter();
  const { getEventById, getEventsByVenue, isLiked, toggleLike, getLikeCount } = useEvents();
  const { user } = useAuth();
  const [showToast, setShowToast] = useState(false);
  const [toastMessage, setToastMessage] = useState('');
  const [copied, setCopied] = useState(false);
  
  const event = getEventById(id);

  if (!event) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <h1 className="font-display text-3xl text-foreground mb-4">Event Not Found</h1>
          <p className="text-muted-foreground mb-6">The event you&apos;re looking for doesn&apos;t exist.</p>
          <Link
            href="/events"
            className="inline-flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-lg"
          >
            <ArrowLeft size={18} />
            Back to Events
          </Link>
        </div>
      </div>
    );
  }

  const formattedDate = format(parseISO(event.date), 'EEEE, MMMM d, yyyy');
  const formattedStartTime = format(parseISO(`2000-01-01T${event.startTime}`), 'h:mm a');
  const formattedEndTime = event.endTime 
    ? format(parseISO(`2000-01-01T${event.endTime}`), 'h:mm a')
    : null;

  const otherVenueEvents = getEventsByVenue(event.venue.id)
    .filter(e => e.id !== event.id && e.date >= format(new Date(), 'yyyy-MM-dd'))
    .slice(0, 3);

  const liked = isLiked(event.id);
  const likeCount = getLikeCount(event.id);

  const handleShare = useCallback(async () => {
    const url = window.location.href;
    
    // Try native share first (mobile devices)
    if (typeof navigator !== 'undefined' && navigator.share) {
      try {
        await navigator.share({
          title: event.title,
          text: `Check out ${event.title} at ${event.venue.name}`,
          url,
        });
        return;
      } catch (err) {
        // User cancelled or share failed, fall through to clipboard
        if ((err as Error).name === 'AbortError') return;
      }
    }
    
    // Fallback: copy to clipboard
    try {
      if (navigator.clipboard && navigator.clipboard.writeText) {
        await navigator.clipboard.writeText(url);
      } else {
        // Fallback for older browsers
        const textArea = document.createElement('textarea');
        textArea.value = url;
        textArea.style.position = 'fixed';
        textArea.style.left = '-9999px';
        document.body.appendChild(textArea);
        textArea.select();
        document.execCommand('copy');
        document.body.removeChild(textArea);
      }
      setCopied(true);
      setToastMessage('Link copied to clipboard!');
      setShowToast(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      setToastMessage('Could not copy link');
      setShowToast(true);
    }
  }, [event.title, event.venue.name]);

  const handleLike = () => {
    if (!user) {
      router.push('/login');
      return;
    }
    toggleLike(event.id);
  };

  return (
    <div className="min-h-screen">
      {/* Hero Image */}
      <div className="relative h-64 sm:h-80 lg:h-96 bg-muted">
        {event.imageUrl ? (
          <img
            src={event.imageUrl}
            alt={event.title}
            className="w-full h-full object-cover"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-primary/20 to-secondary/20">
            <Calendar size={64} className="text-muted-foreground" />
          </div>
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/20 to-transparent" />
        
        {/* Back button */}
        <button
          onClick={() => router.back()}
          className="absolute top-4 left-4 p-2 bg-card/90 backdrop-blur-sm rounded-lg hover:bg-card transition-colors border border-border/50"
        >
          <ArrowLeft size={20} className="text-foreground" />
        </button>

        {/* Action buttons */}
        <div className="absolute top-4 right-4 flex items-center gap-2">
          <button
            onClick={handleShare}
            className="p-2 bg-card/90 backdrop-blur-sm rounded-lg hover:bg-card transition-colors border border-border/50"
            title="Share"
          >
            <Share2 size={20} className="text-foreground" />
          </button>
          <button
            onClick={handleLike}
            className={`p-2 bg-card/90 backdrop-blur-sm rounded-lg hover:bg-card transition-colors flex items-center gap-1 border border-border/50 ${
              liked ? 'text-red-500' : 'text-foreground'
            }`}
            title={user ? (liked ? 'Unlike' : 'Like') : 'Sign in to like'}
          >
            <Heart size={20} className={liked ? 'fill-current' : ''} />
            {likeCount > 0 && <span className="text-sm font-medium">{likeCount}</span>}
          </button>
        </div>

        {/* Category badges */}
        <div className="absolute bottom-4 left-4 flex flex-wrap gap-2">
          {event.categories.map((cat) => (
            <Link
              key={cat}
              href={`/events?category=${cat}`}
              className={`px-3 py-1 rounded-full text-sm font-medium text-white ${categoryColors[cat]} hover:opacity-90 transition-opacity`}
            >
              {categoryLabels[cat]}
            </Link>
          ))}
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Main Content */}
          <div className="lg:col-span-2">
            <h1 className="font-display text-3xl sm:text-4xl lg:text-5xl text-foreground mb-4">
              {event.title}
            </h1>

            {/* Quick Info */}
            <div className="flex flex-wrap items-center gap-4 text-muted-foreground mb-8">
              <span className="flex items-center gap-2">
                <Calendar size={18} className="text-primary" />
                {formattedDate}
              </span>
              <span className="flex items-center gap-2">
                <Clock size={18} className="text-primary" />
                {formattedStartTime}
                {formattedEndTime && ` - ${formattedEndTime}`}
              </span>
              {event.isRecurring && (
                <span className="flex items-center gap-2 px-3 py-1 bg-primary/10 rounded-full text-primary">
                  <Repeat size={16} />
                  {event.recurrencePattern === 'weekly' ? 'Every week' : 
                   event.recurrencePattern === 'biweekly' ? 'Every 2 weeks' : 
                   event.recurrencePattern === 'monthly' ? 'Every month' : 'Recurring'}
                </span>
              )}
            </div>

            {/* Description */}
            <div className="prose prose-lg max-w-none mb-8">
              <h2 className="font-display text-2xl text-foreground mb-4">About This Event</h2>
              <p className="text-muted-foreground leading-relaxed">
                {event.description}
              </p>
            </div>

            {/* Venue Section */}
            <div className="bg-card border border-border rounded-xl p-6 mb-8">
              <h2 className="font-display text-2xl text-foreground mb-4">Venue</h2>
              <div className="flex items-start gap-4">
                <div className="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
                  <MapPin size={24} className="text-primary" />
                </div>
                <div>
                  <Link
                    href={`/venues/${event.venue.id}`}
                    className="font-medium text-lg text-foreground hover:text-primary transition-colors"
                  >
                    {event.venue.name}
                  </Link>
                  <p className="text-muted-foreground">{event.venue.address}</p>
                  {event.venue.neighborhood && (
                    <p className="text-sm text-muted-foreground mt-1">{event.venue.neighborhood}</p>
                  )}
                  <div className="flex items-center gap-4 mt-3">
                    <a
                      href={`https://maps.google.com/?q=${encodeURIComponent(event.venue.address)}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-1 text-sm text-primary hover:underline"
                    >
                      <Navigation size={14} />
                      Get Directions
                    </a>
                    {event.venue.website && (
                      <a
                        href={event.venue.website}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center gap-1 text-sm text-primary hover:underline"
                      >
                        <ExternalLink size={14} />
                        Website
                      </a>
                    )}
                  </div>
                </div>
              </div>
            </div>

            {/* Other events at this venue */}
            {otherVenueEvents.length > 0 && (
              <div>
                <h2 className="font-display text-2xl text-foreground mb-4">
                  More at {event.venue.name}
                </h2>
                <div className="space-y-3">
                  {otherVenueEvents.map((e) => (
                    <EventCard key={e.id} event={e} variant="compact" />
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Sidebar */}
          <div className="lg:col-span-1">
            <div className="sticky top-24 space-y-6">
              {/* Ticket/Price Card */}
              <div className="bg-card border border-border rounded-xl p-6">
                {event.price && (
                  <div className="flex items-center gap-2 mb-4">
                    <Ticket size={20} className="text-primary" />
                    <span className="text-2xl font-display text-foreground">{event.price}</span>
                  </div>
                )}
                
                {event.ticketUrl ? (
                  <a
                    href={event.ticketUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="w-full flex items-center justify-center gap-2 px-6 py-3 bg-primary text-primary-foreground rounded-xl font-medium hover:opacity-90 transition-opacity"
                  >
                    Get Tickets
                    <ExternalLink size={16} />
                  </a>
                ) : (
                  <button
                    onClick={handleLike}
                    className={`w-full flex items-center justify-center gap-2 px-6 py-3 rounded-xl font-medium transition-all ${
                      liked 
                        ? 'bg-red-100 text-red-600 hover:bg-red-200' 
                        : 'bg-primary text-primary-foreground hover:opacity-90'
                    }`}
                  >
                    <Heart size={16} className={liked ? 'fill-current' : ''} />
                    {liked ? 'Saved!' : "I'm Interested"}
                  </button>
                )}

                <button
                  onClick={handleShare}
                  className="w-full flex items-center justify-center gap-2 px-6 py-3 mt-3 border border-border rounded-xl font-medium hover:bg-muted transition-colors"
                >
                  <Share2 size={16} />
                  Share Event
                </button>
              </div>

              {/* Event Details Card */}
              <div className="bg-card border border-border rounded-xl p-6">
                <h3 className="font-medium text-foreground mb-4">Event Details</h3>
                <dl className="space-y-4">
                  <div>
                    <dt className="text-sm text-muted-foreground">Date</dt>
                    <dd className="text-foreground">{formattedDate}</dd>
                  </div>
                  <div>
                    <dt className="text-sm text-muted-foreground">Time</dt>
                    <dd className="text-foreground">
                      {formattedStartTime}
                      {formattedEndTime && ` - ${formattedEndTime}`}
                    </dd>
                  </div>
                  <div>
                    <dt className="text-sm text-muted-foreground">Location</dt>
                    <dd className="text-foreground">{event.venue.name}</dd>
                    <dd className="text-sm text-muted-foreground">{event.venue.address}</dd>
                  </div>
                  {event.price && (
                    <div>
                      <dt className="text-sm text-muted-foreground">Price</dt>
                      <dd className="text-foreground">{event.price}</dd>
                    </div>
                  )}
                  {likeCount > 0 && (
                    <div>
                      <dt className="text-sm text-muted-foreground">Interest</dt>
                      <dd className="text-foreground flex items-center gap-1">
                        <Heart size={14} className="text-red-500 fill-current" />
                        {likeCount} {likeCount === 1 ? 'person' : 'people'} interested
                      </dd>
                    </div>
                  )}
                </dl>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Toast notification */}
      <Toast
        isOpen={showToast}
        message={toastMessage}
        type="success"
        onClose={() => setShowToast(false)}
      />
    </div>
  );
}
