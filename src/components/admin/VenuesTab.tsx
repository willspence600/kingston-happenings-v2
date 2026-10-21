'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { addDays, format } from 'date-fns';
import { ChevronDown, Edit, Loader2, MapPin, Plus, Search, Trash2, X } from 'lucide-react';
import type { Event } from '@/types/event';
import { isDowntown } from '@/components/brand';
import { venueTier, type PromotionTier } from '@/lib/promotion';
import { TierBadge, TierModal } from './PromotionTiers';
import type { AdminVenue, ShowToast } from './types';

const AVATAR_COLORS = ['bg-[#c4582b]', 'bg-navy', 'bg-[#3e7ca6]', 'bg-[#2f7a55]', 'bg-[#c4452b]', 'bg-[#b07a12]'];

function avatarColor(name: string) {
  let hash = 0;
  for (let i = 0; i < name.length; i++) hash = (hash * 31 + name.charCodeAt(i)) >>> 0;
  return AVATAR_COLORS[hash % AVATAR_COLORS.length];
}

export function DKBadge({ size = 22 }: { size?: number }) {
  // eslint-disable-next-line @next/next/no-img-element
  return <img src="/dk-badge.svg" alt="Downtown Kingston" width={size} height={size} className="shrink-0" />;
}

type SortMode = 'az' | 'za' | 'busiest' | 'tier';
type Filter = 'all' | 'downtown' | 'major' | 'promoted';

export type VenueUpdate = Partial<Pick<AdminVenue, 'isMajor' | 'isDowntownDistrict' | 'eventPromotionTier' | 'specialPromotionTier' | 'status'>>;

export default function VenuesTab({
  venues,
  listings,
  showToast,
  onUpdateVenue,
  onDeleteVenue,
  onRejectVenue,
  onVenueCreated,
}: {
  venues: AdminVenue[];
  listings: Event[];
  showToast: ShowToast;
  onUpdateVenue: (venue: AdminVenue, update: VenueUpdate, success?: string) => Promise<boolean>;
  onDeleteVenue: (venue: AdminVenue) => Promise<void>;
  onRejectVenue: (venue: AdminVenue) => Promise<void>;
  onVenueCreated: () => Promise<void>;
}) {
  const [query, setQuery] = useState('');
  const [filter, setFilter] = useState<Filter>('all');
  const [sort, setSort] = useState<SortMode>('az');
  const [showSort, setShowSort] = useState(false);
  const [tierVenue, setTierVenue] = useState<AdminVenue | null>(null);
  const [busyKey, setBusyKey] = useState<string | null>(null);
  const [showAdd, setShowAdd] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null);

  const pending = venues.filter((v) => v.status === 'pending');
  const published = venues.filter((v) => v.status !== 'pending');

  const weekCounts = useMemo(() => {
    const today = format(new Date(), 'yyyy-MM-dd');
    const end = format(addDays(new Date(), 6), 'yyyy-MM-dd');
    const counts: Record<string, { events: Set<string>; specials: Set<string> }> = {};
    listings.forEach((e) => {
      if (e.status !== 'approved' || e.date < today || e.date > end) return;
      const c = (counts[e.venue.id] ??= { events: new Set(), specials: new Set() });
      (e.categories.includes('food-deal') ? c.specials : c.events).add(e.seriesId || e.id);
    });
    return counts;
  }, [listings]);

  const total = (id: string) => (weekCounts[id]?.events.size ?? 0) + (weekCounts[id]?.specials.size ?? 0);
  const weekLabel = (id: string) => {
    const ev = weekCounts[id]?.events.size ?? 0;
    const sp = weekCounts[id]?.specials.size ?? 0;
    return [ev && `${ev} event${ev === 1 ? '' : 's'}`, sp && `${sp} special${sp === 1 ? '' : 's'}`].filter(Boolean).join(' · ') || '—';
  };
  const tierRank = (v: AdminVenue) => {
    const r = (t: PromotionTier) => ['featured', 'promoted', 'boosted', 'standard'].indexOf(t);
    return Math.min(r(venueTier(v, 'events')), r(venueTier(v, 'specials')));
  };

  const filtered = useMemo(() => {
    const q = query.toLowerCase();
    const key = (name: string) => name.replace(/^the\s+/i, '');
    return published
      .filter((v) => !q || v.name.toLowerCase().includes(q) || v.address.toLowerCase().includes(q))
      .filter((v) =>
        filter === 'downtown'
          ? isDowntown(v)
          : filter === 'major'
          ? v.isMajor
          : filter === 'promoted'
          ? venueTier(v, 'events') !== 'standard' || venueTier(v, 'specials') !== 'standard'
          : true
      )
      .sort((a, b) =>
        sort === 'busiest'
          ? total(b.id) - total(a.id) || key(a.name).localeCompare(key(b.name))
          : sort === 'tier'
          ? tierRank(a) - tierRank(b) || key(a.name).localeCompare(key(b.name))
          : sort === 'za'
          ? key(b.name).localeCompare(key(a.name))
          : key(a.name).localeCompare(key(b.name))
      );
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [published, query, filter, sort, weekCounts]);

  const sortLabels: Record<SortMode, string> = { az: 'Sort: A–Z', za: 'Sort: Z–A', busiest: 'Sort: Busiest', tier: 'Sort: Promotion' };

  const toggleMajor = async (v: AdminVenue) => {
    setBusyKey(`${v.id}:major`);
    await onUpdateVenue(v, { isMajor: !v.isMajor }, v.isMajor ? `${v.name} is no longer a Major Venue` : `${v.name} is now a Major Venue`);
    setBusyKey(null);
  };

  const toggleDowntown = async (v: AdminVenue) => {
    setBusyKey(`${v.id}:downtown`);
    await onUpdateVenue(
      v,
      { isDowntownDistrict: !v.isDowntownDistrict },
      v.isDowntownDistrict ? `${v.name} removed from Downtown Kingston` : `${v.name} added to Downtown Kingston`
    );
    setBusyKey(null);
  };

  return (
    <div className="flex flex-col gap-12">
      {pending.length > 0 && (
        <section>
          <div className="flex items-baseline justify-between border-b-[1.5px] border-navy pb-2.5">
            <h2 className="text-[22px] font-bold text-navy">New venues to verify</h2>
            <span className="text-[12px] text-ink-muted">Approving a listing at a new venue verifies it automatically</span>
          </div>
          {pending.map((venue) => (
            <div key={venue.id} className="flex flex-col gap-3 border-b border-line py-4 sm:flex-row sm:items-center sm:justify-between">
              <div className="min-w-0">
                <p className="text-[16px] font-bold text-navy">{venue.name}</p>
                <p className="flex items-center gap-1 text-[12px] text-ink-muted">
                  <MapPin size={12} className="text-link" />
                  {venue.address}
                </p>
              </div>
              <div className="flex gap-2">
                <button onClick={() => onRejectVenue(venue)} className="btn-ghost btn-sm">
                  Reject
                </button>
                <button onClick={() => onUpdateVenue(venue, { status: 'approved' }, `${venue.name} verified`)} className="btn-navy btn-sm">
                  Verify
                </button>
              </div>
            </div>
          ))}
        </section>
      )}

      <section>
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex gap-2 overflow-x-auto no-scrollbar pb-1">
            {(
              [
                ['all', 'All'],
                ['downtown', 'Downtown Kingston'],
                ['major', 'Major Venues'],
                ['promoted', 'Promoted'],
              ] as [Filter, string][]
            ).map(([id, label]) => (
              <button key={id} className="chip h-10 gap-2" data-active={filter === id} onClick={() => setFilter(id)}>
                {id === 'downtown' && <DKBadge size={20} />}
                {label}
              </button>
            ))}
          </div>
          <div className="flex items-center gap-2">
            <button onClick={() => setShowAdd(true)} className="btn-navy btn-sm h-10 shrink-0 gap-1.5 px-4">
              <Plus size={15} /> Add venue
            </button>
            <div className="relative w-full lg:w-[280px]">
              <Search size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-navy" />
              <input
                type="search"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search venues…"
                className="h-10 w-full rounded-full border border-line bg-white pl-10 pr-4 text-[14px] text-navy outline-none focus:border-navy"
              />
            </div>
            <div className="relative shrink-0">
              <button onClick={() => setShowSort(!showSort)} className="chip h-10 gap-2 px-3.5">
                {sortLabels[sort]}
                <ChevronDown size={14} />
              </button>
              {showSort && (
                <>
                  <div className="fixed inset-0 z-10" onClick={() => setShowSort(false)} />
                  <div className="absolute right-0 top-full z-20 mt-2 w-44 overflow-hidden rounded-[14px] border border-line bg-white py-1 shadow-lg">
                    {(Object.keys(sortLabels) as SortMode[]).map((s) => (
                      <button
                        key={s}
                        onClick={() => {
                          setSort(s);
                          setShowSort(false);
                        }}
                        className={`w-full px-4 py-2 text-left text-[13px] text-navy hover:bg-sky-soft ${sort === s ? 'font-bold' : ''}`}
                      >
                        {sortLabels[s]}
                      </button>
                    ))}
                  </div>
                </>
              )}
            </div>
          </div>
        </div>

        <div className="mt-6 hidden grid-cols-[1fr_150px_minmax(340px,auto)] gap-6 border-b-[1.5px] border-navy px-2 pb-2.5 text-[12px] font-medium uppercase tracking-[0.16em] text-[#6d7682] lg:grid">
          <span>Venue · {filtered.length}</span>
          <span>This week</span>
          <span className="text-right">Admin</span>
        </div>

        {filtered.map((v) => (
          <div
            key={v.id}
            className="grid grid-cols-1 items-center gap-3 border-b border-[#eceff3] px-2 py-3.5 lg:grid-cols-[1fr_150px_minmax(340px,auto)] lg:gap-6"
          >
            <Link href={`/admin/venues/${v.id}`} className="group flex min-w-0 items-center gap-4">
              <span className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-[12px] text-[18px] font-bold text-white ${avatarColor(v.name)}`}>
                {v.name.replace(/^the\s+/i, '').charAt(0).toUpperCase()}
              </span>
              <span className="min-w-0">
                <span className="flex items-center gap-2">
                  <span className="truncate text-[16px] font-bold text-navy group-hover:underline">{v.name}</span>
                  {isDowntown(v) && <DKBadge />}
                </span>
                <span className="mt-[3px] block truncate text-[13px] text-[#6d7682]">{v.address}</span>
              </span>
            </Link>
            <span className="hidden text-[14px] text-ink-muted lg:block">{weekLabel(v.id)}</span>
            <div className="flex flex-wrap items-center gap-2 lg:justify-end">
              <button
                type="button"
                onClick={() => setTierVenue(v)}
                className="flex items-center gap-1 rounded-full border border-line p-1 hover:border-navy"
                title="Edit promotion tier"
              >
                <TierBadge tier={venueTier(v, 'events')} kind="events" />
                <TierBadge tier={venueTier(v, 'specials')} kind="specials" />
              </button>
              <label className="flex items-center gap-2 text-[12px] font-bold text-navy">
                <button
                  type="button"
                  className="switch"
                  data-on={!!v.isDowntownDistrict}
                  disabled={busyKey === `${v.id}:downtown`}
                  onClick={() => toggleDowntown(v)}
                  aria-pressed={!!v.isDowntownDistrict}
                  aria-label={`Downtown Kingston: ${v.name}`}
                  title="Part of the Downtown Kingston business district"
                >
                  <span />
                </button>
                {busyKey === `${v.id}:downtown` ? <Loader2 size={12} className="animate-spin" /> : 'Downtown'}
              </label>
              <label className="flex items-center gap-2 text-[12px] font-bold text-navy">
                <button
                  type="button"
                  className="switch"
                  data-on={!!v.isMajor}
                  disabled={busyKey === `${v.id}:major`}
                  onClick={() => toggleMajor(v)}
                  aria-pressed={!!v.isMajor}
                  aria-label={`Major Venue: ${v.name}`}
                >
                  <span />
                </button>
                {busyKey === `${v.id}:major` ? <Loader2 size={12} className="animate-spin" /> : 'Major'}
              </label>
              <Link href={`/admin/venues/${v.id}`} className="btn-outline btn-sm h-8 px-3">
                <Edit size={13} /> Edit
              </Link>
              {confirmDelete === v.id ? (
                <>
                  <button
                    className="btn btn-sm h-8 bg-danger px-3 font-bold text-white"
                    onClick={async () => {
                      await onDeleteVenue(v);
                      setConfirmDelete(null);
                    }}
                  >
                    Delete venue &amp; listings
                  </button>
                  <button className="btn-ghost btn-sm h-8 px-3" onClick={() => setConfirmDelete(null)}>
                    Keep
                  </button>
                </>
              ) : (
                <button
                  onClick={() => setConfirmDelete(v.id)}
                  className="flex h-8 w-8 items-center justify-center rounded-full text-danger hover:bg-danger-tint"
                  aria-label={`Delete ${v.name}`}
                >
                  <Trash2 size={14} />
                </button>
              )}
            </div>
          </div>
        ))}

        {filtered.length === 0 && (
          <div className="mt-4 rounded-[22px] bg-sky-soft px-6 py-14 text-center">
            <p className="text-[20px] font-bold text-navy">No venues found</p>
            <p className="mt-1 text-[14px] text-ink-muted">Try a different search or filter.</p>
          </div>
        )}
      </section>

      {showAdd && (
        <AddVenueModal
          onClose={() => setShowAdd(false)}
          showToast={showToast}
          onCreated={async (name) => {
            setShowAdd(false);
            showToast(`${name} added`, 'success');
            await onVenueCreated();
          }}
        />
      )}

      {tierVenue && (
        <TierModal
          venue={tierVenue}
          onClose={() => setTierVenue(null)}
          onSave={async (tiers) => {
            const ok = await onUpdateVenue(tierVenue, tiers, `Promotion tiers updated for ${tierVenue.name}`);
            if (ok) setTierVenue(null);
            else showToast('Couldn’t update the tiers', 'error');
          }}
        />
      )}
    </div>
  );
}

function AddVenueModal({
  onClose,
  onCreated,
  showToast,
}: {
  onClose: () => void;
  onCreated: (name: string) => Promise<void>;
  showToast: ShowToast;
}) {
  const [form, setForm] = useState({ name: '', address: '', neighborhood: '', website: '', isDowntownDistrict: false, isMajor: false });
  const [saving, setSaving] = useState(false);
  const set = <K extends keyof typeof form>(key: K, value: (typeof form)[K]) => setForm((f) => ({ ...f, [key]: value }));

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [onClose]);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name.trim() || !form.address.trim()) return;
    setSaving(true);
    try {
      const res = await fetch('/api/venues', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...form,
          name: form.name.trim(),
          address: form.address.trim(),
          neighborhood: form.neighborhood.trim() || null,
          website: form.website.trim() || null,
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || 'Failed to add venue');
      await onCreated(form.name.trim());
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Failed to add venue', 'error');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[60] flex items-start justify-center overflow-y-auto bg-navy/50 p-3 sm:items-center sm:p-6" onClick={onClose}>
      <form className="my-4 w-full max-w-lg rounded-[22px] bg-white p-5 sm:p-7" onClick={(e) => e.stopPropagation()} onSubmit={submit}>
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="eyebrow-sm">Venues</p>
            <p className="mt-1 text-[22px] font-bold text-navy">Add a venue</p>
          </div>
          <button type="button" onClick={onClose} className="flex h-9 w-9 items-center justify-center rounded-full text-navy hover:bg-sky-soft" aria-label="Close">
            <X size={18} />
          </button>
        </div>
        <div className="mt-5 flex flex-col gap-4">
          <div>
            <label className="field-label" htmlFor="new-venue-name">Name *</label>
            <input id="new-venue-name" className="field" value={form.name} onChange={(e) => set('name', e.target.value)} required autoFocus />
          </div>
          <div>
            <label className="field-label" htmlFor="new-venue-address">Address *</label>
            <input id="new-venue-address" className="field" value={form.address} onChange={(e) => set('address', e.target.value)} placeholder="123 Princess St, Kingston" required />
          </div>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <label className="field-label" htmlFor="new-venue-neighborhood">Neighbourhood</label>
              <input id="new-venue-neighborhood" className="field" value={form.neighborhood} onChange={(e) => set('neighborhood', e.target.value)} />
            </div>
            <div>
              <label className="field-label" htmlFor="new-venue-website">Website</label>
              <input id="new-venue-website" className="field" type="url" value={form.website} onChange={(e) => set('website', e.target.value)} placeholder="https://" />
            </div>
          </div>
          <div className="flex flex-wrap gap-6">
            {(
              [
                ['isDowntownDistrict', 'Downtown Kingston'],
                ['isMajor', 'Major Venue'],
              ] as const
            ).map(([key, label]) => (
              <label key={key} className="flex items-center gap-2 text-[13px] font-bold text-navy">
                <button type="button" className="switch" data-on={form[key]} onClick={() => set(key, !form[key])} aria-pressed={form[key]} aria-label={label}>
                  <span />
                </button>
                {key === 'isDowntownDistrict' && <DKBadge size={18} />}
                {label}
              </label>
            ))}
          </div>
          <p className="field-hint">You can add a logo, hours and other details from the venue&rsquo;s Edit page afterwards.</p>
        </div>
        <div className="mt-6 flex justify-end gap-2">
          <button type="button" onClick={onClose} className="btn-ghost">
            Cancel
          </button>
          <button type="submit" className="btn-navy" disabled={saving || !form.name.trim() || !form.address.trim()}>
            {saving && <Loader2 size={14} className="animate-spin" />} Add venue
          </button>
        </div>
      </form>
    </div>
  );
}
