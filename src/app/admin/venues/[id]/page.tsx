'use client';

import { use, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { format, parseISO } from 'date-fns';
import { ArrowLeft, Calendar, Edit, ExternalLink, Loader2, MapPin, Repeat, Shield, Upload, Users, Utensils, X } from 'lucide-react';
import type { Event } from '@/types/event';
import { useAuth } from '@/contexts/AuthContext';
import { useEvents } from '@/contexts/EventsContext';
import { Toast } from '@/components';
import { formatTime, isAllDayEvent } from '@/components/brand';
import { VenueDetailsEditor, venueDetailsDraft, venueDetailsPayload, type VenueDetailsDraft } from '@/components/venues';
import ListingModal from '@/components/admin/ListingModal';
import { TierBadge, TierPicker } from '@/components/admin/PromotionTiers';
import { DKBadge } from '@/components/admin/VenuesTab';
import type { AdminVenue, ToastType } from '@/components/admin/types';
import { compressImage } from '@/utils/compression';
import { getRecurrenceLabel } from '@/utils/recurrenceLabel';
import { listingTier, venueTier, type PromotionTier } from '@/lib/promotion';

interface Form {
  name: string;
  address: string;
  imageUrl: string;
  coverImageUrl: string;
  isMajor: boolean;
  isDowntownDistrict: boolean;
  eventPromotionTier: PromotionTier;
  specialPromotionTier: PromotionTier;
}

interface Organizer {
  id: string;
  name: string;
  email: string;
  role: string | null;
  isVerifiedOrganizer: boolean;
}

const toForm = (v: AdminVenue): Form => ({
  name: v.name,
  address: v.address,
  imageUrl: v.imageUrl || '',
  coverImageUrl: v.coverImageUrl || '',
  isMajor: !!v.isMajor,
  isDowntownDistrict: !!v.isDowntownDistrict,
  eventPromotionTier: venueTier(v, 'events'),
  specialPromotionTier: venueTier(v, 'specials'),
});

function Switch({ on, onChange, label, hint }: { on: boolean; onChange: (v: boolean) => void; label: string; hint: string }) {
  return (
    <div className="flex items-start gap-3">
      <button type="button" className="switch mt-0.5" data-on={on} onClick={() => onChange(!on)} aria-pressed={on} aria-label={label}>
        <span />
      </button>
      <div>
        <p className="text-[14px] font-bold text-navy">{label}</p>
        <p className="field-hint">{hint}</p>
      </div>
    </div>
  );
}

function ImageField({ label, value, onChange }: { label: string; value: string; onChange: (v: string) => void }) {
  const ref = useRef<HTMLInputElement>(null);
  return (
    <div>
      <p className="field-label">{label}</p>
      {value ? (
        <div className="relative h-40 overflow-hidden rounded-[14px] bg-sky-soft">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={value} alt="" className="h-full w-full object-contain" />
          <button
            type="button"
            onClick={() => onChange('')}
            className="absolute right-2 top-2 flex h-7 w-7 items-center justify-center rounded-full bg-navy text-white"
            aria-label={`Remove ${label}`}
          >
            <X size={14} />
          </button>
        </div>
      ) : (
        <button
          type="button"
          onClick={() => ref.current?.click()}
          className="flex h-40 w-full flex-col items-center justify-center gap-2 rounded-[14px] border-2 border-dashed border-line text-[13px] text-ink-muted hover:border-navy/40"
        >
          <Upload size={22} /> Upload an image
        </button>
      )}
      <input
        ref={ref}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={async (e) => {
          const file = e.target.files?.[0];
          if (file) onChange(await compressImage(file));
        }}
      />
      <input
        type="url"
        value={value.startsWith('data:') ? '' : value}
        onChange={(e) => onChange(e.target.value)}
        placeholder="Or paste an image URL"
        className="field mt-2 h-10 text-[13px]"
      />
    </div>
  );
}

function ListingRow({ event, onOpen }: { event: Event; onOpen: () => void }) {
  const special = event.categories.includes('food-deal');
  const tier = listingTier(event);
  return (
    <button type="button" onClick={onOpen} className="group flex w-full items-center gap-4 border-b border-line py-3 text-left hover:bg-sky-soft">
      <span className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-[10px] ${special ? 'bg-[#ffe8d6] text-[#a84a12]' : 'bg-sky text-link-deep'}`}>
        {special ? <Utensils size={15} /> : <Calendar size={15} />}
      </span>
      <span className="min-w-0 flex-1">
        <span className="flex items-center gap-2">
          <span className="truncate text-[15px] font-bold text-navy group-hover:underline">{event.title}</span>
          {event.hiddenFromPromotion && <span className="tag bg-[#eef1f5] text-ink-muted">Hidden from promotion</span>}
          {event.status === 'cancelled' && <span className="tag bg-danger text-white">Cancelled</span>}
        </span>
        <span className="flex items-center gap-1 text-[12px] text-ink-muted">
          {event.isRecurring && <Repeat size={11} />}
          {event.isRecurring
            ? `${getRecurrenceLabel({ recurrencePattern: event.recurrencePattern, recurrenceDays: event.recurrenceDays, recurrenceDay: event.recurrenceDay })} · next ${format(parseISO(event.date), 'MMM d')}`
            : format(parseISO(event.date), 'EEE, MMM d')}
          {' · '}
          {isAllDayEvent(event) ? 'All day' : formatTime(event.startTime)}
        </span>
      </span>
      {tier !== 'standard' && <TierBadge tier={tier} />}
      <Edit size={14} className="shrink-0 text-link" />
    </button>
  );
}

export default function AdminVenuePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const router = useRouter();
  const { isAdmin, isLoading: authLoading } = useAuth();
  const { venues: allVenues, refreshVenues, refreshEvents } = useEvents();
  const [venue, setVenue] = useState<AdminVenue | null>(null);
  const [notFound, setNotFound] = useState(false);
  const [form, setForm] = useState<Form | null>(null);
  const [details, setDetails] = useState<VenueDetailsDraft | null>(null);
  const [listings, setListings] = useState<Event[]>([]);
  const [organizers, setOrganizers] = useState<Organizer[]>([]);
  const [saving, setSaving] = useState(false);
  const [openEvent, setOpenEvent] = useState<Event | null>(null);
  const [toast, setToast] = useState<{ isVisible: boolean; message: string; type: ToastType }>({ isVisible: false, message: '', type: 'success' });
  const showToast = (message: string, type: ToastType = 'success') => setToast({ isVisible: true, message, type });

  const loadVenue = useCallback(async () => {
    const res = await fetch(`/api/venues/${id}`, { cache: 'no-store' });
    if (!res.ok) {
      setNotFound(true);
      return;
    }
    const v = (await res.json()).venue as AdminVenue;
    setVenue(v);
    setForm(toForm(v));
    setDetails(venueDetailsDraft(v));
  }, [id]);

  const loadListings = useCallback(async () => {
    const today = format(new Date(), 'yyyy-MM-dd');
    const res = await fetch(`/api/events?status=all&venueId=${id}&fromDate=${today}&limit=1000`, { cache: 'no-store' });
    if (res.ok) {
      const events = ((await res.json()).events || []) as Event[];
      setListings(events.filter((e) => e.status === 'approved' || e.status === 'cancelled'));
    }
  }, [id]);

  useEffect(() => {
    if (!authLoading && !isAdmin) router.push('/login');
  }, [authLoading, isAdmin, router]);

  useEffect(() => {
    if (!isAdmin) return;
    loadVenue();
    loadListings();
    fetch(`/api/venues/${id}/organizers`)
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => setOrganizers(d?.organizers || []))
      .catch(() => {});
  }, [isAdmin, id, loadVenue, loadListings]);

  // One row per recurring series
  const grouped = useMemo(() => {
    const seen = new Set<string>();
    const rows = listings.filter((e) => {
      const key = e.seriesId || e.id;
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });
    return {
      events: rows.filter((e) => !e.categories.includes('food-deal')),
      specials: rows.filter((e) => e.categories.includes('food-deal')),
    };
  }, [listings]);

  if (authLoading || (!venue && !notFound)) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <Loader2 size={32} className="animate-spin text-navy" />
      </div>
    );
  }
  if (!isAdmin) return null;
  if (notFound || !venue || !form || !details) {
    return (
      <div className="page-container flex min-h-[60vh] flex-col items-start justify-center gap-4 py-24">
        <h1 className="display-section">Venue not found</h1>
        <Link href="/admin?tab=venues" className="btn-sun">
          Back to venues
        </Link>
      </div>
    );
  }

  const set = (patch: Partial<Form>) => setForm({ ...form, ...patch });

  const save = async () => {
    if (!form.name.trim() || !form.address.trim()) {
      showToast('Name and address are required', 'error');
      return;
    }
    setSaving(true);
    try {
      const res = await fetch(`/api/venues/${venue.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...venueDetailsPayload(details), ...form }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || 'Failed to save venue');
      showToast(organizers.length > 0 ? 'Saved — the venue’s organizers have been notified' : 'Venue saved', 'success');
      await loadVenue();
      refreshVenues();
      refreshEvents();
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Failed to save venue', 'error');
    } finally {
      setSaving(false);
    }
  };

  const dirty = JSON.stringify(form) !== JSON.stringify(toForm(venue)) || JSON.stringify(details) !== JSON.stringify(venueDetailsDraft(venue));

  return (
    <div>
      <div className="bg-sun">
        <div className="page-container flex flex-wrap items-center justify-between gap-3 py-2.5">
          <p className="flex items-center gap-2 text-[12px] font-bold uppercase tracking-[0.12em] text-navy">
            <Shield size={14} /> Admin view — everything here is editable
          </p>
          <Link href={`/venues/${venue.id}`} className="flex items-center gap-1 text-[12px] font-bold text-navy hover:underline">
            View public page <ExternalLink size={12} />
          </Link>
        </div>
      </div>

      <section className="bg-navy text-white">
        <div className="page-container pb-10 pt-6">
          <Link href="/admin?tab=venues" className="inline-flex items-center gap-2 text-[13px] font-medium text-white hover:underline">
            <ArrowLeft size={16} />
            Admin · Venues
          </Link>
          <div className="mt-6 flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
            <div className="flex items-end gap-5">
              {form.imageUrl && (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={form.imageUrl} alt="" className="hidden h-24 w-24 shrink-0 rounded-[18px] bg-white object-contain p-2 sm:block" />
              )}
              <div>
                <p className="eyebrow !text-sun">— {venue.venueTypes?.length ? venue.venueTypes.join(' · ') : 'Venue'}</p>
                <h1 className="display-section !text-white mt-3 max-w-[820px]">{venue.name}</h1>
                <div className="mt-4 flex flex-wrap items-center gap-2">
                  {venue.isDowntownDistrict && (
                    <span className="flex items-center gap-1.5 rounded-full bg-white py-1 pl-1 pr-3 text-[12px] font-bold text-navy">
                      <DKBadge size={20} /> Downtown Kingston
                    </span>
                  )}
                  {venue.isMajor && <span className="tag bg-white text-navy">Major Venue</span>}
                  <TierBadge tier={venueTier(venue, 'events')} kind="events" />
                  <TierBadge tier={venueTier(venue, 'specials')} kind="specials" />
                  {venue.status === 'pending' && <span className="tag bg-[#fff1d6] text-[#8a5a00]">Not verified yet</span>}
                </div>
              </div>
            </div>
            <p className="flex items-center gap-1.5 text-[14px]">
              <MapPin size={15} className="text-sun" />
              {venue.address}
            </p>
          </div>
        </div>
      </section>

      <div className="page-container pb-32 pt-10">
        <div className="grid grid-cols-1 gap-10 lg:grid-cols-[1fr_380px]">
          <div className="flex min-w-0 flex-col gap-6">
            <section className="card p-5 sm:p-7">
              <p className="text-[20px] font-bold text-navy">Basics</p>
              <div className="mt-5 grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div className="sm:col-span-2">
                  <label className="field-label" htmlFor="v-name">
                    Venue name
                  </label>
                  <input id="v-name" className="field" value={form.name} onChange={(e) => set({ name: e.target.value })} />
                </div>
                <div className="sm:col-span-2">
                  <label className="field-label" htmlFor="v-address">
                    Address
                  </label>
                  <input id="v-address" className="field" value={form.address} onChange={(e) => set({ address: e.target.value })} />
                </div>
              </div>
            </section>

            <section className="card p-5 sm:p-7">
              <p className="text-[20px] font-bold text-navy">Listing settings</p>
              <div className="mt-5 flex flex-col gap-5">
                <Switch
                  on={form.isDowntownDistrict}
                  onChange={(v) => set({ isDowntownDistrict: v })}
                  label="Downtown Kingston"
                  hint="Part of the Downtown Kingston business district — shows the DK logo and appears under the Downtown filters."
                />
                <Switch
                  on={form.isMajor}
                  onChange={(v) => set({ isMajor: v })}
                  label="Major Venue"
                  hint="Only Major Venues are listed on Coming up and can add photos when submitting."
                />
                <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
                  <div>
                    <p className="field-label">Events promotion tier</p>
                    <TierPicker kind="events" value={form.eventPromotionTier} onChange={(t) => set({ eventPromotionTier: t })} />
                  </div>
                  <div>
                    <p className="field-label">Specials promotion tier</p>
                    <TierPicker kind="specials" value={form.specialPromotionTier} onChange={(t) => set({ specialPromotionTier: t })} />
                  </div>
                </div>
              </div>
            </section>

            <section className="card p-5 sm:p-7">
              <p className="text-[20px] font-bold text-navy">Your Venue details</p>
              <p className="field-hint mt-1">The same details organizers fill in when they sign up.</p>
              <div className="mt-5">
                <VenueDetailsEditor value={details} onChange={setDetails} />
              </div>
            </section>

            <section className="card p-5 sm:p-7">
              <p className="text-[20px] font-bold text-navy">Images</p>
              <div className="mt-5 grid grid-cols-1 gap-5 sm:grid-cols-2">
                <ImageField label="Logo / thumbnail" value={form.imageUrl} onChange={(v) => set({ imageUrl: v })} />
                <ImageField label="Cover photo" value={form.coverImageUrl} onChange={(v) => set({ coverImageUrl: v })} />
              </div>
            </section>
          </div>

          <aside className="flex flex-col gap-8 lg:sticky lg:top-24 lg:self-start">
            <div>
              <p className="eyebrow-sm">Organizers</p>
              <div className="card mt-3 flex flex-col gap-3 p-5">
                {organizers.length === 0 ? (
                  <p className="text-[14px] text-ink-muted">No organizers are associated with this venue yet.</p>
                ) : (
                  <>
                    {organizers.map((o) => (
                      <Link key={o.id} href={`/admin/users/${o.id}`} className="group flex items-start gap-3">
                        <Users size={16} className="mt-0.5 shrink-0 text-link" />
                        <span className="min-w-0">
                          <span className="block text-[14px] font-bold text-navy group-hover:underline">{o.name}</span>
                          <span className="block truncate text-[12px] text-ink-muted">
                            {[o.role, o.isVerifiedOrganizer ? 'Verified Organizer' : 'Unverified', o.email].filter(Boolean).join(' · ')}
                          </span>
                        </span>
                      </Link>
                    ))}
                    <p className="border-t border-line pt-3 text-[12px] text-ink-muted">
                      They get a notification on My Venue whenever you change this venue or its listings.
                    </p>
                  </>
                )}
              </div>
            </div>

            <div>
              <p className="eyebrow-sm">Upcoming events · {grouped.events.length}</p>
              <div className="mt-2 border-t border-line">
                {grouped.events.length === 0 ? (
                  <p className="py-4 text-[13px] text-ink-muted">No upcoming events.</p>
                ) : (
                  grouped.events.map((e) => <ListingRow key={e.id} event={e} onOpen={() => setOpenEvent(e)} />)
                )}
              </div>
            </div>
            <div>
              <p className="eyebrow-sm">Upcoming specials · {grouped.specials.length}</p>
              <div className="mt-2 border-t border-line">
                {grouped.specials.length === 0 ? (
                  <p className="py-4 text-[13px] text-ink-muted">No upcoming specials.</p>
                ) : (
                  grouped.specials.map((e) => <ListingRow key={e.id} event={e} onOpen={() => setOpenEvent(e)} />)
                )}
              </div>
            </div>
          </aside>
        </div>
      </div>

      <div className="fixed inset-x-0 bottom-0 z-40 border-t border-line bg-white/95 backdrop-blur">
        <div className="page-container flex items-center justify-between gap-3 py-3">
          <p className="text-[13px] text-ink-muted">{dirty ? 'You have unsaved changes.' : 'All changes saved.'}</p>
          <div className="flex gap-2">
            <button
              type="button"
              className="btn-ghost"
              disabled={!dirty || saving}
              onClick={() => {
                setForm(toForm(venue));
                setDetails(venueDetailsDraft(venue));
              }}
            >
              Discard
            </button>
            <button type="button" className="btn-sun" disabled={!dirty || saving} onClick={save}>
              {saving && <Loader2 size={15} className="animate-spin" />} Save venue
            </button>
          </div>
        </div>
      </div>

      {openEvent && (
        <ListingModal
          event={listings.find((l) => l.id === openEvent.id) ?? openEvent}
          venues={allVenues}
          onClose={() => setOpenEvent(null)}
          onMessage={showToast}
          onChanged={async () => {
            await loadListings();
            refreshEvents();
          }}
        />
      )}

      <Toast isOpen={toast.isVisible} message={toast.message} type={toast.type} onClose={() => setToast((t) => ({ ...t, isVisible: false }))} />
    </div>
  );
}
