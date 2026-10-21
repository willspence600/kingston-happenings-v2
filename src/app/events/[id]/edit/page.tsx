'use client';

import { use, useState, useRef, useEffect } from 'react';
import Link from 'next/link';
import {
  Calendar,
  Clock,
  MapPin,
  FileText,
  Tag,
  DollarSign,
  Upload,
  Link as LinkIcon,
  Save,
  CheckCircle,
  AlertCircle,
  Loader2,
  X,
  ArrowLeft,
  Repeat,
} from 'lucide-react';
import { categoryLabels, EventCategory } from '@/types/event';
import { eventCategoryOptions } from '@/constants/categories';
import { useOrganizerVerification } from '@/hooks/useOrganizerVerification';
import type { Event } from '@/types/event';
import { useAuth } from '@/contexts/AuthContext';
import { useEvents } from '@/contexts/EventsContext';
import { DatePicker, VenueSelector } from '@/components';
import { compressImage } from '@/utils/compression';
import { getRecurrenceLabel } from '@/utils/recurrenceLabel';
import { splitDescription } from '@/components/admin/ListingEditor';

const normalizeUrl = (url: string): string => {
  if (!url) return '';
  url = url.trim();
  if (!url) return '';
  if (url.startsWith('http://') || url.startsWith('https://')) return url;
  return `https://${url}`;
};

type PriceType = 'na' | 'free' | 'amount';
type EditScope = 'this' | 'future';

const MAX_SUMMARY_LENGTH = 150;
const MAX_DESCRIPTION_LENGTH = 600;

export default function EditEventPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const { user, isAdmin, isLoading: authLoading } = useAuth();
  const { isVerifiedOrganizer } = useOrganizerVerification();
  const { getEventById, venues, refreshEvents } = useEvents();
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const fieldRefs = useRef<Record<string, HTMLElement | null>>({});

  const registerFieldRef = (key: string) => (el: HTMLElement | null) => {
    fieldRefs.current[key] = el;
  };

  // Scroll the offending field/section into view and focus the first control inside it,
  // so it's immediately obvious why the form didn't submit.
  const scrollToField = (key: string) => {
    requestAnimationFrame(() => {
      const el = fieldRefs.current[key];
      if (!el) return;
      el.scrollIntoView({ behavior: 'smooth', block: 'center' });
      const focusable = el.querySelector<HTMLElement>(
        'input:not([type="hidden"]), select, textarea, button'
      );
      (focusable || el).focus?.({ preventScroll: true });
    });
  };

  // Pending/rejected submissions aren't in the public events list, so fall back to the API.
  const contextEvent = getEventById(id);
  const [fetchedEvent, setFetchedEvent] = useState<Event | null>(null);
  const [fetchingEvent, setFetchingEvent] = useState(false);
  useEffect(() => {
    if (contextEvent || fetchedEvent) return;
    let cancelled = false;
    setFetchingEvent(true);
    fetch(`/api/events/${id}`)
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (!cancelled && data?.event) setFetchedEvent(data.event);
      })
      .catch(() => {})
      .finally(() => {
        if (!cancelled) setFetchingEvent(false);
      });
    return () => {
      cancelled = true;
    };
  }, [id, contextEvent, fetchedEvent]);
  const event = contextEvent ?? fetchedEvent ?? undefined;
  const isVerified = isVerifiedOrganizer;
  const isFoodDeal = event?.categories.includes('food-deal') ?? false;
  const entityLabel = isFoodDeal ? 'Food & Drink Special' : 'Event';
  const isRecurring = Boolean(event?.isRecurring && event?.seriesId);

  const [title, setTitle] = useState('');
  const [summary, setSummary] = useState('');
  const [description, setDescription] = useState('');
  const [date, setDate] = useState('');
  const [startTime, setStartTime] = useState('');
  const [endTime, setEndTime] = useState('');
  const [venueId, setVenueId] = useState('');
  // Only Major Venues (listed on Coming up) can show a photo
  const canAddPhoto = !!venues.find((v) => v.id === venueId)?.isMajor;
  const [newVenueName, setNewVenueName] = useState('');
  const [newVenueAddress, setNewVenueAddress] = useState('');
  const [categories, setCategories] = useState<EventCategory[]>([]);
  const [priceType, setPriceType] = useState<PriceType>('na');
  const [priceAmount, setPriceAmount] = useState('');
  const [specialPrice, setSpecialPrice] = useState('');
  const [ticketUrl, setTicketUrl] = useState('');
  const [imagePreview, setImagePreview] = useState('');
  const [isAllDay, setIsAllDay] = useState(false);
  const [editScope, setEditScope] = useState<EditScope>('this');
  const [extendEndDate, setExtendEndDate] = useState('');
  const [isExtending, setIsExtending] = useState(false);
  const [extendMessage, setExtendMessage] = useState('');

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSaved, setIsSaved] = useState(false);
  const [error, setError] = useState('');
  const [initialized, setInitialized] = useState(false);

  useEffect(() => {
    if (event && !initialized) {
      setTitle(event.title);
      const split = splitDescription(event);
      setSummary(isFoodDeal ? event.summary || '' : split.summary);
      setDescription(isFoodDeal ? event.description : split.description);
      setDate(event.date);
      setStartTime(event.startTime);
      setEndTime(event.endTime || '');
      setVenueId(event.venue.id);
      setCategories((event.categories || []) as EventCategory[]);
      setImagePreview(event.imageUrl || '');
      setTicketUrl(event.ticketUrl || '');
      setIsAllDay(event.isAllDay ?? (event.startTime === '00:00' && !event.endTime));
      setExtendEndDate(event.recurrenceEndDate || '');

      if (isFoodDeal) {
        setSpecialPrice(event.price || '');
      } else if (event.price) {
        if (event.price === 'Free') {
          setPriceType('free');
        } else {
          setPriceType('amount');
          // Strip leading $ if present for the input (display layer adds it back)
          setPriceAmount(event.price.replace(/^\$/, ''));
        }
      }

      setInitialized(true);
    }
  }, [event, initialized, isFoodDeal]);

  const handleCategoryToggle = (category: EventCategory) => {
    setCategories(prev =>
      prev.includes(category) ? prev.filter(c => c !== category) : [...prev, category]
    );
  };

  const handleImageSelect = async (file: File) => {
    const compressed = await compressImage(file);
    setImagePreview(compressed);
  };

  const handleExtendSeries = async () => {
    if (!extendEndDate) {
      setError('Please select a new end date.');
      return;
    }
    setIsExtending(true);
    setError('');
    setExtendMessage('');
    try {
      const res = await fetch(`/api/events/${id}/series`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ newEndDate: extendEndDate }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to extend series');
      setExtendMessage(
        data.created > 0
          ? `Extended series — created ${data.created} new occurrence(s).`
          : data.deleted > 0
            ? `Shortened series — removed ${data.deleted} occurrence(s).`
            : 'Series end date updated.'
      );
      await refreshEvents();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to extend series.');
    } finally {
      setIsExtending(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (categories.length === 0) {
      setError('Please select at least one category.');
      scrollToField('categories');
      return;
    }
    if (!venueId) {
      setError('Please select a venue.');
      scrollToField('venue');
      return;
    }

    setIsSubmitting(true);

    try {
      let priceString: string | null = null;
      if (isFoodDeal) {
        priceString = specialPrice.trim() || null;
      } else if (priceType === 'free') {
        priceString = 'Free';
      } else if (priceType === 'amount' && priceAmount) {
        // Save raw value without forced $ — formatPrice handles display
        priceString = priceAmount.trim();
      }

      const body: Record<string, unknown> = {
        title,
        ...(isFoodDeal ? {} : { summary: summary.trim() || null }),
        description,
        date,
        startTime: isAllDay ? '00:00' : startTime,
        endTime: isAllDay ? null : (endTime || null),
        isAllDay,
        venueId,
        ...(venueId === 'new' ? { newVenueName, newVenueAddress } : {}),
        categories,
        price: priceString,
        ticketUrl: normalizeUrl(ticketUrl) || null,
        ...(isFoodDeal ? {} : { imageUrl: imagePreview || null }),
      };

      const res = await fetch(`/api/events/${id}?scope=${editScope}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || `Failed to update ${entityLabel.toLowerCase()}`);
      }

      setIsSaved(true);
      window.scrollTo({ top: 0, behavior: 'smooth' });
      await refreshEvents();
    } catch (err) {
      setError(err instanceof Error ? err.message : `Failed to update ${entityLabel.toLowerCase()}.`);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } finally {
      setIsSubmitting(false);
    }
  };

  if (authLoading || (!event && fetchingEvent)) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <Loader2 size={32} className="animate-spin text-primary" />
      </div>
    );
  }

  if (!event) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <div className="text-center">
          <h1 className="display-md mb-4">{entityLabel} Not Found</h1>
          <p className="text-muted-foreground mb-6">The item you&apos;re looking for doesn&apos;t exist.</p>
          <Link href="/events" className="btn-sun">
            <ArrowLeft size={18} /> Back to Browse
          </Link>
        </div>
      </div>
    );
  }

  const canEdit = user && (isAdmin || event.submittedById === user.id);

  if (!canEdit) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <div className="text-center">
          <h1 className="display-md mb-4">Access Denied</h1>
          <p className="text-muted-foreground mb-6">You don&apos;t have permission to edit this {entityLabel.toLowerCase()}.</p>
          <Link href={`/events/${id}`} className="btn-sun">
            <ArrowLeft size={18} /> Back
          </Link>
        </div>
      </div>
    );
  }

  if (isSaved) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center py-16">
        <div className="text-center max-w-md mx-auto px-4">
          <div className="w-20 h-20 rounded-full bg-sun flex items-center justify-center mx-auto mb-6">
            <CheckCircle size={40} className="text-navy" />
          </div>
          <h1 className="display-md mb-4">{entityLabel} Updated!</h1>
          <p className="text-muted-foreground mb-8">
            {isVerified
              ? editScope === 'future'
                ? 'Your changes are live for this and all future occurrences.'
                : 'Your changes are live.'
              : 'Thanks! Your changes have been sent for review. We review edits within 24 hours, and your listing will be republished once it’s approved.'}
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link href="/my-events?tab=submitted" className="btn-sun">
              Back to my submissions
            </Link>
            {isVerified && (
              <Link href={`/events/${id}`} className="btn-outline">
                View {entityLabel}
              </Link>
            )}
            <button
              onClick={() => setIsSaved(false)}
              className="px-6 py-3 border border-border rounded-xl font-medium hover:bg-muted transition-colors"
            >
              Continue Editing
            </button>
          </div>
        </div>
      </div>
    );
  }

  const recurrenceLabel = isRecurring
    ? getRecurrenceLabel({
        recurrencePattern: event.recurrencePattern,
        recurrenceDays: event.recurrenceDays,
        recurrenceDay: event.recurrenceDay,
      })
    : '';

  return (
    <div className="min-h-screen">
      <section className="page-container pt-10">
        <div>
          <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <p className="eyebrow mb-3.5">— Edit</p>
              <h1 className="display-section mb-4">Edit {entityLabel.toLowerCase()}</h1>
              <p className="text-ink-muted text-[16px] max-w-2xl">
                Update the details for &ldquo;{event.title}&rdquo;
              </p>
              {isRecurring && (
                <p className="mt-2 flex items-center gap-2 text-link text-sm">
                  <Repeat size={14} />
                  {recurrenceLabel}
                  {event.detachedFromSeries && (
                    <span className="ml-2 px-2 py-0.5 rounded-full bg-[#fff1d6] text-[#8a5a00] text-xs">
                      Modified (detached from series)
                    </span>
                  )}
                </p>
              )}
            </div>
            <Link
              href={`/events/${id}`}
              className="btn-outline self-start sm:self-auto"
            >
              &larr; Back
            </Link>
          </div>
        </div>
      </section>

      <div className="max-w-3xl mx-auto px-4 sm:px-8 py-10">
        {error && (
          <div className="mb-6 p-4 bg-danger-tint rounded-[14px] flex items-center gap-3 text-danger">
            <AlertCircle size={20} />
            <p className="text-sm">{error}</p>
          </div>
        )}
        {extendMessage && (
          <div className="mb-6 p-4 bg-green-50 border border-green-200 rounded-xl flex items-center gap-3 text-green-700">
            <CheckCircle size={20} />
            <p className="text-sm">{extendMessage}</p>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-8">
          {/* Edit scope for recurring */}
          {isRecurring && (
            <section className="card p-5 sm:p-7">
              <h3 className="font-display text-xl text-foreground mb-4 flex items-center gap-2">
                <Repeat size={20} className="text-primary" />
                Apply Changes To
              </h3>
              <div className="space-y-3">
                <label className="flex items-start gap-3 cursor-pointer p-3 rounded-[14px] border border-line hover:bg-sky-soft">
                  <input
                    type="radio"
                    name="editScope"
                    value="this"
                    checked={editScope === 'this'}
                    onChange={() => setEditScope('this')}
                    className="mt-1 w-4 h-4 text-primary focus:ring-primary"
                  />
                  <div>
                    <span className="text-sm font-medium text-foreground">Just this occurrence</span>
                    <p className="text-xs text-muted-foreground">Only this date will be updated. It will be marked as modified.</p>
                  </div>
                </label>
                <label className="flex items-start gap-3 cursor-pointer p-3 rounded-[14px] border border-line hover:bg-sky-soft">
                  <input
                    type="radio"
                    name="editScope"
                    value="future"
                    checked={editScope === 'future'}
                    onChange={() => setEditScope('future')}
                    className="mt-1 w-4 h-4 text-primary focus:ring-primary"
                  />
                  <div>
                    <span className="text-sm font-medium text-foreground">This and all future occurrences</span>
                    <p className="text-xs text-muted-foreground">Updates this date and all later ones (skips previously modified occurrences).</p>
                  </div>
                </label>
              </div>

              <div className="mt-6 pt-6 border-t border-border">
                <h4 className="text-sm font-medium text-foreground mb-2">Extend recurrence end date</h4>
                <p className="text-xs text-muted-foreground mb-3">
                  Push out (or shorten) when this series ends. New occurrences will be generated automatically.
                </p>
                <div className="flex flex-col sm:flex-row gap-3 items-end">
                  <div className="flex-1">
                    <DatePicker
                      id="extendEndDate"
                      value={extendEndDate}
                      onChange={setExtendEndDate}
                      placeholder="New end date"
                    />
                  </div>
                  <button
                    type="button"
                    onClick={handleExtendSeries}
                    disabled={isExtending || !extendEndDate}
                    className="px-4 py-3 bg-secondary text-secondary-foreground rounded-xl text-sm font-medium hover:opacity-90 disabled:opacity-50"
                  >
                    {isExtending ? 'Updating…' : 'Update End Date'}
                  </button>
                </div>
              </div>
            </section>
          )}

          {/* Details */}
          <section className="card p-5 sm:p-7">
            <h3 className="mb-5 flex items-center gap-2 text-[20px] font-bold text-navy">
              <FileText size={20} className="text-primary" />
              {entityLabel} Details
            </h3>
            <div className="space-y-4">
              <div>
                <label htmlFor="title" className="field-label">
                  {isFoodDeal ? 'Special Title' : 'Event Title'} *
                </label>
                <input
                  type="text"
                  id="title"
                  required
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  className="field"
                />
              </div>
              {!isFoodDeal && (
                <div>
                  <label htmlFor="summary" className="field-label">Short description *</label>
                  <textarea
                    id="summary"
                    required
                    rows={2}
                    maxLength={MAX_SUMMARY_LENGTH}
                    value={summary}
                    onChange={(e) => setSummary(e.target.value)}
                    className="field"
                  />
                  <div className="flex justify-between gap-4 mt-1">
                    <span className="field-hint">Shows on event cards and previews.</span>
                    <span className={`text-xs ${summary.length > MAX_SUMMARY_LENGTH * 0.9 ? 'text-amber-500' : 'text-muted-foreground'}`}>
                      {summary.length}/{MAX_SUMMARY_LENGTH}
                    </span>
                  </div>
                </div>
              )}
              <div>
                <label htmlFor="description" className="field-label">Description *</label>
                <textarea
                  id="description"
                  required
                  rows={6}
                  maxLength={MAX_DESCRIPTION_LENGTH}
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  className="field"
                />
                <div className="flex justify-end mt-1">
                  <span className={`text-xs ${description.length > MAX_DESCRIPTION_LENGTH * 0.9 ? 'text-amber-500' : 'text-muted-foreground'}`}>
                    {description.length}/{MAX_DESCRIPTION_LENGTH}
                  </span>
                </div>
              </div>
            </div>
          </section>

          {/* Date & Time */}
          <section className="card p-5 sm:p-7">
            <h3 className="mb-5 flex items-center gap-2 text-[20px] font-bold text-navy">
              <Calendar size={20} className="text-primary" />
              Date & Time
            </h3>
            <div className="mb-4">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={isAllDay}
                  onChange={(e) => {
                    setIsAllDay(e.target.checked);
                    if (e.target.checked) { setStartTime('00:00'); setEndTime(''); }
                  }}
                  className="w-4 h-4 text-primary rounded focus:ring-primary"
                />
                <span className="text-sm font-medium text-foreground">
                  This is an all-day {isFoodDeal ? 'special' : 'event'}
                </span>
              </label>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div>
                <label htmlFor="date" className="field-label">Date *</label>
                <DatePicker id="date" value={date} onChange={setDate} required placeholder="Select date" />
              </div>
              {!isAllDay && (
                <>
                  <div>
                    <label htmlFor="startTime" className="field-label">Start Time *</label>
                    <div className="relative">
                      <Clock size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-link pointer-events-none z-10" />
                      <input
                        type="time"
                        id="startTime"
                        required
                        value={startTime}
                        onChange={(e) => setStartTime(e.target.value)}
                        className="field pl-10"
                      />
                    </div>
                  </div>
                  <div>
                    <label htmlFor="endTime" className="field-label">End Time</label>
                    <div className="relative">
                      <Clock size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-link pointer-events-none z-10" />
                      <input
                        type="time"
                        id="endTime"
                        value={endTime}
                        onChange={(e) => setEndTime(e.target.value)}
                        className="field pl-10"
                      />
                    </div>
                  </div>
                </>
              )}
            </div>
          </section>

          {/* Location */}
          <section ref={registerFieldRef('venue')} className="card p-5 sm:p-7">
            <h3 className="mb-5 flex items-center gap-2 text-[20px] font-bold text-navy">
              <MapPin size={20} className="text-primary" />
              Location
            </h3>
            <VenueSelector
              venues={venues}
              selectedVenueId={venueId}
              newVenueName={newVenueName}
              newVenueAddress={newVenueAddress}
              onVenueSelect={setVenueId}
              onNewVenueNameChange={setNewVenueName}
              onNewVenueAddressChange={setNewVenueAddress}
              required
              id="venue"
            />
          </section>

          {/* Categories — events only show browse categories; specials keep food/drink */}
          {!isFoodDeal && (
            <section ref={registerFieldRef('categories')} className="card p-5 sm:p-7">
              <h3 className="font-display text-xl text-foreground mb-2 flex items-center gap-2">
                <Tag size={20} className="text-primary" />
                Categories *
              </h3>
              <p className="text-sm text-muted-foreground mb-4">Select all that apply</p>
              <div className="flex flex-wrap gap-2">
                {eventCategoryOptions.map((category) => {
                  const isSelected = categories.includes(category);
                  return (
                    <button
                      key={category}
                      type="button"
                      onClick={() => handleCategoryToggle(category)}
                      className={`chip ${
                        isSelected ? '!bg-navy !border-navy !text-white font-bold' : ''
                      }`}
                    >
                      {categoryLabels[category]}
                    </button>
                  );
                })}
              </div>
            </section>
          )}

          {/* Price / Additional Info */}
          <section className="card p-5 sm:p-7">
            <h3 className="mb-5 flex items-center gap-2 text-[20px] font-bold text-navy">
              <DollarSign size={20} className="text-primary" />
              {isFoodDeal ? 'Price' : 'Additional Information'}
            </h3>
            <div className="space-y-4">
              {isFoodDeal ? (
                <div>
                  <label htmlFor="specialPrice" className="field-label">
                    Special Price
                  </label>
                  <input
                    type="text"
                    id="specialPrice"
                    value={specialPrice}
                    onChange={(e) => setSpecialPrice(e.target.value)}
                    placeholder="e.g., 5 Pints, Half-Price Wings, Free"
                    className="field"
                  />
                  <p className="text-xs text-muted-foreground mt-1">
                    Enter a number (e.g. 15) or free text (e.g. Free, Varies). Numbers get a $ when displayed.
                  </p>
                </div>
              ) : (
                <>
                  <div>
                    <label className="block text-sm font-medium text-foreground mb-3">Price / Admission</label>
                    <div className="flex flex-wrap gap-3 mb-3">
                      {(['na', 'free', 'amount'] as const).map((type) => (
                        <label key={type} className="flex items-center gap-2 cursor-pointer">
                          <input
                            type="radio"
                            name="priceType"
                            value={type}
                            checked={priceType === type}
                            onChange={() => { setPriceType(type); if (type !== 'amount') setPriceAmount(''); }}
                            className="w-4 h-4 text-primary focus:ring-primary"
                          />
                          <span className="text-sm text-foreground">{type === 'na' ? 'N/A' : type === 'free' ? 'Free' : 'Paid'}</span>
                        </label>
                      ))}
                    </div>
                    {priceType === 'amount' && (
                      <input
                        type="text"
                        value={priceAmount}
                        onChange={(e) => setPriceAmount(e.target.value)}
                        placeholder="e.g., 15, 20-40"
                        className="field"
                      />
                    )}
                  </div>

                  <div>
                    <label htmlFor="ticketUrl" className="field-label">Ticket / Registration Link</label>
                    <div className="relative">
                      <LinkIcon size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground" />
                      <input
                        type="text"
                        id="ticketUrl"
                        value={ticketUrl}
                        onChange={(e) => setTicketUrl(e.target.value)}
                        placeholder="e.g., ticketmaster.com/event/abc"
                        className="field pl-10"
                      />
                    </div>
                  </div>

                  {canAddPhoto && (
                  <div>
                    <label className="field-label">Event Image</label>
                    {imagePreview ? (
                      <div className="relative rounded-xl overflow-hidden">
                        <img src={imagePreview} alt="Event preview" className="w-full h-48 object-cover" />
                        <button
                          type="button"
                          onClick={() => {
                            setImagePreview('');
                            if (fileInputRef.current) fileInputRef.current.value = '';
                          }}
                          className="absolute top-2 right-2 p-2 bg-red-600 text-white rounded-full hover:bg-red-700 transition-colors"
                        >
                          <X size={16} />
                        </button>
                      </div>
                    ) : (
                      <div
                        onDragOver={(e) => e.preventDefault()}
                        onDrop={(e) => {
                          e.preventDefault();
                          const file = e.dataTransfer.files[0];
                          if (file?.type.startsWith('image/')) handleImageSelect(file);
                        }}
                        onClick={() => fileInputRef.current?.click()}
                        className="border-2 border-dashed border-border rounded-xl p-8 text-center cursor-pointer hover:border-primary/50 hover:bg-muted/50 transition-colors"
                      >
                        <Upload size={32} className="mx-auto text-muted-foreground mb-3" />
                        <p className="text-sm text-foreground font-medium mb-1">Drop an image here or click to upload</p>
                        <p className="text-xs text-muted-foreground">PNG, JPG, GIF up to 5MB</p>
                      </div>
                    )}
                    <input
                      type="file"
                      ref={fileInputRef}
                      onChange={(e) => { const f = e.target.files?.[0]; if (f) handleImageSelect(f); }}
                      accept="image/*"
                      className="hidden"
                    />
                  </div>
                  )}
                </>
              )}
            </div>
          </section>

          {!isVerified && (
            <p className="text-[13px] text-ink-muted">
              Edits to your listing are reviewed by our team before they go live again.
            </p>
          )}

          <button
            type="submit"
            disabled={isSubmitting}
            className="btn-sun h-12 w-full text-[15px]"
          >
            {isSubmitting ? (
              <>
                <Loader2 size={20} className="animate-spin" />
                Saving...
              </>
            ) : (
              <>
                <Save size={20} />
                {isVerified ? 'Save & publish' : 'Save & resubmit for review'}
              </>
            )}
          </button>
        </form>
      </div>
    </div>
  );
}
