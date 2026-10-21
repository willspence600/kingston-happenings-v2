'use client';

import { Fragment, useMemo, useState } from 'react';
import Link from 'next/link';
import { format, parseISO } from 'date-fns';
import { ChevronDown, ChevronRight, Loader2, Repeat, Search } from 'lucide-react';
import type { Event } from '@/types/event';
import { isDowntown } from '@/components/brand';
import { PROMOTION_TIERS, promotionTierLabels, venueTier, type PromotionKind, type PromotionTier } from '@/lib/promotion';
import { TierRulesBox, tierChipClass } from './PromotionTiers';
import type { AdminVenue, ShowToast } from './types';
import type { VenueUpdate } from './VenuesTab';

function TierSelect({ value, onChange, disabled }: { value: PromotionTier; onChange: (t: PromotionTier) => void; disabled?: boolean }) {
  return (
    <select
      value={value}
      disabled={disabled}
      onChange={(e) => onChange(e.target.value as PromotionTier)}
      className={`h-8 rounded-full border-0 px-3 text-[12px] font-bold uppercase tracking-[0.06em] outline-none ring-1 ring-transparent focus:ring-navy ${tierChipClass[value]}`}
    >
      {PROMOTION_TIERS.map((t) => (
        <option key={t} value={t} className="bg-white text-navy">
          {promotionTierLabels[t]}
        </option>
      ))}
    </select>
  );
}

function VenueListings({
  listings,
  showToast,
  onChanged,
}: {
  listings: Event[];
  showToast: ShowToast;
  onChanged: () => Promise<void>;
}) {
  const [busy, setBusy] = useState<string | null>(null);
  if (listings.length === 0) return <p className="py-3 text-[13px] text-ink-muted">No upcoming listings.</p>;

  const toggle = async (e: Event) => {
    setBusy(e.id);
    try {
      const res = await fetch('/api/admin/listing-promotion', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ eventId: e.id, hidden: !e.hiddenFromPromotion }),
      });
      if (!res.ok) throw new Error();
      showToast(e.hiddenFromPromotion ? `“${e.title}” is back in the venue’s tier` : `“${e.title}” hidden from promotion`, 'success');
      await onChanged();
    } catch {
      showToast('Couldn’t update the listing', 'error');
    } finally {
      setBusy(null);
    }
  };

  return (
    <div className="divide-y divide-line">
      {listings.map((e) => (
        <div key={e.id} className="flex items-center gap-3 py-2.5 text-[13px]">
          <span className={`tag shrink-0 ${e.categories.includes('food-deal') ? 'bg-coral text-navy' : 'bg-sky text-link-deep'}`}>
            {e.categories.includes('food-deal') ? 'Special' : 'Event'}
          </span>
          <span className="min-w-0 flex-1">
            <span className={`block truncate font-bold ${e.hiddenFromPromotion ? 'text-ink-muted line-through' : 'text-navy'}`}>{e.title}</span>
            <span className="flex items-center gap-1 text-[12px] text-ink-muted">
              {e.isRecurring && <Repeat size={11} />}
              {e.isRecurring ? 'Recurring · next ' : ''}
              {format(parseISO(e.date), 'EEE, MMM d')}
            </span>
          </span>
          <label className="flex shrink-0 items-center gap-2 text-[12px] font-medium text-navy">
            {busy === e.id ? <Loader2 size={12} className="animate-spin" /> : e.hiddenFromPromotion ? 'Hidden' : 'Promoted with venue'}
            <button
              type="button"
              className="switch"
              data-on={!e.hiddenFromPromotion}
              disabled={busy === e.id}
              onClick={() => toggle(e)}
              aria-pressed={!e.hiddenFromPromotion}
              aria-label={`Use venue tier for ${e.title}`}
            >
              <span />
            </button>
          </label>
        </div>
      ))}
    </div>
  );
}

export default function PromotionsTab({
  venues,
  listings,
  showToast,
  onUpdateVenue,
  onListingsChanged,
}: {
  venues: AdminVenue[];
  listings: Event[];
  showToast: ShowToast;
  onUpdateVenue: (venue: AdminVenue, update: VenueUpdate, success?: string) => Promise<boolean>;
  onListingsChanged: () => Promise<void>;
}) {
  const [query, setQuery] = useState('');
  const [onlyPromoted, setOnlyPromoted] = useState(false);
  const [expanded, setExpanded] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);

  const today = format(new Date(), 'yyyy-MM-dd');

  // Upcoming listings per venue, one row per recurring series
  const upcomingByVenue = useMemo(() => {
    const map = new Map<string, Event[]>();
    const seen = new Set<string>();
    [...listings]
      .filter((e) => e.status === 'approved' && e.date >= today)
      .sort((a, b) => a.date.localeCompare(b.date) || a.startTime.localeCompare(b.startTime))
      .forEach((e) => {
        const key = e.seriesId || e.id;
        if (seen.has(key)) return;
        seen.add(key);
        if (!map.has(e.venue.id)) map.set(e.venue.id, []);
        map.get(e.venue.id)!.push(e);
      });
    return map;
  }, [listings, today]);

  const published = useMemo(() => venues.filter((v) => v.status !== 'pending'), [venues]);
  const summary = (kind: PromotionKind) =>
    PROMOTION_TIERS.map((t) => [t, published.filter((v) => venueTier(v, kind) === t).length] as const);

  const rows = useMemo(() => {
    const q = query.toLowerCase();
    const rank = (t: PromotionTier) => PROMOTION_TIERS.indexOf(t);
    return published
      .filter((v) => !q || v.name.toLowerCase().includes(q))
      .filter((v) => !onlyPromoted || venueTier(v, 'events') !== 'standard' || venueTier(v, 'specials') !== 'standard')
      .sort(
        (a, b) =>
          Math.min(rank(venueTier(a, 'events')), rank(venueTier(a, 'specials'))) -
            Math.min(rank(venueTier(b, 'events')), rank(venueTier(b, 'specials'))) || a.name.localeCompare(b.name)
      );
  }, [published, query, onlyPromoted]);

  const update = async (v: AdminVenue, patch: VenueUpdate, message: string) => {
    setBusyId(v.id);
    await onUpdateVenue(v, patch, message);
    setBusyId(null);
  };

  return (
    <div className="flex flex-col gap-6">
      <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
        {(['events', 'specials'] as const).map((kind) => (
          <div key={kind} className="card p-5">
            <p className="eyebrow-sm">{kind === 'events' ? 'Events' : 'Food & drink specials'}</p>
            <div className="mt-3 grid grid-cols-4 gap-2">
              {summary(kind).map(([tier, count]) => (
                <div key={tier} className={`rounded-[14px] p-3 ${tierChipClass[tier]}`}>
                  <p className="text-[26px] font-bold leading-none">{count}</p>
                  <p className="mt-1.5 text-[11px] font-bold uppercase tracking-[0.08em]">{promotionTierLabels[tier]}</p>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>

      <TierRulesBox />

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <div className="relative flex-1">
          <Search size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-navy" />
          <input
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search venues…"
            className="h-10 w-full rounded-full border border-line bg-white pl-10 pr-4 text-[14px] text-navy outline-none focus:border-navy"
          />
        </div>
        <button className="chip h-10" data-active={onlyPromoted} onClick={() => setOnlyPromoted(!onlyPromoted)}>
          Only promoted venues
        </button>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full min-w-[760px] text-left text-[13px] text-navy">
          <thead>
            <tr className="border-b-[1.5px] border-navy text-[11px] font-medium uppercase tracking-[0.14em] text-ink-muted">
              <th className="px-2 pb-2.5 font-medium">Venue</th>
              <th className="px-2 pb-2.5 font-medium">Events tier</th>
              <th className="px-2 pb-2.5 font-medium">Specials tier</th>
              <th className="px-2 pb-2.5 font-medium">Major</th>
              <th className="px-2 pb-2.5 font-medium">Downtown</th>
              <th className="px-2 pb-2.5 font-medium">Upcoming</th>
              <th className="px-2 pb-2.5 font-medium">Hidden</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((v) => {
              const upcoming = upcomingByVenue.get(v.id) || [];
              const ev = upcoming.filter((e) => !e.categories.includes('food-deal')).length;
              const sp = upcoming.length - ev;
              const hidden = upcoming.filter((e) => e.hiddenFromPromotion).length;
              const open = expanded === v.id;
              const busy = busyId === v.id;
              return (
                <Fragment key={v.id}>
                  <tr className="border-b border-line">
                    <td className="px-2 py-2.5">
                      <button type="button" onClick={() => setExpanded(open ? null : v.id)} className="flex items-center gap-1.5 text-left font-bold hover:underline">
                        {open ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
                        {v.name}
                      </button>
                    </td>
                    <td className="px-2 py-2.5">
                      <TierSelect
                        value={venueTier(v, 'events')}
                        disabled={busy}
                        onChange={(t) => update(v, { eventPromotionTier: t }, `${v.name}: events now ${promotionTierLabels[t]}`)}
                      />
                    </td>
                    <td className="px-2 py-2.5">
                      <TierSelect
                        value={venueTier(v, 'specials')}
                        disabled={busy}
                        onChange={(t) => update(v, { specialPromotionTier: t }, `${v.name}: specials now ${promotionTierLabels[t]}`)}
                      />
                    </td>
                    <td className="px-2 py-2.5">
                      <button
                        type="button"
                        className="switch"
                        data-on={!!v.isMajor}
                        disabled={busy}
                        onClick={() => update(v, { isMajor: !v.isMajor }, v.isMajor ? `${v.name} is no longer a Major Venue` : `${v.name} is now a Major Venue`)}
                        aria-label={`Major Venue: ${v.name}`}
                      >
                        <span />
                      </button>
                    </td>
                    <td className="px-2 py-2.5">
                      <button
                        type="button"
                        className="switch"
                        data-on={isDowntown(v)}
                        disabled={busy}
                        onClick={() =>
                          update(v, { isDowntownDistrict: !v.isDowntownDistrict }, v.isDowntownDistrict ? `${v.name} removed from Downtown Kingston` : `${v.name} added to Downtown Kingston`)
                        }
                        aria-label={`Downtown Kingston: ${v.name}`}
                      >
                        <span />
                      </button>
                    </td>
                    <td className="px-2 py-2.5 text-ink-muted">
                      {ev} event{ev === 1 ? '' : 's'} · {sp} special{sp === 1 ? '' : 's'}
                    </td>
                    <td className="px-2 py-2.5">{hidden > 0 ? <span className="tag bg-[#eef1f5] text-ink-muted">{hidden} hidden</span> : <span className="text-ink-muted">—</span>}</td>
                  </tr>
                  {open && (
                    <tr className="border-b border-line bg-sky-soft/60">
                      <td colSpan={7} className="px-4 py-3">
                        <div className="mb-1 flex items-center justify-between">
                          <p className="eyebrow-sm">Upcoming at {v.name} — turn off to hide a listing from the venue&rsquo;s tier</p>
                          <Link href={`/admin/venues/${v.id}`} className="link-arrow">
                            Edit venue →
                          </Link>
                        </div>
                        <VenueListings listings={upcoming} showToast={showToast} onChanged={onListingsChanged} />
                      </td>
                    </tr>
                  )}
                </Fragment>
              );
            })}
          </tbody>
        </table>
        {rows.length === 0 && <p className="px-2 py-10 text-[14px] text-ink-muted">No venues match.</p>}
      </div>
    </div>
  );
}
