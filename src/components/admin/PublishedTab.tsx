'use client';

import { useMemo, useState } from 'react';
import { addDays, format, getDay, parseISO } from 'date-fns';
import { Calendar, Check, ChevronDown, EyeOff, Loader2, Repeat, Search, Utensils, X } from 'lucide-react';
import type { Event, EventCategory } from '@/types/event';
import { categoryLabels, eventCategoryOptions } from '@/constants/categories';
import { DatePicker } from '@/components';
import { formatTime, isAllDayEvent } from '@/components/brand';
import { formatPrice } from '@/utils/price';
import { listingTier, promotionTierLabels } from '@/lib/promotion';
import ListingModal from './ListingModal';
import { isSpecialListing } from './ListingEditor';
import { tierChipClass } from './PromotionTiers';
import type { AdminVenue, ShowToast } from './types';

type Kind = 'events' | 'specials';
type DateWindow = 'upcoming' | 'today' | 'week' | 'past' | 'range' | 'all';
type Repeats = 'all' | 'one-time' | 'recurring';

const PAGE = 60;

// Monday-first, matching date-fns getDay() numbering (0 = Sunday)
const WEEKDAYS: [number, string][] = [
  [1, 'Mon'],
  [2, 'Tue'],
  [3, 'Wed'],
  [4, 'Thu'],
  [5, 'Fri'],
  [6, 'Sat'],
  [0, 'Sun'],
];

const SPECIAL_FILTERS: { id: string; label: string; match: (e: Event) => boolean }[] = [
  { id: 'food', label: 'Food', match: (e) => e.categories.includes('food') },
  { id: 'drink', label: 'Drinks', match: (e) => e.categories.includes('drink') },
  { id: 'happy-hour', label: 'Happy Hour', match: (e) => e.categories.includes('happy-hour') },
];

function VenueFilter({ venues, selected, onChange }: { venues: AdminVenue[]; selected: string[]; onChange: (ids: string[]) => void }) {
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState('');
  const shown = venues.filter((v) => v.name.toLowerCase().includes(q.toLowerCase()));
  return (
    <div className="relative">
      <button className="chip h-10 gap-2" data-active={selected.length > 0} onClick={() => setOpen(!open)}>
        {selected.length === 0 ? 'All venues' : selected.length === 1 ? venues.find((v) => v.id === selected[0])?.name : `${selected.length} venues`}
        <ChevronDown size={14} />
      </button>
      {open && (
        <>
          <div className="fixed inset-0 z-10" onClick={() => setOpen(false)} />
          <div className="absolute left-0 top-full z-20 mt-2 w-72 rounded-[14px] border border-line bg-white p-3 shadow-lg">
            <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Find a venue…" className="field h-10 text-[13px]" autoFocus />
            <div className="mt-2 max-h-64 overflow-y-auto">
              {shown.map((v) => {
                const on = selected.includes(v.id);
                return (
                  <label key={v.id} className="flex items-center gap-2.5 rounded-[8px] px-2 py-1.5 text-[13px] text-navy hover:bg-sky-soft">
                    <input
                      type="checkbox"
                      checked={on}
                      onChange={() => onChange(on ? selected.filter((id) => id !== v.id) : [...selected, v.id])}
                      className="h-4 w-4 accent-navy"
                    />
                    <span className="truncate">{v.name}</span>
                  </label>
                );
              })}
            </div>
            {selected.length > 0 && (
              <button className="link-arrow mt-2" onClick={() => onChange([])}>
                Clear venues
              </button>
            )}
          </div>
        </>
      )}
    </div>
  );
}

export default function PublishedTab({
  listings,
  venues,
  loading,
  showToast,
  onChanged,
}: {
  listings: Event[];
  venues: AdminVenue[];
  loading: boolean;
  showToast: ShowToast;
  onChanged: () => Promise<void>;
}) {
  const [kind, setKind] = useState<Kind>('events');
  const [query, setQuery] = useState('');
  const [venueIds, setVenueIds] = useState<string[]>([]);
  const [category, setCategory] = useState<string>('');
  const [dateWindow, setDateWindow] = useState<DateWindow>('upcoming');
  const [rangeFrom, setRangeFrom] = useState('');
  const [rangeTo, setRangeTo] = useState('');
  const [repeats, setRepeats] = useState<Repeats>('all');
  const [onePerSeries, setOnePerSeries] = useState(false);
  const [showCancelled, setShowCancelled] = useState(true);
  const [weekdays, setWeekdays] = useState<number[]>([]);
  const [limit, setLimit] = useState(PAGE);
  const [openEvent, setOpenEvent] = useState<Event | null>(null);

  const today = format(new Date(), 'yyyy-MM-dd');
  const weekEnd = format(addDays(new Date(), 6), 'yyyy-MM-dd');
  const venueOptions = useMemo(() => venues.filter((v) => v.status !== 'pending').sort((a, b) => a.name.localeCompare(b.name)), [venues]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    const list = listings
      .filter((e) => e.status === 'approved' || (showCancelled && e.status === 'cancelled'))
      .filter((e) => (kind === 'specials') === isSpecialListing(e))
      .filter((e) => !q || e.title.toLowerCase().includes(q) || e.venue.name.toLowerCase().includes(q) || e.description.toLowerCase().includes(q))
      .filter((e) => venueIds.length === 0 || venueIds.includes(e.venue.id))
      .filter((e) => {
        if (!category) return true;
        if (kind === 'specials') return SPECIAL_FILTERS.find((f) => f.id === category)?.match(e) ?? true;
        return e.categories.includes(category as EventCategory);
      })
      .filter((e) => weekdays.length === 0 || weekdays.includes(getDay(parseISO(e.date))))
      .filter((e) => (repeats === 'all' ? true : repeats === 'recurring' ? !!e.isRecurring : !e.isRecurring))
      .filter((e) => {
        switch (dateWindow) {
          case 'upcoming':
            return e.date >= today;
          case 'today':
            return e.date === today;
          case 'week':
            return e.date >= today && e.date <= weekEnd;
          case 'past':
            return e.date < today;
          case 'range':
            return (!rangeFrom || e.date >= rangeFrom) && (!rangeTo || e.date <= rangeTo);
          default:
            return true;
        }
      })
      .sort((a, b) =>
        dateWindow === 'past'
          ? b.date.localeCompare(a.date) || a.startTime.localeCompare(b.startTime)
          : a.date.localeCompare(b.date) || a.startTime.localeCompare(b.startTime)
      );

    if (!onePerSeries) return list;
    const seen = new Set<string>();
    return list.filter((e) => {
      if (!e.seriesId) return true;
      if (seen.has(e.seriesId)) return false;
      seen.add(e.seriesId);
      return true;
    });
  }, [listings, kind, query, venueIds, category, repeats, dateWindow, rangeFrom, rangeTo, onePerSeries, showCancelled, weekdays, today, weekEnd]);

  const byDate = useMemo(() => {
    const map = new Map<string, Event[]>();
    filtered.slice(0, limit).forEach((e) => {
      if (!map.has(e.date)) map.set(e.date, []);
      map.get(e.date)!.push(e);
    });
    return [...map.entries()];
  }, [filtered, limit]);

  const resetPage = () => setLimit(PAGE);
  const anyFilter = query || venueIds.length || category || weekdays.length || repeats !== 'all' || dateWindow !== 'upcoming';

  return (
    <div>
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div className="segmented">
          <button className="segmented-item gap-2" data-active={kind === 'events'} onClick={() => { setKind('events'); setCategory(''); resetPage(); }}>
            <Calendar size={14} /> Events
          </button>
          <button className="segmented-item gap-2" data-active={kind === 'specials'} onClick={() => { setKind('specials'); setCategory(''); resetPage(); }}>
            <Utensils size={14} /> Specials
          </button>
        </div>
        <div className="relative w-full lg:w-[340px]">
          <Search size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-navy" />
          <input
            type="search"
            value={query}
            onChange={(e) => { setQuery(e.target.value); resetPage(); }}
            placeholder={`Search ${kind}, venues…`}
            className="h-11 w-full rounded-full border border-line bg-white pl-10 pr-4 text-[14px] text-navy outline-none focus:border-navy"
          />
        </div>
      </div>

      {/* Filters */}
      <div className="mt-5 flex flex-col gap-3 rounded-[18px] bg-sky-soft p-4">
        <div className="flex flex-wrap items-center gap-2">
          <span className="w-14 text-[12px] font-bold uppercase tracking-[0.1em] text-ink-muted">Date</span>
          {(
            [
              ['upcoming', 'Upcoming'],
              ['today', 'Today'],
              ['week', 'Next 7 days'],
              ['past', 'Past'],
              ['all', 'All dates'],
              ['range', 'Date range'],
            ] as [DateWindow, string][]
          ).map(([id, label]) => (
            <button key={id} className="chip h-9" data-active={dateWindow === id} onClick={() => { setDateWindow(id); resetPage(); }}>
              {label}
            </button>
          ))}
          {dateWindow === 'range' && (
            <div className="flex items-center gap-2">
              <div className="w-[150px]">
                <DatePicker value={rangeFrom} onChange={(v) => { setRangeFrom(v); resetPage(); }} placeholder="From" className="text-sm" />
              </div>
              <div className="w-[150px]">
                <DatePicker value={rangeTo} onChange={(v) => { setRangeTo(v); resetPage(); }} placeholder="To" min={rangeFrom} className="text-sm" />
              </div>
            </div>
          )}
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <span className="w-14 text-[12px] font-bold uppercase tracking-[0.1em] text-ink-muted">Day</span>
          <button className="chip h-9" data-active={weekdays.length === 0} onClick={() => { setWeekdays([]); resetPage(); }}>
            Any day
          </button>
          {WEEKDAYS.map(([day, label]) => {
            const on = weekdays.includes(day);
            return (
              <button
                key={day}
                className="chip h-9"
                data-active={on}
                aria-pressed={on}
                onClick={() => { setWeekdays(on ? weekdays.filter((d) => d !== day) : [...weekdays, day]); resetPage(); }}
              >
                {label}
              </button>
            );
          })}
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <span className="w-14 text-[12px] font-bold uppercase tracking-[0.1em] text-ink-muted">Filter</span>
          <VenueFilter venues={venueOptions} selected={venueIds} onChange={(ids) => { setVenueIds(ids); resetPage(); }} />
          <select
            value={category}
            onChange={(e) => { setCategory(e.target.value); resetPage(); }}
            className="h-10 rounded-full border border-line bg-white px-4 text-[13px] font-medium text-navy outline-none focus:border-navy"
          >
            <option value="">All {kind === 'events' ? 'categories' : 'types'}</option>
            {kind === 'events'
              ? eventCategoryOptions.map((c) => (
                  <option key={c} value={c}>
                    {categoryLabels[c]}
                  </option>
                ))
              : SPECIAL_FILTERS.map((f) => (
                  <option key={f.id} value={f.id}>
                    {f.label}
                  </option>
                ))}
          </select>
          <select
            value={repeats}
            onChange={(e) => { setRepeats(e.target.value as Repeats); resetPage(); }}
            className="h-10 rounded-full border border-line bg-white px-4 text-[13px] font-medium text-navy outline-none focus:border-navy"
          >
            <option value="all">One-time &amp; recurring</option>
            <option value="one-time">One-time only</option>
            <option value="recurring">Recurring only</option>
          </select>
          <button className="chip h-10" data-active={onePerSeries} onClick={() => { setOnePerSeries(!onePerSeries); resetPage(); }}>
            <Repeat size={13} /> One row per series
          </button>
          <button className="chip h-10" data-active={showCancelled} onClick={() => setShowCancelled(!showCancelled)}>
            {showCancelled && <Check size={13} />} Show cancelled
          </button>
          {anyFilter ? (
            <button
              className="link-arrow ml-1"
              onClick={() => {
                setQuery('');
                setVenueIds([]);
                setCategory('');
                setWeekdays([]);
                setRepeats('all');
                setDateWindow('upcoming');
                resetPage();
              }}
            >
              <X size={12} /> Reset
            </button>
          ) : null}
        </div>
      </div>

      <p className="mt-5 text-[12px] text-ink-muted">
        {filtered.length} {kind === 'events' ? 'event' : 'special'}
        {filtered.length === 1 ? '' : 's'} · click a row to view and edit
      </p>

      {loading ? (
        <div className="flex justify-center py-16">
          <Loader2 size={28} className="animate-spin text-navy" />
        </div>
      ) : filtered.length === 0 ? (
        <div className="mt-4 rounded-[22px] bg-sky-soft px-6 py-14 text-center">
          <p className="text-[20px] font-bold text-navy">Nothing matches</p>
          <p className="mt-1 text-[14px] text-ink-muted">Try a different date window or clear the filters.</p>
        </div>
      ) : (
        <div className="mt-2">
          {byDate.map(([date, items]) => (
            <div key={date}>
              <p className="sticky top-16 z-[1] mt-6 border-b-[1.5px] border-navy bg-white pb-2 pt-2 text-[15px] font-bold text-navy">
                {format(parseISO(date), 'EEEE, MMMM d, yyyy')}
                {date === today && <span className="tag ml-2 bg-sun text-navy">Today</span>}
              </p>
              {items.map((e) => {
                const tier = listingTier(e);
                const cat = e.categories.find((c) => eventCategoryOptions.includes(c));
                return (
                  <button
                    key={e.id}
                    type="button"
                    onClick={() => setOpenEvent(e)}
                    className="group grid w-full grid-cols-[72px_1fr] items-center gap-4 border-b border-line px-2 py-3 text-left hover:bg-sky-soft sm:grid-cols-[88px_1fr_auto]"
                  >
                    <span className="text-[13px] font-medium text-navy">
                      {isAllDayEvent(e) ? 'All day' : formatTime(e.startTime)}
                      {!isAllDayEvent(e) && e.endTime && <span className="block text-[12px] font-normal text-ink-muted">– {formatTime(e.endTime)}</span>}
                    </span>
                    <span className="min-w-0">
                      <span className="flex items-center gap-2">
                        <span className="truncate text-[15px] font-bold text-navy group-hover:underline">{e.title}</span>
                        {e.isRecurring && <Repeat size={12} className="shrink-0 text-link" aria-label="Recurring" />}
                        {e.status === 'cancelled' && <span className="tag bg-danger text-white">Cancelled</span>}
                      </span>
                      <span className="mt-0.5 block truncate text-[12px] text-ink-muted">
                        {e.venue.name}
                        {kind === 'events' && cat ? ` · ${categoryLabels[cat]}` : ''}
                        {kind === 'specials' ? ` · ${SPECIAL_FILTERS.filter((f) => f.match(e)).map((f) => f.label).join(' & ') || 'Special'}` : ''}
                        {e.price ? ` · ${formatPrice(e.price)}` : ''}
                      </span>
                    </span>
                    <span className="col-span-2 flex items-center gap-1.5 sm:col-span-1 sm:justify-end">
                      {e.hiddenFromPromotion && (
                        <span className="tag bg-[#eef1f5] text-ink-muted" title="Hidden from promotion">
                          <EyeOff size={11} /> Hidden
                        </span>
                      )}
                      {tier !== 'standard' && <span className={`tag ${tierChipClass[tier]}`}>{promotionTierLabels[tier]}</span>}
                    </span>
                  </button>
                );
              })}
            </div>
          ))}
          {filtered.length > limit && (
            <button className="btn-ghost mt-6 w-full" onClick={() => setLimit(limit + PAGE)}>
              Show more ({filtered.length - limit} left)
            </button>
          )}
        </div>
      )}

      {openEvent && (
        <ListingModal
          event={listings.find((l) => l.id === openEvent.id) ?? openEvent}
          venues={venueOptions}
          onClose={() => setOpenEvent(null)}
          onMessage={showToast}
          onChanged={onChanged}
        />
      )}
    </div>
  );
}
