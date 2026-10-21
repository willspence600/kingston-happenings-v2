'use client';

import { use, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { Accessibility, ArrowLeft, AtSign, Check, Clock, Globe, Loader2, MapPin, Navigation, Pencil, Phone, Shield, Users } from 'lucide-react';
import { format, parseISO, isToday, isTomorrow } from 'date-fns';
import { useEvents } from '@/contexts/EventsContext';
import type { Event } from '@/types/event';
import { getRecurrenceLabel } from '@/utils/recurrenceLabel';
import { normalizeUrl } from '@/utils/formatting';
import { TimeCard, isDowntown, specialHoursLabel } from '@/components/brand';
import { VenueDetailsEditor, venueDetailsDraft, venueDetailsPayload, type VenueDetailsDraft } from '@/components/venues';
import { WEEK_DAYS, formatHourLabel } from '@/constants/venueDetails';
import { useAuth } from '@/contexts/AuthContext';

interface VenueOrganizers {
  count: number;
  canSeeOrganizers: boolean;
  canEdit: boolean;
  organizers?: { id: string; name: string; email: string; role: string | null; isVerifiedOrganizer: boolean }[];
}

/** Collapse recurring occurrences into one representative item per series */
function groupBySeries(events: Event[]): Event[] {
  const seenSeries = new Set<string>();
  const result: Event[] = [];
  const sorted = [...events].sort((a, b) => a.date.localeCompare(b.date) || a.startTime.localeCompare(b.startTime));
  for (const event of sorted) {
    if (event.seriesId) {
      if (seenSeries.has(event.seriesId)) continue;
      seenSeries.add(event.seriesId);
    }
    result.push(event);
  }
  return result;
}

function whenLabel(event: Event) {
  const d = parseISO(event.date);
  const day = isToday(d) ? 'Tonight' : isTomorrow(d) ? 'Tomorrow' : format(d, 'EEE, MMM d');
  return day;
}

export default function VenueDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const { getVenueById, getEventsByVenue, isLoading, refreshVenues } = useEvents();
  const { user, isAdmin } = useAuth();
  const [organizers, setOrganizers] = useState<VenueOrganizers | null>(null);
  const [editing, setEditing] = useState<VenueDetailsDraft | null>(null);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState('');

  useEffect(() => {
    if (!user) return;
    let cancelled = false;
    fetch(`/api/venues/${id}/organizers`)
      .then((res) => (res.ok ? res.json() : null))
      .catch(() => null)
      .then((data) => {
        if (!cancelled) setOrganizers(data);
      });
    return () => {
      cancelled = true;
    };
  }, [id, user]);

  const venue = getVenueById(id);
  const venueEvents = venue ? getEventsByVenue(venue.id) : [];
  const today = format(new Date(), 'yyyy-MM-dd');

  const upcomingRegularEvents = useMemo(
    () => groupBySeries(venueEvents.filter((e) => e.date >= today && !e.categories.includes('food-deal'))),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [venueEvents.length, today]
  );
  const upcomingDeals = useMemo(
    () => groupBySeries(venueEvents.filter((e) => e.date >= today && e.categories.includes('food-deal'))),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [venueEvents.length, today]
  );
  const pastEvents = venueEvents
    .filter((e) => e.date < today && !e.categories.includes('food-deal'))
    .sort((a, b) => b.date.localeCompare(a.date))
    .slice(0, 5);

  if (!venue) {
    if (isLoading) {
      return (
        <div className="flex min-h-[60vh] items-center justify-center">
          <Loader2 size={32} className="animate-spin text-navy" />
        </div>
      );
    }
    return (
      <div className="page-container flex min-h-[60vh] flex-col items-start justify-center gap-4 py-24">
        <p className="eyebrow">— Venues</p>
        <h1 className="display-section">Venue not found</h1>
        <p className="text-ink-muted">The venue you&rsquo;re looking for doesn&rsquo;t exist.</p>
        <Link href="/venues" className="btn-sun mt-2">
          All venues →
        </Link>
      </div>
    );
  }

  const mapsUrl = `https://maps.google.com/?q=${encodeURIComponent(`${venue.name}, ${venue.address}`)}`;
  const venueTypes = venue.venueTypes || [];
  const hours = venue.hours && Object.keys(venue.hours).length > 0 ? venue.hours : null;
  const accessibility = venue.accessibility || [];
  const canEdit = !!user && !!organizers?.canEdit;

  const handleSaveDetails = async () => {
    if (!editing) return;
    setSaving(true);
    setSaveError('');
    try {
      const res = await fetch(`/api/venues/${venue.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(venueDetailsPayload(editing)),
      });
      if (!res.ok) throw new Error();
      await refreshVenues();
      setEditing(null);
    } catch {
      setSaveError('Could not save the venue details. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div>
      {/* Hero */}
      <section className="bg-navy text-white">
        <div className="page-container pb-10 pt-6">
          <Link href="/venues" className="inline-flex items-center gap-2 text-[13px] font-medium text-white hover:underline">
            <ArrowLeft size={16} />
            All venues
          </Link>
          <div className="mt-6 flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
            <div className="flex items-end gap-5">
              {venue.imageUrl && (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={venue.imageUrl} alt={`${venue.name} logo`} className="hidden h-24 w-24 shrink-0 rounded-[18px] bg-white object-contain p-2 sm:block" />
              )}
              <div>
                {venueTypes.length > 0 ? (
                  <p className="eyebrow !text-sun">— {venueTypes.join(' · ')}</p>
                ) : (
                  venue.neighborhood && <p className="eyebrow !text-sun">— {isDowntown(venue) ? 'Downtown Kingston' : venue.neighborhood}</p>
                )}
                <h1 className="display-section !text-white mt-3 max-w-[820px]">{venue.name}</h1>
              </div>
            </div>
            <div className="flex flex-col items-start gap-3 lg:items-end">
              <a href={mapsUrl} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1.5 text-[14px] hover:underline">
                <MapPin size={15} className="text-sun" />
                {venue.address}
              </a>
              <div className="flex flex-wrap gap-2">
                {venue.website && (
                  <a
                    href={normalizeUrl(venue.website)}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="btn border-[1.5px] border-white text-white font-medium hover:bg-white hover:text-navy h-10"
                  >
                    <Globe size={15} />
                    Visit website
                  </a>
                )}
                {isAdmin && (
                  <Link href={`/admin/venues/${venue.id}`} className="btn-sun h-10">
                    <Shield size={15} />
                    Admin edit
                  </Link>
                )}
              </div>
            </div>
          </div>
        </div>
      </section>

      <div className="page-container pb-24 pt-10">
        <div className="grid grid-cols-1 gap-10 lg:grid-cols-[1fr_380px]">
          {/* Upcoming events */}
          <div className="min-w-0">
            {editing ? (
              <div className="card mb-10 p-5 sm:p-7">
                <p className="text-[20px] font-bold text-navy">Edit venue details</p>
                <div className="mt-5">
                  <VenueDetailsEditor value={editing} onChange={setEditing} />
                </div>
                {saveError && <p className="mt-4 text-[14px] text-danger">{saveError}</p>}
                <div className="mt-6 flex gap-3">
                  <button type="button" onClick={handleSaveDetails} disabled={saving} className="btn-sun">
                    {saving && <Loader2 size={15} className="animate-spin" />}
                    Save changes
                  </button>
                  <button type="button" onClick={() => setEditing(null)} className="btn-ghost">
                    Cancel
                  </button>
                </div>
              </div>
            ) : (
              (venue.about || canEdit) && (
                <div className="mb-10">
                  <div className="flex items-center justify-between gap-4">
                    <p className="eyebrow-sm">About</p>
                    {canEdit && (
                      <button type="button" onClick={() => setEditing(venueDetailsDraft(venue))} className="flex items-center gap-1.5 text-[13px] font-medium text-link hover:underline">
                        <Pencil size={13} /> Edit venue details
                      </button>
                    )}
                  </div>
                  <p className="mt-3 max-w-[680px] whitespace-pre-line text-[16px] leading-[1.6] text-navy">
                    {venue.about || <span className="text-ink-muted">Add a sentence or two about what it&rsquo;s like.</span>}
                  </p>
                </div>
              )
            )}
            <p className="eyebrow-sm">Upcoming events</p>
            {upcomingRegularEvents.length > 0 ? (
              <div className="mt-3 flex flex-col gap-3">
                {upcomingRegularEvents.slice(0, 8).map((event) => (
                  <TimeCard
                    key={event.seriesId || event.id}
                    event={event}
                    subtitle={`${
                      event.isRecurring
                        ? getRecurrenceLabel({
                            recurrencePattern: event.recurrencePattern,
                            recurrenceDays: event.recurrenceDays,
                            recurrenceDay: event.recurrenceDay,
                          })
                        : whenLabel(event)
                    } · ${venue.name}`}
                  />
                ))}
              </div>
            ) : (
              <div className="card mt-3 p-8">
                <p className="text-[20px] font-bold text-navy">No upcoming events</p>
                <p className="mt-1 text-[14px] text-ink-muted">Check back soon for new events at {venue.name}.</p>
              </div>
            )}
          </div>

          <div className="flex flex-col gap-8">
            {/* Specials */}
            <div>
              <p className="eyebrow-sm">Food &amp; drink specials</p>
              <div className="mt-3 rounded-[22px] bg-sky px-6 py-2">
                {upcomingDeals.length > 0 ? (
                  upcomingDeals.slice(0, 6).map((deal) => (
                    <Link
                      key={deal.seriesId || deal.id}
                      href={`/events/${deal.id}`}
                      className="group block border-b border-navy py-4 last:border-b-0"
                    >
                      <p className="text-[20px] font-bold leading-tight text-navy group-hover:underline">{deal.title}</p>
                      <p className="mt-1.5 flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-[0.08em] text-navy">
                        <Clock size={12} />
                        {deal.isRecurring
                          ? `${getRecurrenceLabel({
                              recurrencePattern: deal.recurrencePattern,
                              recurrenceDays: deal.recurrenceDays,
                              recurrenceDay: deal.recurrenceDay,
                            }).replace(/^Every /, '')} · `
                          : `${format(parseISO(deal.date), 'EEE, MMM d')} · `}
                        {specialHoursLabel(deal)}
                      </p>
                    </Link>
                  ))
                ) : (
                  <p className="py-4 text-[14px] text-ink-muted">No specials listed right now.</p>
                )}
              </div>
            </div>

            {/* Visit */}
            <div>
              <p className="eyebrow-sm">Visit</p>
              <div className="card mt-3 flex flex-col gap-4 p-5">
                <div className="flex gap-3">
                  <MapPin size={16} className="mt-0.5 text-link" />
                  <div>
                    <p className="text-[14px] font-medium text-navy">{venue.address}</p>
                    {venue.neighborhood && <p className="text-[12px] text-ink-muted">{venue.neighborhood}</p>}
                  </div>
                </div>
                {venue.phone && (
                  <div className="flex gap-3">
                    <Phone size={16} className="mt-0.5 text-link" />
                    <a href={`tel:${venue.phone.replace(/[^\d+]/g, '')}`} className="text-[14px] font-medium text-navy hover:underline">
                      {venue.phone}
                    </a>
                  </div>
                )}
                {venue.instagram && (
                  <div className="flex gap-3">
                    <AtSign size={16} className="mt-0.5 text-link" />
                    <a
                      href={`https://instagram.com/${venue.instagram}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="truncate text-[14px] font-medium text-navy hover:underline"
                    >
                      {venue.instagram}
                    </a>
                  </div>
                )}
                {venue.website && (
                  <div className="flex gap-3">
                    <Globe size={16} className="mt-0.5 text-link" />
                    <a
                      href={normalizeUrl(venue.website)}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="truncate text-[14px] font-medium text-navy hover:underline"
                    >
                      {venue.website.replace(/^https?:\/\//, '').replace(/\/$/, '')}
                    </a>
                  </div>
                )}
                <a href={mapsUrl} target="_blank" rel="noopener noreferrer" className="btn-outline btn-sm self-start">
                  <Navigation size={14} />
                  Get directions
                </a>
              </div>
            </div>

            {/* Opening hours */}
            {hours && (
              <div>
                <p className="eyebrow-sm">Opening hours</p>
                <div className="card mt-3 px-5 py-2">
                  {WEEK_DAYS.filter((d) => hours[d]).map((d) => {
                    const h = hours[d];
                    return (
                      <div key={d} className="flex items-center justify-between border-b border-line py-2.5 text-[14px] last:border-b-0">
                        <span className="font-medium text-navy">{d}</span>
                        <span className={h.closed || !h.open ? 'text-ink-muted' : 'text-navy'}>
                          {h.closed || !h.open ? 'Closed' : `${formatHourLabel(h.open)} – ${formatHourLabel(h.close)}`}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Accessibility */}
            {(accessibility.length > 0 || venue.accessibilityNotes) && (
              <div>
                <p className="eyebrow-sm">Accessibility</p>
                <div className="card mt-3 flex flex-col gap-3 p-5">
                  {accessibility.map((a) => (
                    <p key={a} className="flex items-center gap-2.5 text-[14px] text-navy">
                      <Check size={15} className="shrink-0 text-link" strokeWidth={2.5} />
                      {a}
                    </p>
                  ))}
                  {venue.accessibilityNotes && (
                    <p className="flex gap-2.5 text-[13px] leading-[1.5] text-ink-muted">
                      <Accessibility size={15} className="mt-0.5 shrink-0 text-link" />
                      {venue.accessibilityNotes}
                    </p>
                  )}
                </div>
              </div>
            )}

            {/* Organizers associated with the venue (visible to them and admins) */}
            {organizers?.canSeeOrganizers && organizers.organizers && (
              <div>
                <p className="eyebrow-sm">Organizers</p>
                <div className="card mt-3 flex flex-col gap-3 p-5">
                  {organizers.organizers.length === 0 ? (
                    <p className="text-[14px] text-ink-muted">No organizers are associated with this venue yet.</p>
                  ) : (
                    organizers.organizers.map((o) => (
                      <div key={o.id} className="flex items-start gap-3">
                        <Users size={16} className="mt-0.5 shrink-0 text-link" />
                        <div className="min-w-0">
                          <p className="text-[14px] font-bold text-navy">
                            {o.name}
                            {o.id === user?.id && <span className="font-normal text-ink-muted"> (you)</span>}
                          </p>
                          <p className="truncate text-[12px] text-ink-muted">
                            {[o.role, o.isVerifiedOrganizer ? 'Verified Organizer' : null].filter(Boolean).join(' · ')}
                          </p>
                          <a href={`mailto:${o.email}`} className="truncate text-[12px] text-link hover:underline">
                            {o.email}
                          </a>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            )}
          </div>
        </div>

        {pastEvents.length > 0 && (
          <div className="mt-14">
            <p className="eyebrow-sm">Past events</p>
            <div className="mt-3 border-t border-line">
              {pastEvents.map((e) => (
                <Link key={e.id} href={`/events/${e.id}`} className="group flex items-center gap-6 border-b border-line py-4">
                  <span className="w-[110px] shrink-0 text-[13px] text-ink-muted">{format(parseISO(e.date), 'EEE, MMM d')}</span>
                  <span className="truncate text-[15px] font-medium text-navy group-hover:underline">{e.title}</span>
                </Link>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
