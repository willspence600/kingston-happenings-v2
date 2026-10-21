'use client';

import { use, useState, useCallback, type ReactNode } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  ArrowLeft,
  Calendar,
  Clock,
  MapPin,
  Ticket,
  Heart,
  Repeat,
  Edit,
  Ban,
  Trash2,
  Loader2,
  Share2,
  Utensils,
  Wine,
  Tag as TagIcon,
} from 'lucide-react';
import { format, parseISO } from 'date-fns';
import { useEvents } from '@/contexts/EventsContext';
import { useAuth } from '@/contexts/AuthContext';
import type { Event } from '@/types/event';
import { Toast } from '@/components';
import SmartImage from '@/components/ui/SmartImage';
import { formatPrice, isFreePrice } from '@/utils/price';
import { isListingDetailCategory, specialConditionCategories } from '@/constants/categories';
import { getRecurrenceLabel } from '@/utils/recurrenceLabel';
import {
  CategoryTag,
  SaveButton,
  Tag,
  TimeCard,
  formatTime,
  isAllDayEvent,
  isDowntown,
} from '@/components/brand';

function DetailRow({ icon, label, children }: { icon: ReactNode; label: string; children: ReactNode }) {
  return (
    <div className="flex gap-3 border-b border-line py-4 last:border-b-0">
      <span className="mt-0.5 text-link">{icon}</span>
      <div className="min-w-0">
        <p className="text-[11px] font-medium uppercase tracking-[0.14em] text-ink-muted">{label}</p>
        <p className="mt-1 text-[14px] text-navy">{children}</p>
      </div>
    </div>
  );
}

function recurrenceOf(event: Event) {
  return event.isRecurring
    ? getRecurrenceLabel({
        recurrencePattern: event.recurrencePattern,
        recurrenceDays: event.recurrenceDays,
        recurrenceDay: event.recurrenceDay,
      })
    : null;
}

function isOnNow(event: Event) {
  if (event.date !== format(new Date(), 'yyyy-MM-dd')) return false;
  if (isAllDayEvent(event)) return true;
  const now = format(new Date(), 'HH:mm');
  const end = event.endTime && event.endTime > event.startTime ? event.endTime : '23:59';
  return event.startTime <= now && now <= end;
}

function SpecialMiniRow({ event, saved, onSave, extra }: { event: Event; saved: boolean; onSave: () => void; extra?: string }) {
  const isDrink = event.categories.includes('drink') && !event.categories.includes('food');
  const recurrence = recurrenceOf(event) ?? format(parseISO(event.date), 'EEE, MMM d');
  return (
    <div className="group relative flex items-start gap-5 border-b border-line py-4">
      <Link href={`/events/${event.id}`} className="absolute inset-0" aria-label={event.title} />
      <span className="flex w-[72px] shrink-0 flex-col text-[13px] text-navy pointer-events-none">
        {isAllDayEvent(event) ? (
          <span className="font-medium">All day</span>
        ) : (
          <>
            <span className="font-medium">{formatTime(event.startTime)}</span>
            {event.endTime && <span className="text-ink-muted">– {formatTime(event.endTime)}</span>}
          </>
        )}
      </span>
      <span
        className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-[9px] pointer-events-none ${
          isDrink ? 'bg-sky text-link-deep' : 'bg-[#ffe8d6] text-[#a84a12]'
        }`}
      >
        {isDrink ? <Wine size={15} /> : <Utensils size={15} />}
      </span>
      <span className="flex min-w-0 flex-1 flex-col gap-1 pointer-events-none">
        <span className="truncate text-[16px] font-bold text-navy group-hover:underline">{event.title}</span>
        <span className="truncate text-[13px] text-ink-muted">
          {event.venue.name}
          {event.venue.neighborhood ? ` · ${event.venue.neighborhood}` : ''}
          {extra ? ` · ${extra}` : ''}
        </span>
        <span className="line-clamp-1 text-[13px] text-ink-muted">{event.summary || event.description}</span>
      </span>
      <span className="flex shrink-0 flex-col items-end gap-1 text-right pointer-events-none">
        {isOnNow(event) && (
          <span className="tag bg-success-tint text-success normal-case tracking-normal font-medium gap-1">
            <span className="h-1.5 w-1.5 rounded-full bg-success" /> On now
          </span>
        )}
        <span className="text-[12px] text-ink-muted">{recurrence}</span>
      </span>
      <SaveButton saved={saved} onClick={onSave} size={16} className="relative z-10 -mt-1" />
    </div>
  );
}

export default function EventDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const router = useRouter();
  const { getEventById, getEventsByVenue, getTodaysEvents, isLiked, toggleLike, getLikeCount, isLoading } = useEvents();
  const { user, isAdmin } = useAuth();
  const [showToast, setShowToast] = useState(false);
  const [toastMessage, setToastMessage] = useState('');
  const [eventActionLoading, setEventActionLoading] = useState(false);

  const event = getEventById(id);

  const handleShare = useCallback(async () => {
    if (!event) return;
    const url = window.location.href;
    if (typeof navigator !== 'undefined' && navigator.share) {
      try {
        await navigator.share({ title: event.title, text: `Check out ${event.title} at ${event.venue.name}`, url });
        return;
      } catch (err) {
        if ((err as Error).name === 'AbortError') return;
      }
    }
    try {
      await navigator.clipboard.writeText(url);
      setToastMessage('Link copied to clipboard!');
    } catch {
      setToastMessage('Could not copy link');
    }
    setShowToast(true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [event?.title, event?.venue?.name]);

  if (!event) {
    if (isLoading) {
      return (
        <div className="flex min-h-[60vh] items-center justify-center">
          <Loader2 size={32} className="animate-spin text-navy" />
        </div>
      );
    }
    return (
      <div className="page-container flex min-h-[60vh] flex-col items-start justify-center gap-4 py-24">
        <p className="eyebrow">— Not found</p>
        <h1 className="display-section">This listing has wrapped up</h1>
        <p className="text-ink-muted">The event or special you&rsquo;re looking for doesn&rsquo;t exist anymore.</p>
        <Link href="/events" className="btn-sun mt-2">
          Browse what&rsquo;s on →
        </Link>
      </div>
    );
  }

  const isFoodDeal = event.categories.includes('food-deal');
  const entityLabel = isFoodDeal ? 'Special' : 'Event';
  const allDay = isAllDayEvent(event);
  const timeLabel = allDay
    ? 'All day'
    : `${formatTime(event.startTime)}${event.endTime ? ` – ${formatTime(event.endTime)}` : ''}`;
  const dateLong = format(parseISO(event.date), 'EEEE, MMMM d, yyyy');
  const dateShort = format(parseISO(event.date), 'EEEE, MMMM d');
  const isToday = event.date === format(new Date(), 'yyyy-MM-dd');
  const displayPrice = formatPrice(event.price);
  const isFree = !displayPrice || isFreePrice(displayPrice);
  const isSoldOut = event.categories.includes('sold-out');
  const needsRsvp = event.categories.includes('rsvp');
  const isPayWhatYouCan = displayPrice.toLowerCase() === 'pay what you can';
  const isHappyHour = event.categories.includes('happy-hour');
  const hasFood = event.categories.includes('food');
  const hasDrink = event.categories.includes('drink');
  const specialType = isHappyHour ? 'Happy Hour' : hasFood && hasDrink ? 'Food & drinks' : hasDrink ? 'Drinks' : 'Food';
  const conditions = specialConditionCategories.filter((c) => event.categories.includes(c));
  const recurrence = recurrenceOf(event);
  const liked = isLiked(event.id);
  const likeCount = getLikeCount(event.id);
  const displayImage = event.imageUrl;
  const mapsUrl = `https://maps.google.com/?q=${encodeURIComponent(`${event.venue.name}, ${event.venue.address}`)}`;
  const tags = event.categories.filter(
    (c) => c !== 'food-deal' && !isListingDetailCategory(c) && !(isFoodDeal && (c === 'food' || c === 'drink'))
  );
  const todayStr = format(new Date(), 'yyyy-MM-dd');

  const venueUpcoming = getEventsByVenue(event.venue.id).filter((e) => e.id !== event.id && e.date >= todayStr);
  const moreAtVenue = (() => {
    const seen = new Set<string>([event.seriesId || event.id]);
    return venueUpcoming
      .filter((e) => e.categories.includes('food-deal') === isFoodDeal)
      .sort((a, b) => a.date.localeCompare(b.date) || a.startTime.localeCompare(b.startTime))
      .filter((e) => {
        const key = e.seriesId || e.id;
        if (seen.has(key)) return false;
        seen.add(key);
        return true;
      })
      .slice(0, isFoodDeal ? 3 : 2);
  })();
  const nearbyOnNow = isFoodDeal
    ? getTodaysEvents()
        .filter((e) => e.categories.includes('food-deal') && e.venue.id !== event.venue.id && isOnNow(e))
        .slice(0, 3)
    : [];

  const handleLike = () => {
    if (!user) {
      router.push('/login');
      return;
    }
    toggleLike(event.id);
  };

  const canManageEvent = user && (isAdmin || event.submittedById === user.id);
  const isCancelled = event.status === 'cancelled';

  const handleCancelEvent = async () => {
    if (!confirm(`Are you sure you want to cancel this ${entityLabel.toLowerCase()}?`)) return;
    setEventActionLoading(true);
    try {
      const res = await fetch(`/api/events/${event.id}/cancel`, { method: 'POST' });
      if (res.ok) {
        setToastMessage(`${entityLabel} cancelled`);
        setShowToast(true);
        window.location.reload();
      } else {
        const data = await res.json();
        setToastMessage(data.error || `Failed to cancel ${entityLabel.toLowerCase()}`);
        setShowToast(true);
      }
    } catch {
      setToastMessage('Network error');
      setShowToast(true);
    } finally {
      setEventActionLoading(false);
    }
  };

  const handleDeleteEvent = async () => {
    let scope: 'this' | 'future' = 'this';
    if (event.isRecurring && event.seriesId) {
      const choice = window.confirm(
        `This is a recurring ${entityLabel.toLowerCase()}.\n\nOK = delete this occurrence only\nCancel = abort\n\n(To delete this and all future occurrences, click OK then confirm the next prompt.)`
      );
      if (!choice) return;
      const allFuture = window.confirm(
        'Delete THIS AND ALL FUTURE occurrences?\n\nOK = this and all future\nCancel = just this occurrence'
      );
      scope = allFuture ? 'future' : 'this';
    } else if (!confirm(`Are you sure you want to permanently delete this ${entityLabel.toLowerCase()}? This cannot be undone.`)) {
      return;
    }
    setEventActionLoading(true);
    try {
      const res = await fetch(`/api/events/${event.id}?scope=${scope}`, { method: 'DELETE' });
      if (res.ok) {
        router.push('/my-events');
      } else {
        const data = await res.json();
        setToastMessage(data.error || `Failed to delete ${entityLabel.toLowerCase()}`);
        setShowToast(true);
      }
    } catch {
      setToastMessage('Network error');
      setShowToast(true);
    } finally {
      setEventActionLoading(false);
    }
  };

  return (
    <div className="page-container pb-24 pt-6">
      <Link
        href={isFoodDeal ? '/events?tab=deals' : '/events'}
        className="inline-flex items-center gap-2 text-[13px] font-medium text-navy hover:underline"
      >
        <ArrowLeft size={16} />
        {isFoodDeal ? 'Back to Food & Drink' : 'Back to Browse'}
      </Link>

      {/* Tags */}
      <div className="mt-5 flex flex-wrap gap-1.5">
        {isFoodDeal && <Tag className="bg-coral text-navy">{specialType}</Tag>}
        {tags.slice(0, 3).map((c) => (
          <CategoryTag key={c} category={c} />
        ))}
        {!isFoodDeal && isFree && <Tag className="bg-sky text-navy">Free</Tag>}
        {!isFoodDeal && isPayWhatYouCan && <Tag className="bg-sky text-navy">Pay what you can</Tag>}
        {!isFoodDeal && needsRsvp && <CategoryTag category="rsvp" />}
        {!isFoodDeal && isSoldOut && <CategoryTag category="sold-out" />}
        {isFoodDeal && conditions.map((c) => <CategoryTag key={c} category={c} />)}
        {isFoodDeal && isOnNow(event) && (
          <Tag className="bg-success-tint text-success gap-1">
            <span className="h-1.5 w-1.5 rounded-full bg-success" /> On now
          </Tag>
        )}
        {isCancelled && <Tag className="bg-danger text-white">Cancelled</Tag>}
      </div>

      <h1 className="display-section mt-4 max-w-[900px]">{event.title}</h1>
      {isFoodDeal && (
        <p className="mt-4 text-[18px] text-ink-muted">
          at {event.venue.name}
          {event.venue.neighborhood ? ` · ${isDowntown(event.venue) ? 'Downtown Kingston' : event.venue.neighborhood}` : ''}
        </p>
      )}

      {/* Info pills */}
      <div className="mt-6 flex flex-wrap gap-2">
        {isFoodDeal && recurrence ? (
          <span className="info-pill">
            <Calendar size={14} className="text-link" />
            {recurrence}
          </span>
        ) : (
          <span className="info-pill">
            <Calendar size={14} className="text-link" />
            {dateShort}
          </span>
        )}
        <span className="info-pill">
          <Clock size={14} className="text-link" />
          {isFoodDeal && isToday ? `Today · ${timeLabel}` : timeLabel}
        </span>
        <Link href={`/venues/${event.venue.id}`} className="info-pill hover:bg-[#cfe2f3]">
          <MapPin size={14} className="text-link" />
          {event.venue.name}
        </Link>
        {!isFoodDeal && (
          <span className="info-pill">
            <Ticket size={14} className="text-link" />
            {isSoldOut ? 'Sold out' : !displayPrice || displayPrice.toLowerCase() === 'free' ? 'Free entry' : displayPrice}
          </span>
        )}
        {!isFoodDeal && recurrence && (
          <span className="info-pill">
            <Repeat size={14} className="text-link" />
            {recurrence}
          </span>
        )}
      </div>

      <div className="mt-8 grid grid-cols-1 gap-10 lg:grid-cols-[1fr_340px] lg:gap-16">
        {/* Main column */}
        <div className="min-w-0">
          <p className="eyebrow-sm">About this {isFoodDeal ? 'special' : 'event'}</p>
          <p className="mt-3 whitespace-pre-line text-[17px] leading-[1.6] text-navy">{event.description || event.summary}</p>
          {event.lastEditedAt && (
            <p className="mt-3 text-[13px] text-ink-muted">Edited {format(new Date(event.lastEditedAt), 'MMM d, yyyy')}</p>
          )}

          {displayImage && (
            <div className="relative mt-8 aspect-[16/9] overflow-hidden rounded-[22px] bg-sky-soft">
              <SmartImage src={displayImage} alt={event.title} sizes="(max-width: 1024px) 100vw, 800px" />
            </div>
          )}

          {/* Venue */}
          <p className="eyebrow-sm mt-10">Venue</p>
          <div className="card mt-3 flex flex-col gap-4 p-5 sm:flex-row sm:items-center">
            <div className="flex h-[68px] w-[68px] shrink-0 items-center justify-center rounded-[14px] bg-sky text-link">
              <MapPin size={22} />
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-[20px] font-bold text-navy">{event.venue.name}</p>
              <p className="mt-0.5 text-[14px] text-ink-muted">{event.venue.address}</p>
              {event.venue.neighborhood && (
                <p className="mt-1 text-[12px] font-medium text-link">{event.venue.neighborhood}</p>
              )}
            </div>
            <Link href={`/venues/${event.venue.id}`} className="btn-outline self-start sm:self-center">
              View venue →
            </Link>
          </div>

          {/* More at venue */}
          {moreAtVenue.length > 0 && (
            <>
              <p className="eyebrow-sm mt-10">
                More {isFoodDeal ? 'specials' : ''} at {event.venue.name}
              </p>
              {isFoodDeal ? (
                <div className="mt-3 border-t border-line">
                  {moreAtVenue.map((e) => (
                    <SpecialMiniRow key={e.id} event={e} saved={isLiked(e.id)} onSave={() => (user ? toggleLike(e.id) : router.push('/login'))} />
                  ))}
                </div>
              ) : (
                <div className="mt-3 grid grid-cols-1 gap-4 sm:grid-cols-2">
                  {moreAtVenue.map((e) => (
                    <TimeCard key={e.id} event={e} />
                  ))}
                </div>
              )}
            </>
          )}

          {nearbyOnNow.length > 0 && (
            <>
              <p className="eyebrow-sm mt-10">Other specials on now</p>
              <div className="mt-3 border-t border-line">
                {nearbyOnNow.map((e) => (
                  <SpecialMiniRow key={e.id} event={e} saved={isLiked(e.id)} onSave={() => (user ? toggleLike(e.id) : router.push('/login'))} />
                ))}
              </div>
              <Link href="/events?tab=deals" className="link-arrow mt-4">
                See all specials on now →
              </Link>
            </>
          )}
        </div>

        {/* Sidebar */}
        <aside className="flex flex-col gap-3 lg:sticky lg:top-24 self-start w-full">
          <div className="rounded-[22px] bg-navy p-6 text-white">
            <p className="eyebrow-bold text-sun">{isFoodDeal ? 'The deal' : 'Entry'}</p>
            <p className="mt-2 text-[32px] font-bold leading-tight tracking-[-0.02em]">
              {isFoodDeal ? displayPrice || event.title : isFree ? 'Free' : displayPrice}
            </p>
            <p className="mt-2 text-[13px] text-on-dark-muted">
              {isFoodDeal
                ? `${allDay ? 'All day' : `Ends ${isToday ? 'today ' : ''}at ${formatTime(event.endTime || event.startTime)}`}.`
                : isSoldOut
                ? 'This one’s sold out.'
                : needsRsvp
                ? 'RSVP or register before you go.'
                : isFree
                ? 'No tickets needed — just show up.'
                : event.ticketUrl
                ? 'Grab tickets online before they sell out.'
                : 'Pay at the door.'}
            </p>
            <div className="mt-5 flex gap-2.5">
              {isFoodDeal ? (
                <a href={mapsUrl} target="_blank" rel="noopener noreferrer" className="btn-sun h-[46px] flex-1">
                  Get directions
                </a>
              ) : event.ticketUrl || event.venue.website ? (
                <a
                  href={event.ticketUrl || event.venue.website}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="btn-sun h-[46px] flex-1"
                >
                  {event.ticketUrl && needsRsvp ? 'RSVP' : event.ticketUrl && !isFree ? 'Get tickets' : 'Visit the website'}
                </a>
              ) : (
                <a href={mapsUrl} target="_blank" rel="noopener noreferrer" className="btn-sun h-[46px] flex-1">
                  Get directions
                </a>
              )}
              <SaveButton variant="circle-dark" saved={liked} onClick={handleLike} />
            </div>
          </div>

          <div className="card px-5 py-1">
            <DetailRow icon={<Calendar size={16} />} label={isFoodDeal ? 'When' : 'Date'}>
              {isFoodDeal ? `${isToday ? 'Today' : dateShort} · ${timeLabel}` : dateLong}
            </DetailRow>
            {isFoodDeal
              ? recurrence && (
                  <DetailRow icon={<Repeat size={16} />} label="Repeats">
                    {recurrence}
                  </DetailRow>
                )
              : (
                  <DetailRow icon={<Clock size={16} />} label="Time">
                    {timeLabel}
                  </DetailRow>
                )}
            <DetailRow icon={<MapPin size={16} />} label="Location">
              {event.venue.name}
              {event.venue.address ? `, ${event.venue.address.split(',')[0]}` : ''}
            </DetailRow>
            <DetailRow icon={<TagIcon size={16} />} label={isFoodDeal ? 'Deal' : 'Price'}>
              {isFoodDeal ? displayPrice || event.title : isFree ? 'Free' : displayPrice}
            </DetailRow>
            <DetailRow icon={<Heart size={16} />} label="Interest">
              {likeCount} {likeCount === 1 ? 'person' : 'people'} saved this
            </DetailRow>
          </div>

          <button onClick={handleShare} className="btn-ghost w-full">
            <Share2 size={15} /> Share {entityLabel.toLowerCase()}
          </button>

          {canManageEvent && (
            <div className="card p-5">
              <p className="eyebrow-sm">Manage {entityLabel.toLowerCase()}</p>
              <div className="mt-3 flex flex-col gap-2">
                {!isCancelled && event.status !== 'rejected' && (
                  <Link href={`/events/${event.id}/edit`} className="btn-outline w-full">
                    <Edit size={15} /> Edit {entityLabel.toLowerCase()}
                  </Link>
                )}
                {!isCancelled && event.status !== 'rejected' && (
                  <button onClick={handleCancelEvent} disabled={eventActionLoading} className="btn-ghost w-full">
                    {eventActionLoading ? <Loader2 size={15} className="animate-spin" /> : <Ban size={15} />} Cancel{' '}
                    {entityLabel.toLowerCase()}
                  </button>
                )}
                <button
                  onClick={handleDeleteEvent}
                  disabled={eventActionLoading}
                  className="btn w-full border-[1.5px] border-danger text-danger font-medium hover:bg-danger-tint"
                >
                  {eventActionLoading ? <Loader2 size={15} className="animate-spin" /> : <Trash2 size={15} />} Delete{' '}
                  {entityLabel.toLowerCase()}
                </button>
              </div>
            </div>
          )}
        </aside>
      </div>

      <Toast isOpen={showToast} message={toastMessage} type="success" onClose={() => setShowToast(false)} />
    </div>
  );
}
