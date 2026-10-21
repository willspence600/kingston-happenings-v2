'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';
import { ChevronDown, ChevronRight, Loader2, Search } from 'lucide-react';
import { addDays, format } from 'date-fns';
import { useEvents } from '@/contexts/EventsContext';
import { isDowntown } from '@/components/brand';

const AVATAR_COLORS = ['bg-[#c4582b]', 'bg-navy', 'bg-[#3e7ca6]', 'bg-[#2f7a55]', 'bg-[#c4452b]', 'bg-[#b07a12]'];

/** Figma "DK logo" badge marking Downtown Kingston business-district venues */
function DKBadge({ size = 22 }: { size?: number }) {
  // eslint-disable-next-line @next/next/no-img-element
  return <img src="/dk-badge.svg" alt="Downtown Kingston" width={size} height={size} className="shrink-0" />;
}

function avatarColor(name: string) {
  let hash = 0;
  for (let i = 0; i < name.length; i++) hash = (hash * 31 + name.charCodeAt(i)) >>> 0;
  return AVATAR_COLORS[hash % AVATAR_COLORS.length];
}

type SortMode = 'az' | 'za' | 'busiest';

export default function VenuesPage() {
  const { venues, events, isLoading } = useEvents();
  const [searchQuery, setSearchQuery] = useState('');
  // 'all' or 'downtown' (Downtown Kingston district)
  const [neighborhood, setNeighborhood] = useState<string>('all');
  const [sort, setSort] = useState<SortMode>('az');
  const [showSort, setShowSort] = useState(false);

  // This-week counts per venue (events vs specials, recurring series counted once)
  const weekCounts = useMemo(() => {
    const today = format(new Date(), 'yyyy-MM-dd');
    const end = format(addDays(new Date(), 6), 'yyyy-MM-dd');
    const counts: Record<string, { events: Set<string>; specials: Set<string> }> = {};
    events.forEach((e) => {
      if (e.date < today || e.date > end || !e.venue?.id) return;
      const c = (counts[e.venue.id] ??= { events: new Set(), specials: new Set() });
      const key = e.seriesId || e.id;
      if (e.categories.includes('food-deal')) c.specials.add(key);
      else c.events.add(key);
    });
    return counts;
  }, [events]);

  const filtered = useMemo(() => {
    const q = searchQuery.toLowerCase();
    const list = venues.filter((v) => {
      if (q && !(v.name.toLowerCase().includes(q) || v.address.toLowerCase().includes(q) || v.neighborhood?.toLowerCase().includes(q)))
        return false;
      if (neighborhood === 'downtown') return isDowntown(v);
      return true;
    });
    const total = (id: string) => (weekCounts[id]?.events.size ?? 0) + (weekCounts[id]?.specials.size ?? 0);
    const key = (name: string) => name.replace(/^the\s+/i, '');
    return list.sort((a, b) =>
      sort === 'busiest'
        ? total(b.id) - total(a.id) || key(a.name).localeCompare(key(b.name))
        : sort === 'za'
        ? key(b.name).localeCompare(key(a.name))
        : key(a.name).localeCompare(key(b.name))
    );
  }, [venues, searchQuery, neighborhood, sort, weekCounts]);

  const grouped = useMemo(() => {
    if (sort === 'busiest') return [['', filtered]] as [string, typeof filtered][];
    const map = new Map<string, typeof filtered>();
    filtered.forEach((v) => {
      const letter = v.name.replace(/^the\s+/i, '').charAt(0).toUpperCase();
      const key = /[A-Z]/.test(letter) ? letter : '#';
      if (!map.has(key)) map.set(key, []);
      map.get(key)!.push(v);
    });
    return [...map.entries()];
  }, [filtered, sort]);

  const weekLabel = (id: string) => {
    const c = weekCounts[id];
    const ev = c?.events.size ?? 0;
    const sp = c?.specials.size ?? 0;
    const parts = [];
    if (ev) parts.push(`${ev} event${ev === 1 ? '' : 's'}`);
    if (sp) parts.push(`${sp} special${sp === 1 ? '' : 's'}`);
    return parts.join(' · ') || '—';
  };

  const sortLabels: Record<SortMode, string> = { az: 'Sort: A–Z', za: 'Sort: Z–A', busiest: 'Sort: Busiest' };

  return (
    <div className="page-container pb-24 pt-10">
      <p className="eyebrow mb-3.5">— Venues</p>
      <div className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
        <h1 className="display-section">
          Kingston&rsquo;s
          <br />
          venues
        </h1>
        <div className="relative w-full lg:w-[360px]">
          <Search size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-navy" />
          <input
            type="text"
            placeholder="Search venues..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="h-[46px] w-full rounded-full border border-line bg-white pl-11 pr-4 text-[16px] text-navy placeholder:text-ink-muted outline-none focus:border-navy"
          />
        </div>
      </div>

      <div className="mt-[54px] flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex gap-2 overflow-x-auto no-scrollbar pb-1">
          <button className="chip h-10 px-[18px] text-[14px] border-[1.5px]" data-active={neighborhood === 'all'} onClick={() => setNeighborhood('all')}>
            All
          </button>
          <button
            className="chip h-10 gap-2 py-2 pl-2 pr-3.5"
            data-active={neighborhood === 'downtown'}
            aria-pressed={neighborhood === 'downtown'}
            onClick={() => setNeighborhood(neighborhood === 'downtown' ? 'all' : 'downtown')}
          >
            <DKBadge size={24} />
            Downtown Kingston
          </button>
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

      {isLoading ? (
        <div className="flex justify-center py-24">
          <Loader2 size={32} className="animate-spin text-navy" />
        </div>
      ) : (
        <div className="mt-[34px]">
          <div className="hidden grid-cols-[1fr_200px_20px] gap-6 border-b-[1.5px] border-navy px-2 pt-3.5 pb-2.5 text-[12px] font-medium uppercase tracking-[0.16em] text-[#6d7682] md:grid">
            <span>Venue</span>
            <span>This week</span>
            <span />
          </div>

          {grouped.map(([letter, list]) => (
            <div key={letter || 'all'}>
              {letter && <p className="px-2 pt-[26px] pb-1.5 text-[22px] font-bold tracking-[-0.01em] text-navy">{letter}</p>}
              {list.map((v) => (
                <Link
                  key={v.id}
                  href={`/venues/${v.id}`}
                  className="group grid grid-cols-[1fr_20px] items-center gap-6 border-b border-[#eceff3] px-2 py-3.5 md:grid-cols-[1fr_200px_20px]"
                >
                  <span className="flex min-w-0 items-center gap-4">
                    <span
                      className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-[12px] text-[18px] font-bold tracking-[-0.01em] text-white ${avatarColor(v.name)}`}
                    >
                      {v.name.replace(/^the\s+/i, '').charAt(0).toUpperCase()}
                    </span>
                    <span className="min-w-0">
                      <span className="flex items-center gap-2">
                        <span className="truncate text-[16px] font-bold text-navy group-hover:underline">{v.name}</span>
                        {isDowntown(v) && <DKBadge />}
                      </span>
                      <span className="mt-[3px] block truncate text-[13px] text-[#6d7682]">{v.address}</span>
                    </span>
                  </span>
                  <span className="hidden text-[14px] text-ink-muted md:block">{weekLabel(v.id)}</span>
                  <ChevronRight size={18} className="text-navy" />
                </Link>
              ))}
            </div>
          ))}

          {filtered.length === 0 && (
            <div className="rounded-[22px] bg-sky-soft px-6 py-14 text-center">
              <p className="text-[22px] font-bold text-navy">No venues found</p>
              <p className="mt-2 text-[14px] text-ink-muted">Try a different search or filter.</p>
            </div>
          )}
        </div>
      )}

      <div className="mt-3.5 flex flex-col gap-4 rounded-[22px] bg-[#f3f8fc] px-7 py-6 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-[18px] font-bold leading-[1.15] tracking-[-0.01em] text-navy">Run a venue?</p>
          <p className="mt-1 text-[14px] leading-[1.45] text-ink-muted">Add it once and post events and specials without retyping your details.</p>
        </div>
        <Link href="/become-organizer" className="btn-sun self-start sm:self-auto">
          Become an organizer →
        </Link>
      </div>
    </div>
  );
}
