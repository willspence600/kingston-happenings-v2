'use client';

import Link from 'next/link';
import { Calendar, Clock, MapPin, Ticket, Heart, Repeat, Ban } from 'lucide-react';
import type { Event } from '@/types/event';
import { categoryLabels, categoryColors } from '@/constants/categories';
import { format, parseISO } from 'date-fns';
import { useEvents } from '@/contexts/EventsContext';
import { useAuth } from '@/contexts/AuthContext';
import { useRouter } from 'next/navigation';

interface EventCardProps {
  event: Event;
  variant?: 'default' | 'featured' | 'compact';
  onLike?: () => void;
}

export default function EventCard({ event, variant = 'default', onLike }: EventCardProps) {
  const { isLiked, toggleLike, getLikeCount } = useEvents();
  const { user } = useAuth();
  const router = useRouter();
  
  const formattedDate = format(parseISO(event.date), 'EEE, MMM d');
  const formattedTime = event.isAllDay ? 'All Day' : format(parseISO(`2000-01-01T${event.startTime}`), 'h:mm a');
  const liked = isLiked(event.id);
  const likeCount = getLikeCount(event.id);
  const isCancelled = event.status === 'cancelled';

  const handleLikeClick = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (!user) {
      router.push('/login');
      return;
    }
    const wasLiked = liked;
    toggleLike(event.id);
    if (!wasLiked && onLike) {
      onLike();
    }
  };

  const LikeButton = ({ size = 'default' }: { size?: 'default' | 'small' }) => (
    <button
      onClick={handleLikeClick}
      className={`flex items-center gap-1 rounded-full transition-all relative z-10 ${
        liked 
          ? 'text-red-500' 
          : 'text-muted-foreground hover:text-red-500'
      } ${size === 'small' ? 'p-1' : 'p-2 bg-card/90 backdrop-blur-sm hover:bg-card border border-border/50'}`}
      title={user ? (liked ? 'Unlike' : 'Like') : 'Sign in to like'}
    >
      <Heart 
        size={size === 'small' ? 14 : 18} 
        className={liked ? 'fill-current' : ''} 
      />
      {likeCount > 0 && (
        <span className={`font-medium ${size === 'small' ? 'text-xs' : 'text-sm'}`}>
          {likeCount}
        </span>
      )}
    </button>
  );

  if (variant === 'compact') {
    return (
      <div className="group relative">
        <Link href={`/events/${event.id}`} className="block">
          <div className="flex items-center gap-4 p-3 rounded-xl bg-card border border-border hover:border-primary/50 transition-all card-hover">
            <div className="flex-shrink-0 w-14 h-14 rounded-lg bg-muted flex flex-col items-center justify-center">
              <span className="text-xs text-muted-foreground uppercase">
                {format(parseISO(event.date), 'MMM')}
              </span>
              <span className="text-lg font-semibold text-foreground">
                {format(parseISO(event.date), 'd')}
              </span>
            </div>
            <div className="flex-1 min-w-0">
              <h3 className="font-medium text-foreground truncate group-hover:text-primary transition-colors">
                {event.title}
                {event.isRecurring && (
                  <Repeat size={12} className="inline ml-1 text-primary" />
                )}
              </h3>
              <p className="text-sm text-muted-foreground truncate">
                {event.venue.name} · {formattedTime}
              </p>
            </div>
            <div className="flex items-center gap-2">
              {event.price && (
                <span className="flex-shrink-0 text-sm font-medium text-primary">
                  {event.price}
                </span>
              )}
              <LikeButton size="small" />
            </div>
          </div>
        </Link>
      </div>
    );
  }

  if (variant === 'featured') {
    return (
      <div className="group relative">
        <Link href={`/events/${event.id}`} className="block">
          <div className="relative rounded-2xl overflow-hidden bg-card border border-border card-hover">
            <div className="relative h-48 sm:h-56 bg-muted">
              {event.imageUrl ? (
                <img
                  src={event.imageUrl}
                  alt={event.title}
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-primary/20 to-secondary/20">
                  <Calendar size={48} className="text-muted-foreground" />
                </div>
              )}
              <div className="absolute top-3 left-3 flex flex-wrap gap-1">
                {event.categories.slice(0, 2).map((cat) => (
                  <span
                    key={cat}
                    className={`px-2 py-0.5 rounded-full text-xs font-medium text-white ${categoryColors[cat]}`}
                  >
                    {categoryLabels[cat]}
                  </span>
                ))}
              </div>
              <div className="absolute top-3 right-3 z-10">
                <LikeButton />
              </div>
              {event.featured && (
                <div className="absolute bottom-3 right-3">
                  <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-accent text-accent-foreground">
                    Featured
                  </span>
                </div>
              )}
            </div>
            
            <div className="p-5">
              <h3 className="font-display text-xl text-foreground group-hover:text-primary transition-colors mb-2">
                {event.title}
              </h3>
              <p className="text-muted-foreground text-sm line-clamp-2 mb-4">
                {event.description}
              </p>
              <div className="flex flex-wrap items-center gap-4 text-sm text-muted-foreground">
                <span className="flex items-center gap-1">
                  <Calendar size={14} />
                  {formattedDate}
                </span>
                <span className="flex items-center gap-1">
                  <Clock size={14} />
                  {formattedTime}
                </span>
                <span className="flex items-center gap-1">
                  <MapPin size={14} />
                  {event.venue.name}
                </span>
                {event.isRecurring && (
                  <span className="flex items-center gap-1 text-primary" title="Recurring event">
                    <Repeat size={14} />
                    {event.recurrencePattern === 'weekly' ? 'Weekly' : 
                     event.recurrencePattern === 'biweekly' ? 'Biweekly' : 
                     event.recurrencePattern === 'monthly' ? 'Monthly' : 'Recurring'}
                  </span>
                )}
              </div>
              {event.price && (
                <div className="mt-4 flex items-center justify-between">
                  <span className="flex items-center gap-1 text-primary font-medium">
                    <Ticket size={16} />
                    {event.price}
                  </span>
                </div>
              )}
            </div>
          </div>
        </Link>
      </div>
    );
  }

  // Default variant
  return (
    <div className="group relative">
      <Link href={`/events/${event.id}`} className="block">
        <div className={`rounded-xl overflow-hidden bg-card border border-border card-hover ${isCancelled ? 'opacity-75' : ''}`}>
          <div className="relative h-40 bg-muted">
            {event.imageUrl ? (
              <img
                src={event.imageUrl}
                alt={event.title}
                className={`w-full h-full object-cover group-hover:scale-105 transition-transform duration-500 ${isCancelled ? 'grayscale' : ''}`}
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-primary/10 to-secondary/10">
                <Calendar size={32} className="text-muted-foreground" />
              </div>
            )}
            {isCancelled && (
              <div className="absolute inset-0 flex items-center justify-center bg-black/50">
                <span className="flex items-center gap-1 px-3 py-1.5 bg-red-600 text-white text-sm font-medium rounded-lg">
                  <Ban size={14} />
                  Cancelled
                </span>
              </div>
            )}
            {!isCancelled && (
              <div className="absolute inset-0 bg-black/80 opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex items-end z-0 group-hover:scale-105 transition-transform duration-500">
                <div className="w-full px-5 pb-4">
                  <p className="text-white text-base line-clamp-4">
                    {event.description}
                  </p>
                </div>
              </div>
            )}
            {!isCancelled && (
              <div className="absolute top-2 left-2 flex flex-wrap gap-1 z-10">
                {event.categories.slice(0, 2).map((cat) => (
                  <span
                    key={cat}
                    className={`px-2 py-0.5 rounded-full text-xs font-medium text-white ${categoryColors[cat]}`}
                  >
                    {categoryLabels[cat]}
                  </span>
                ))}
              </div>
            )}
            <div className="absolute top-2 right-2 z-10">
              <LikeButton />
            </div>
          </div>
          
          <div className="p-4">
            <h3 className="font-display text-lg text-foreground group-hover:text-primary transition-colors mb-1 line-clamp-1">
              {event.title}
            </h3>
            <div className="flex flex-wrap items-center gap-3 text-sm text-muted-foreground mb-2">
              <span className="flex items-center gap-1">
                <Calendar size={12} />
                {formattedDate}
              </span>
              <span className="flex items-center gap-1">
                <Clock size={12} />
                {formattedTime}
              </span>
              {event.isRecurring && (
                <span className="flex items-center gap-1 text-primary" title="Recurring event">
                  <Repeat size={12} />
                  {event.recurrencePattern === 'weekly' ? 'Weekly' : 
                   event.recurrencePattern === 'biweekly' ? 'Biweekly' : 
                   event.recurrencePattern === 'monthly' ? 'Monthly' : 'Recurring'}
                </span>
              )}
            </div>
            <p className="text-sm text-muted-foreground flex items-center gap-1">
              <MapPin size={12} />
              {event.venue.name}
            </p>
            {event.price && (
              <p className="mt-2 text-sm font-medium text-primary">
                {event.price}
              </p>
            )}
          </div>
        </div>
      </Link>
    </div>
  );
}

