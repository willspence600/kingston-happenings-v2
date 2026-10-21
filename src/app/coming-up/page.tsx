'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { ArrowRight, Clock, Loader2, MapPin, Star } from 'lucide-react';
import { addDays, format, parseISO } from 'date-fns';
import { useEvents } from '@/contexts/EventsContext';
import { useAuth } from '@/contexts/AuthContext';
import type { Event, EventCategory } from '@/types/event';
import { listingTier } from '@/lib/promotion';
import {
  CategoryTag,
  DowntownTag,
  SaveButton,
  formatTime,
  formatTimeShort,
  isAllDayEvent,
  isDowntown,
  primaryCategory,
} from '@/components/brand';

type Filter = 'all' | 'festival' | 'concert' | 'market' | 'sports' | 'family' | 'downtown';

const filters: { id: Filter; label: string; categories?: EventCategory[] }[] = [
  { id: 'all', label: 'All' },
  { id: 'festival', label: 'Festivals', categories: ['festival'] },
  { id: 'concert', label: 'Concerts', categories: ['concert', 'live-music'] },
  { id: 'market', label: 'Markets', categories: ['market'] },
  { id: 'sports', label: 'Sports', categories: ['sports'] },
  { id: 'family', label: 'Family', categories: ['family'] },
  { id: 'downtown', label: 'Downtown Kingston' },
];

const WEEKDAYS = ['S', 'M', 'T', 'W', 'T', 'F', 'S'];
const WEEKDAY_NAMES = ['Sundays', 'Mondays', 'Tuesdays', 'Wednesdays', 'Thursdays', 'Fridays', 'Saturdays'];
// Display the week Monday-first, like the design
const WEEK_ORDER = [1, 2, 3, 4, 5, 6, 0];

// The next date (today included) that falls on the given weekday
function nextWeekdayDate(weekday: number) {
  const today = new Date();
  return format(addDays(today, (weekday - today.getDay() + 7) % 7), 'yyyy-MM-dd');
}

function timeRange(event: Event) {
  if (isAllDayEvent(event)) return 'All day';
  return event.endTime ? `${formatTime(event.startTime)} – ${formatTime(event.endTime)}` : formatTime(event.startTime);
}

function BigDateRow({ event, saved, onSave }: { event: Event; saved: boolean; onSave: () => void }) {
  const d = parseISO(event.date);
  const cat = primaryCategory(event);
  return (
    <div className="card group relative flex items-center gap-4 p-4 sm:gap-6 hover:border-navy/30">
      <Link href={`/events/${event.id}`} className="absolute inset-0 rounded-[22px]" aria-label={event.title} />
      <div className="flex h-[80px] w-[72px] sm:h-[96px] sm:w-[88px] shrink-0 flex-col items-center justify-center rounded-[16px] bg-sky text-navy pointer-events-none">
        <span className="text-[36px] sm:text-[44px] font-bold leading-none tracking-[-0.04em]">{format(d, 'd')}</span>
        <span className="text-[12px] font-bold uppercase tracking-[0.12em] text-ink-muted">{format(d, 'EEE')}</span>
      </div>
      <div className="flex min-w-0 flex-1 flex-col items-start gap-2 pointer-events-none">
        {cat ? <CategoryTag category={cat} /> : isDowntown(event.venue) && <DowntownTag />}
        <p className="max-w-full truncate text-[20px] sm:text-[22px] font-bold tracking-[-0.01em] text-navy group-hover:underline">
          {event.title}
        </p>
        <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-[14px] text-ink-muted">
          <span className="flex items-center gap-1.5">
            <MapPin size={14} className="text-link" />
            {event.venue?.name}
          </span>
          <span className="flex items-center gap-1.5">
            <Clock size={14} className="text-link" />
            {timeRange(event)}
          </span>
        </div>
        <p className="line-clamp-1 text-[14px] leading-[1.45] text-navy">{event.summary || event.description}</p>
      </div>
      <SaveButton saved={saved} onClick={onSave} variant="circle" size={18} className="relative z-10" />
    </div>
  );
}

function FeaturedBigDate({ event }: { event: Event }) {
  const d = parseISO(event.date);
  return (
    <div className="relative flex flex-col items-start gap-3.5 rounded-[28px] border-2 border-sun bg-navy p-6 sm:p-8 shadow-[0_0_32px_0_rgba(255,181,71,0.35)]">
      <div>
        <span className="tag bg-sun text-navy gap-1.5 pl-2.5 pr-3 py-1.5 tracking-[0.12em]">
          <Star size={12} className="fill-current" />
          Featured
        </span>
      </div>
      <p className="eyebrow-bold text-sun">
        {format(d, 'EEE, MMM d')}
        {!isAllDayEvent(event) && ` · ${formatTimeShort(event.startTime)}`}
      </p>
      <p className="max-w-[520px] text-[34px] sm:text-[44px] font-bold leading-none tracking-[-0.04em] text-white">
        {event.title}
      </p>
      <p className="text-[16px] leading-[1.5] text-on-dark-muted line-clamp-3">{event.summary || event.description}</p>
      <div className="flex w-full flex-wrap items-center justify-between gap-4 pt-1.5">
        {isDowntown(event.venue) ? (
          <DowntownTag />
        ) : (
          <span className="flex items-center gap-1.5 text-[13px] text-on-dark-muted">
            <MapPin size={13} className="text-sun" />
            {event.venue?.name}
          </span>
        )}
        <Link href={`/events/${event.id}`} className="btn-sun h-[46px] px-[22px]">
          View event →
        </Link>
      </div>
    </div>
  );
}

export default function ComingUpPage() {
  const { getUpcomingEvents, isLiked, toggleLike, isLoading } = useEvents();
  const { user } = useAuth();
  const router = useRouter();
  const [filter, setFilter] = useState<Filter>('all');
  const [weekday, setWeekday] = useState<number>(new Date().getDay());

  const upcoming = getUpcomingEvents();

  // Big dates are one-off events at Major Venues — recurring weekly listings live on Browse
  const bigDates = useMemo(() => {
    const active = filters.find((f) => f.id === filter);
    return upcoming
      .filter((e) => e.venue?.isMajor && !e.categories.includes('food-deal') && !e.isRecurring)
      .filter((e) => {
        if (filter === 'all') return true;
        if (filter === 'downtown') return isDowntown(e.venue);
        return e.categories.some((c) => active?.categories?.includes(c));
      })
      .sort((a, b) => a.date.localeCompare(b.date) || a.startTime.localeCompare(b.startTime));
  }, [upcoming, filter]);

  // A single featured slot: the soonest big date from a Featured-tier Major Venue
  const featured = bigDates.find((e) => listingTier(e) === 'featured');

  const byMonth = useMemo(() => {
    const map = new Map<string, Event[]>();
    bigDates
      .filter((e) => e.id !== featured?.id)
      .forEach((e) => {
        const key = e.date.slice(0, 7);
        if (!map.has(key)) map.set(key, []);
        map.get(key)!.push(e);
      });
    return [...map.entries()];
  }, [bigDates, featured]);

  // Weekly specials: recurring food & drink specials, one per series, for the chosen weekday
  const weeklySpecials = useMemo(() => {
    const seen = new Set<string>();
    return upcoming
      .filter((e) => e.categories.includes('food-deal') && e.isRecurring)
      .filter((e) => parseISO(e.date).getDay() === weekday)
      .filter((e) => {
        const key = e.seriesId || e.id;
        if (seen.has(key)) return false;
        seen.add(key);
        return true;
      })
      .slice(0, 4);
  }, [upcoming, weekday]);

  const handleSave = (id: string) => (user ? toggleLike(id) : router.push('/login'));

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center py-24">
        <Loader2 size={32} className="animate-spin text-navy" />
      </div>
    );
  }

  return (
    <div className="page-container pb-24 pt-10">
      <p className="eyebrow mb-3.5">— Coming up</p>
      <h1 className="display-section">
        Big dates
        <br />
        in Kingston
      </h1>
      <p className="mt-2.5 text-[16px] leading-[1.5] text-ink-muted">Some things to look forward to this {season()}...</p>

      <div className="mt-8 flex gap-2 overflow-x-auto no-scrollbar pb-1">
        {filters.map((f) => (
          <button key={f.id} className="chip h-10 px-[18px] text-[14px]" data-active={filter === f.id} onClick={() => setFilter(f.id)}>
            {f.label}
          </button>
        ))}
      </div>

      <div className="mt-6 flex flex-col gap-10 lg:flex-row">
        <div className="min-w-0 flex-1 flex flex-col gap-12">
          {featured && <FeaturedBigDate event={featured} />}

          {byMonth.length === 0 && !featured && (
            <div className="card p-8">
              <p className="text-[22px] font-bold text-navy">No big dates on the books yet.</p>
              <p className="mt-2 text-ink-muted">Check back soon, or browse what&rsquo;s on this week.</p>
              <Link href="/events" className="btn-outline mt-5">
                Browse events →
              </Link>
            </div>
          )}

          {byMonth.map(([month, items]) => (
            <section key={month}>
              <div className="border-b border-navy pb-3">
                <h2 className="text-[22px] font-bold tracking-[-0.01em] text-navy">
                  {format(parseISO(`${month}-01`), 'MMMM yyyy')}
                </h2>
              </div>
              <div className="mt-4 flex flex-col gap-4">
                {items.map((e) => (
                  <BigDateRow key={e.id} event={e} saved={isLiked(e.id)} onSave={() => handleSave(e.id)} />
                ))}
              </div>
            </section>
          ))}
        </div>

        <aside className="flex flex-col lg:w-[380px] lg:shrink-0 lg:sticky lg:top-24 self-start w-full">
          <div className="flex flex-col gap-4 rounded-[22px] bg-sky p-6">
            <p className="eyebrow-bold text-ink-muted">Weekly specials</p>
            <p className="text-[22px] font-bold tracking-[-0.01em] text-navy">Every week, on repeat</p>
            <div className="flex justify-between gap-1">
              {WEEK_ORDER.map((d) => (
                <button
                  key={d}
                  onClick={() => setWeekday(d)}
                  className={`flex h-[38px] w-[38px] items-center justify-center rounded-full text-[13px] font-bold transition-colors ${
                    weekday === d ? 'bg-navy text-white' : 'bg-white text-navy hover:bg-white/70'
                  }`}
                  aria-label={WEEKDAY_NAMES[d]}
                >
                  {WEEKDAYS[d]}
                </button>
              ))}
            </div>
            <p className="eyebrow-bold text-navy">{WEEKDAY_NAMES[weekday]}</p>
            <div>
              {weeklySpecials.length === 0 ? (
                <p className="py-4 text-[13px] text-ink-muted">No weekly specials listed for {WEEKDAY_NAMES[weekday]}.</p>
              ) : (
                weeklySpecials.map((s) => (
                  <Link key={s.id} href={`/events/${s.id}`} className="group block border-b border-navy/[0.12] py-3 last:border-b-0">
                    <p className="text-[18px] font-bold leading-[1.15] tracking-[-0.01em] text-navy group-hover:underline">{s.title}</p>
                    <p className="mt-1 flex flex-wrap items-baseline gap-x-3 text-[13px] text-ink-muted">
                      {s.venue?.name}
                      <span className="text-[12px] font-bold uppercase tracking-[0.08em] text-link">
                        {isAllDayEvent(s)
                          ? 'All day'
                          : s.endTime
                          ? `${formatTimeShort(s.startTime)} – ${formatTimeShort(s.endTime)}`
                          : `From ${formatTimeShort(s.startTime)}`}
                      </span>
                    </p>
                  </Link>
                ))
              )}
            </div>
            <Link
              href={`/events?tab=deals&date=${nextWeekdayDate(weekday)}`}
              className="inline-flex items-center gap-1.5 self-start text-[14px] font-bold text-navy hover:underline"
            >
              All specials
              <ArrowRight size={16} />
            </Link>
          </div>
        </aside>
      </div>
    </div>
  );
}

function season() {
  const m = new Date().getMonth();
  if (m >= 2 && m <= 4) return 'spring';
  if (m >= 5 && m <= 7) return 'summer';
  if (m >= 8 && m <= 10) return 'fall';
  return 'winter';
}
