'use client';

import { useState, useMemo, Suspense, useRef, useEffect, type ReactNode } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  Search,
  X,
  Calendar,
  Loader2,
  ChevronDown,
  ListFilter,
  SlidersHorizontal,
  Music,
  PartyPopper,
  Ticket,
  Sun,
  Trophy,
  Star,
  Store,
  Pencil,
  Users,
  Wine,
  Check,
  Utensils,
  Smile,
} from 'lucide-react';
import { format, parseISO, addDays, startOfDay, isWithinInterval, isToday, isTomorrow, subDays, subMonths } from 'date-fns';
import { DatePicker, Toast } from '@/components';
import { useEvents } from '@/contexts/EventsContext';
import { useAuth } from '@/contexts/AuthContext';
import type { Event, EventCategory } from '@/types/event';
import { categoryLabels, categoryDotColors } from '@/constants/categories';
import { formatPrice, isFreePrice } from '@/utils/price';
import { getRecurrenceLabel } from '@/utils/recurrenceLabel';
import { listingPriority } from '@/lib/promotion';
import { SaveButton, formatTime, formatTimeShort, isAllDayEvent, isDowntown, primaryCategory } from '@/components/brand';

type TabType = 'all' | 'events' | 'deals';
type DateWindow =
  | { kind: 'day'; date: string }
  | { kind: 'week' }
  | { kind: 'upcoming' }
  | { kind: 'range'; start: string; end: string };
type PastRange = 'none' | 'week' | 'month' | '3months';
type SpecialFilter = 'all' | 'food' | 'drink' | 'now' | 'happy' | 'downtown';

const DOWNTOWN = 'downtown' as const;
type RailFilter = EventCategory | typeof DOWNTOWN;

function DowntownKingstonIcon() {
  return (
    <svg width="32" height="32" viewBox="0 0 32 32" fill="none" aria-hidden="true">
      <path
        fillRule="evenodd"
        clipRule="evenodd"
        fill="white"
        d="M8.58538 7.07761C8.47788 7.12779 8.30873 7.28044 8.2095 7.41691C8.04587 7.64204 8.02714 7.72182 8.00747 8.27849C7.98755 8.84147 7.99908 8.91586 8.14748 9.18183C8.33191 9.51212 8.71693 9.74731 9.07332 9.74731C9.36969 9.74731 9.70171 9.99026 9.79537 10.2758C9.84617 10.4307 9.87123 11.1104 9.87368 12.3975L9.87718 14.2914L10.0268 14.4484C10.1091 14.5349 10.2768 14.6253 10.3995 14.6494C10.7793 14.7243 12.2263 14.6578 12.338 14.5605C12.3926 14.5128 12.9015 13.4918 13.469 12.2915C14.0363 11.0911 14.5899 9.98066 14.6991 9.8238C15.0184 9.3648 15.412 9.21294 16.3899 9.17124C17.3424 9.13073 17.6092 9.17367 17.8086 9.39953C17.9521 9.56204 17.9584 9.60907 17.9584 10.5096C17.9584 11.3971 17.9503 11.4599 17.8138 11.6265C17.6993 11.7663 17.5982 11.8099 17.3283 11.8358C17.1408 11.8538 16.9494 11.9005 16.9029 11.9395C16.8565 11.9785 16.438 12.8108 15.9729 13.7891C15.5068 14.7696 15.0402 15.6639 14.9332 15.7816L14.739 15.9954L14.9332 16.2091C15.0408 16.3276 15.5101 17.229 15.986 18.2315C16.4583 19.2263 16.8562 20.0531 16.8703 20.0689C16.8844 20.0846 17.071 20.1192 17.285 20.1457C17.5951 20.1841 17.7031 20.2292 17.8163 20.3673C17.9497 20.5302 17.9584 20.5985 17.9584 21.4818C17.9584 22.4087 17.956 22.4255 17.7948 22.5946C17.5779 22.8224 17.3423 22.8601 16.3899 22.8195C15.4133 22.7779 15.0199 22.6263 14.6969 22.167C14.5866 22.0101 14.0394 20.9051 13.4809 19.7114C12.9223 18.5176 12.4154 17.4976 12.3544 17.4445C12.2737 17.3743 12.024 17.3408 11.4382 17.3217C10.487 17.2906 10.2281 17.331 10.0268 17.5424L9.87718 17.6994L9.87368 19.5933C9.87123 20.8826 9.84624 21.5586 9.79537 21.7111C9.69407 22.0147 9.47694 22.1674 9.04093 22.2418C8.57172 22.322 8.31556 22.482 8.13677 22.8062C8.01048 23.0353 7.99582 23.1393 8.01148 23.6957C8.02739 24.2636 8.04581 24.3488 8.19791 24.5579C8.54434 25.0343 8.34162 25.0156 12.8694 24.9885C16.8029 24.9649 16.9436 24.9597 17.5512 24.8162C21.0337 23.9939 23.1123 21.8233 23.8569 18.2315C23.9837 17.6196 24 17.3614 24 15.9625C24 14.5748 23.9831 14.303 23.8605 13.714C23.4871 11.9204 22.8173 10.5686 21.7483 9.45135C20.6469 8.30013 19.3555 7.59942 17.5512 7.17422C16.9426 7.03078 16.8086 7.02598 12.8528 7.00651C9.48596 6.98987 8.74706 7.00224 8.58538 7.07761ZM20.616 20.3626C21.0534 20.6317 21.2904 21.2486 21.1568 21.7696C20.9305 22.652 19.8327 22.9979 19.1913 22.389C18.805 22.0222 18.7019 21.2941 18.9663 20.8002C19.2768 20.2203 20.051 20.0149 20.616 20.3626Z"
      />
    </svg>
  );
}

const railCategories: { id: RailFilter; label: string; tile: string; icon: ReactNode }[] = [
  { id: DOWNTOWN, label: 'Downtown Kingston', tile: 'bg-[#ee364d]', icon: <DowntownKingstonIcon /> },
  { id: 'live-music', label: categoryLabels['live-music'], tile: 'bg-[#ff6b4a] text-white', icon: <Music size={17} /> },
  { id: 'activity-nights', label: categoryLabels['activity-nights'], tile: 'bg-[#1b2a41] text-white', icon: <PartyPopper size={17} /> },
  { id: 'concert', label: categoryLabels.concert, tile: 'bg-[#3e8ed0] text-white', icon: <Ticket size={17} /> },
  { id: 'daytime', label: categoryLabels.daytime, tile: 'bg-[#ffb547] text-[#1b2a41]', icon: <Sun size={17} /> },
  { id: 'sports', label: categoryLabels.sports, tile: 'bg-[#3e7ca6] text-white', icon: <Trophy size={17} /> },
  { id: 'theatre', label: categoryLabels.theatre, tile: 'bg-[#ffe1da] text-[#b3412a]', icon: <Star size={17} /> },
  { id: 'market', label: categoryLabels.market, tile: 'bg-[#fff1d6] text-[#8a5a00]', icon: <Store size={17} /> },
  { id: 'workshop', label: categoryLabels.workshop, tile: 'bg-[#ddebf7] text-[#1f5f94]', icon: <Pencil size={17} /> },
  { id: 'family', label: categoryLabels.family, tile: 'bg-[#ffe8d6] text-[#a84a12]', icon: <Users size={17} /> },
  { id: '19plus', label: categoryLabels['19plus'], tile: 'bg-[#c4452b] text-white', icon: <Wine size={17} /> },
];

const popularCategories: { label: string; category?: EventCategory; tab?: TabType }[] = [
  { label: 'Live music', category: 'live-music' },
  { label: 'Trivia', category: 'trivia' },
  { label: 'Activity nights', category: 'activity-nights' },
  { label: 'Food & drink', tab: 'deals' },
  { label: 'Family', category: 'family' },
  { label: 'Markets', category: 'market' },
];

/* ---------------- helpers ---------------- */

function matchesQuery(event: Event, query: string) {
  if (!query) return true;
  const q = query.toLowerCase();
  return (
    event.title.toLowerCase().includes(q) ||
    event.description.toLowerCase().includes(q) ||
    event.summary?.toLowerCase().includes(q) ||
    event.venue.name.toLowerCase().includes(q)
  );
}

function bandFor(event: Event): string {
  if (isAllDayEvent(event)) return 'All day';
  const hour = parseInt(event.startTime.slice(0, 2), 10);
  if (hour < 12) return 'Morning';
  if (hour < 17) return 'Afternoon';
  if (hour < 22) return 'Evening';
  return 'Late night';
}
const BAND_ORDER = ['All day', 'Morning', 'Afternoon', 'Evening', 'Late night'];

function specialBand(event: Event): string {
  if (isAllDayEvent(event)) return 'All day';
  const startHour = parseInt(event.startTime.slice(0, 2), 10);
  const endHour = event.endTime ? parseInt(event.endTime.slice(0, 2), 10) : 24;
  if (startHour < 17 && endHour <= 21 && endHour > 0) return 'Happy hour';
  return 'Evening';
}
const SPECIAL_BAND_ORDER = ['All day', 'Happy hour', 'Evening'];

function isOnNow(event: Event) {
  const todayStr = format(new Date(), 'yyyy-MM-dd');
  if (event.date !== todayStr) return false;
  if (isAllDayEvent(event)) return true;
  const now = format(new Date(), 'HH:mm');
  const end = event.endTime && event.endTime > event.startTime ? event.endTime : '23:59';
  return event.startTime <= now && now <= end;
}

function isHappyHour(event: Event) {
  return event.categories.includes('happy-hour') || specialBand(event) === 'Happy hour';
}

function specialKind(event: Event): 'food' | 'drink' | 'happy' {
  if (isHappyHour(event)) return 'happy';
  if (event.categories.includes('drink') && !event.categories.includes('food')) return 'drink';
  return 'food';
}

function groupBy<T>(items: T[], key: (item: T) => string, order?: string[]): [string, T[]][] {
  const map = new Map<string, T[]>();
  items.forEach((item) => {
    const k = key(item);
    if (!map.has(k)) map.set(k, []);
    map.get(k)!.push(item);
  });
  const entries = [...map.entries()];
  if (order) entries.sort(([a], [b]) => order.indexOf(a) - order.indexOf(b));
  else entries.sort(([a], [b]) => a.localeCompare(b));
  return entries;
}

function happeningTitle(dateStr: string) {
  const d = parseISO(dateStr);
  if (isToday(d)) return 'Happening Today';
  if (isTomorrow(d)) return 'Happening Tomorrow';
  return `Happening ${format(d, 'EEEE')}`;
}

function dayLabel(dateStr: string) {
  const d = parseISO(dateStr);
  if (isToday(d)) return `Today · ${format(d, 'EEEE, MMMM d')}`;
  if (isTomorrow(d)) return `Tomorrow · ${format(d, 'EEEE, MMMM d')}`;
  return format(d, 'EEEE, MMMM d');
}

/* ---------------- small UI pieces ---------------- */

function Band({ label }: { label: string }) {
  return <p className="pt-7 pb-1.5 text-[12px] font-medium uppercase tracking-[0.16em] text-ink-subtle">{label}</p>;
}

function DayHeader({ date, className = '' }: { date: string; className?: string }) {
  return (
    <div className={`flex flex-col gap-[7px] ${className}`}>
      <p className="text-[12px] font-medium uppercase tracking-[0.14em] text-navy">
        — {format(parseISO(date), 'EEEE, MMMM d')}
      </p>
      <h2 className="text-[22px] font-bold tracking-[-0.01em] text-navy">{happeningTitle(date)}</h2>
    </div>
  );
}

function CategoryDot({ category }: { category?: EventCategory }) {
  return <span className={`h-[7px] w-[7px] shrink-0 rounded-full ${category ? categoryDotColors[category] : 'bg-ink-muted'}`} />;
}

function TextTabs<T extends string>({
  options,
  value,
  onChange,
}: {
  options: { id: T; label: string }[];
  value: T;
  onChange: (v: T) => void;
}) {
  return (
    <div className="flex flex-wrap items-center gap-[18px] pt-1 pb-2">
      {options.map((o) => (
        <button
          key={o.id}
          onClick={() => onChange(o.id)}
          className={`text-[13px] text-navy ${
            value === o.id ? 'font-bold underline underline-offset-4' : 'text-ink-subtle hover:text-navy'
          }`}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}

/* ---------------- Event rows ---------------- */

function CompactEventRow({ event }: { event: Event }) {
  const cat = primaryCategory(event);
  const price = formatPrice(event.price) || 'Free';
  return (
    <Link href={`/events/${event.id}`} className="group flex items-center gap-5 border-b border-line py-4">
      <span className="w-[72px] shrink-0 text-[14px] font-medium text-navy">
        {isAllDayEvent(event) ? 'All day' : formatTime(event.startTime)}
      </span>
      <span className="flex min-w-0 flex-1 flex-col gap-1">
        <span className="truncate text-[16px] font-bold text-navy group-hover:underline">{event.title}</span>
        <span className="flex min-w-0 items-center gap-2 text-[13px] text-ink-subtle">
          <CategoryDot category={cat} />
          <span className="truncate">
            {cat ? categoryLabels[cat] : 'Event'} · {event.venue.name}
          </span>
        </span>
      </span>
      <span className={`shrink-0 text-[14px] font-medium ${price === 'Free' ? 'text-link' : 'text-navy'}`}>{price}</span>
    </Link>
  );
}

function DetailedEventRow({
  event,
  saved,
  onSave,
}: {
  event: Event;
  saved: boolean;
  onSave: () => void;
}) {
  const cat = primaryCategory(event);
  const price = formatPrice(event.price) || 'Free';
  const sub = event.isRecurring
    ? getRecurrenceLabel({
        recurrencePattern: event.recurrencePattern,
        recurrenceDays: event.recurrenceDays,
        recurrenceDay: event.recurrenceDay,
      }).replace(/^Every /, 'Weekly · ')
    : event.ticketUrl
    ? 'Tickets →'
    : event.categories.includes('19plus')
    ? '19+ · ID required'
    : event.categories.includes('family')
    ? 'All ages'
    : '';
  return (
    <div className="group relative flex items-start gap-4 border-b border-line py-[18px] sm:gap-6">
      <Link href={`/events/${event.id}`} className="absolute inset-0" aria-label={event.title} />
      <span className="flex w-[72px] shrink-0 flex-col gap-0.5 text-navy pointer-events-none sm:w-[84px]">
        <span className="text-[14px] font-medium">{isAllDayEvent(event) ? 'All day' : formatTime(event.startTime)}</span>
        {event.endTime && !isAllDayEvent(event) && (
          <span className="text-[13px] text-ink-subtle">– {formatTime(event.endTime)}</span>
        )}
      </span>
      <span className="flex min-w-0 flex-1 flex-col gap-[5px] pointer-events-none">
        <span className="truncate text-[16px] font-bold text-navy group-hover:underline">{event.title}</span>
        <span className="flex min-w-0 items-center gap-2 text-[13px] text-ink-subtle">
          <CategoryDot category={cat} />
          <span className="truncate">
            {cat ? categoryLabels[cat] : 'Event'} · {event.venue.name}
          </span>
        </span>
        <span className="truncate text-[14px] text-ink-muted">{event.summary || event.description}</span>
      </span>
      <span className="flex shrink-0 flex-col items-end gap-1 text-right font-medium pointer-events-none sm:w-[130px]">
        <span className={`text-[14px] ${price === 'Free' ? 'text-link' : 'text-navy'}`}>{price}</span>
        {sub && <span className="text-[12px] text-ink-subtle">{sub}</span>}
      </span>
      <SaveButton saved={saved} onClick={onSave} size={17} className="relative z-10" />
    </div>
  );
}

function SpecialListRow({ event, saved, onSave }: { event: Event; saved: boolean; onSave: () => void }) {
  const kind = specialKind(event);
  const onNow = isOnNow(event);
  const recurrence = event.isRecurring
    ? getRecurrenceLabel({
        recurrencePattern: event.recurrencePattern,
        recurrenceDays: event.recurrenceDays,
        recurrenceDay: event.recurrenceDay,
      })
    : format(parseISO(event.date), 'EEE, MMM d');
  return (
    <div className="group relative flex items-start gap-4 border-b border-line py-[18px] sm:gap-6">
      <Link href={`/events/${event.id}`} className="absolute inset-0" aria-label={event.title} />
      <span className="flex w-[72px] shrink-0 flex-col gap-0.5 text-navy pointer-events-none sm:w-[84px]">
        {isAllDayEvent(event) ? (
          <span className="text-[14px] font-medium">All day</span>
        ) : (
          <>
            <span className="text-[14px] font-medium">{formatTime(event.startTime)}</span>
            <span className="text-[13px] text-ink-subtle">– {event.endTime ? formatTime(event.endTime) : 'close'}</span>
          </>
        )}
      </span>
      <span
        className={`hidden h-9 w-9 shrink-0 items-center justify-center rounded-[10px] pointer-events-none sm:flex ${
          kind === 'drink' ? 'bg-[#e8f1f8] text-link' : kind === 'happy' ? 'bg-[#fff0be] text-[#8a5a00]' : 'bg-[#fff1e8] text-[#d9662b]'
        }`}
      >
        {kind === 'drink' ? <Wine size={17} /> : kind === 'happy' ? <Smile size={19} /> : <Utensils size={17} />}
      </span>
      <span className="flex min-w-0 flex-1 flex-col gap-[5px] pointer-events-none">
        <span className="truncate text-[16px] font-bold text-navy group-hover:underline">{event.title}</span>
        <span className="truncate text-[13px] text-ink-subtle">{event.venue.name}</span>
        <span className="truncate text-[14px] text-ink-muted">{event.summary || event.description}</span>
      </span>
      <span className="flex shrink-0 flex-col items-end gap-1.5 text-right pointer-events-none sm:w-[130px]">
        {onNow && (
          <span className="inline-flex items-center gap-[5px] rounded-full bg-[#e6f4ec] px-2 py-[3px] text-[12px] font-medium text-[#2d7b4d]">
            <span className="h-1.5 w-1.5 rounded-full bg-[#2d7b4d]" /> On now
          </span>
        )}
        <span className="text-[12px] font-medium text-ink-subtle">{recurrence}</span>
      </span>
      <SaveButton saved={saved} onClick={onSave} size={17} className="relative z-10" />
    </div>
  );
}

/* ---------------- Category rail ---------------- */

function CategoryRail({
  selected,
  onToggle,
  onClear,
  moreFilters,
}: {
  selected: RailFilter[];
  onToggle: (id: RailFilter) => void;
  onClear: () => void;
  moreFilters: ReactNode;
}) {
  const [expanded, setExpanded] = useState(false);
  const [showMore, setShowMore] = useState(false);
  return (
    <aside className="lg:sticky lg:top-24 self-start">
      <div
        className={`flex rounded-[22px] border border-line bg-white px-3 py-3.5 gap-1.5 lg:flex-col ${
          expanded ? 'lg:w-[230px] lg:items-stretch' : 'lg:items-center'
        } overflow-x-auto no-scrollbar`}
      >
        <button
          onClick={() => setExpanded(!expanded)}
          className="relative flex h-11 min-w-11 shrink-0 items-center justify-center gap-2 rounded-[10px] bg-[#f1f4f8] px-3 text-navy"
          title={expanded ? 'Collapse categories' : 'Show category names'}
        >
          <ListFilter size={18} />
          {expanded && <span className="hidden lg:inline text-[13px] font-bold">Categories</span>}
          {selected.length > 0 && (
            <span className="absolute -top-1 left-[30px] flex h-[18px] w-[18px] items-center justify-center rounded-full bg-coral text-[12px] font-bold text-navy">
              {selected.length}
            </span>
          )}
        </button>
        <div className="mx-auto my-1 hidden h-px w-8 bg-line lg:block" />
        {railCategories.map((c) => {
          const active = selected.includes(c.id);
          return (
            <button
              key={c.id}
              onClick={() => onToggle(c.id)}
              title={c.label}
              aria-pressed={active}
              className={`relative flex h-11 shrink-0 items-center gap-3 rounded-[12px] ${
                expanded ? 'lg:justify-start lg:px-1.5' : 'justify-center'
              } min-w-11 ${active ? 'border-2 border-navy bg-[#eef5fb]' : 'border-2 border-transparent hover:bg-sky-soft'}`}
            >
              <span
                className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-[9px] ${c.tile} ${
                  active || selected.length === 0 ? '' : 'opacity-55'
                } ${expanded ? '' : 'mx-auto lg:mx-0'}`}
              >
                {c.icon}
              </span>
              {expanded && <span className="hidden lg:inline truncate pr-2 text-[13px] font-medium text-navy">{c.label}</span>}
              {active && (
                <span className="absolute -top-1.5 left-[30px] flex h-4 w-4 items-center justify-center rounded-full border-2 border-white bg-navy text-white">
                  <Check size={9} strokeWidth={3} />
                </span>
              )}
            </button>
          );
        })}
        <div className="mx-auto my-1 hidden h-px w-8 bg-line lg:block" />
        <div className="relative">
          <button
            onClick={() => setShowMore(!showMore)}
            className="flex h-11 min-w-11 w-full shrink-0 items-center justify-center gap-2 rounded-[10px] text-navy hover:bg-sky-soft"
            title="More filters"
          >
            <SlidersHorizontal size={18} />
            {expanded && <span className="hidden lg:inline text-[13px] font-medium">More filters</span>}
          </button>
          {showMore && (
            <>
              <div className="fixed inset-0 z-30" onClick={() => setShowMore(false)} />
              <div className="absolute left-0 top-full z-40 mt-2 w-64 rounded-[18px] border border-line bg-white p-4 shadow-[0_18px_40px_-12px_rgba(27,42,65,0.25)] lg:left-full lg:top-auto lg:bottom-0 lg:ml-3 lg:mt-0">
                {moreFilters}
                {selected.length > 0 && (
                  <button onClick={onClear} className="mt-3 text-[13px] font-medium text-link hover:underline">
                    Clear categories
                  </button>
                )}
              </div>
            </>
          )}
        </div>
      </div>
    </aside>
  );
}

/* ---------------- Page content ---------------- */

function EventsContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const initialCategory = searchParams.get('category') as EventCategory | null;
  const initialDate = searchParams.get('date');
  const tabParam = searchParams.get('tab');
  const initialTab: TabType = tabParam === 'deals' ? 'deals' : tabParam === 'events' ? 'events' : 'all';

  const { events: allEvents, getUpcomingEvents, isLiked, toggleLike, isLoading } = useEvents();
  const { user } = useAuth();

  const todayStr = format(new Date(), 'yyyy-MM-dd');
  const [activeTab, setActiveTab] = useState<TabType>(initialTab);
  const [showToast, setShowToast] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [selected, setSelected] = useState<RailFilter[]>(initialCategory ? [initialCategory] : []);
  const [dateWindow, setDateWindow] = useState<DateWindow>(
    initialDate ? { kind: 'day', date: initialDate } : { kind: 'upcoming' }
  );
  const [pastRange, setPastRange] = useState<PastRange>('none');
  const [freeOnly, setFreeOnly] = useState(false);
  const [specialFilter, setSpecialFilter] = useState<SpecialFilter>('all');
  const [sideSpecialFilter, setSideSpecialFilter] = useState<SpecialFilter>('all');
  const [showAllEvents, setShowAllEvents] = useState(false);
  const [showAllSpecials, setShowAllSpecials] = useState(false);
  const [showDateMenu, setShowDateMenu] = useState(false);
  const [pickMode, setPickMode] = useState<'single' | 'range'>('single');
  const [pickDate, setPickDate] = useState('');
  const [pickStart, setPickStart] = useState('');
  const [pickEnd, setPickEnd] = useState('');
  const dateMenuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!showDateMenu) return;
    const handle = (e: MouseEvent) => {
      if (dateMenuRef.current && !dateMenuRef.current.contains(e.target as Node)) setShowDateMenu(false);
    };
    document.addEventListener('mousedown', handle);
    return () => document.removeEventListener('mousedown', handle);
  }, [showDateMenu]);

  useEffect(() => {
    setShowAllEvents(false);
    setShowAllSpecials(false);
  }, [activeTab, dateWindow, selected, searchQuery]);

  const upcoming = getUpcomingEvents();

  const pool = useMemo(() => {
    if (pastRange === 'none') return upcoming;
    const now = new Date();
    const cutoff = pastRange === 'week' ? subDays(now, 7) : pastRange === 'month' ? subMonths(now, 1) : subMonths(now, 3);
    return allEvents.filter((e) => parseISO(e.date) >= startOfDay(cutoff));
  }, [allEvents, upcoming, pastRange]);

  const inWindow = (event: Event) => {
    switch (dateWindow.kind) {
      case 'day':
        return event.date === dateWindow.date;
      case 'upcoming':
        return event.date === todayStr || event.date === format(addDays(new Date(), 1), 'yyyy-MM-dd');
      case 'week':
        return isWithinInterval(startOfDay(parseISO(event.date)), {
          start: startOfDay(new Date()),
          end: startOfDay(addDays(new Date(), 6)),
        });
      case 'range':
        return isWithinInterval(startOfDay(parseISO(event.date)), {
          start: startOfDay(parseISO(dateWindow.start)),
          end: startOfDay(parseISO(dateWindow.end)),
        });
    }
  };

  const sortByTime = (a: Event, b: Event) => a.date.localeCompare(b.date) || a.startTime.localeCompare(b.startTime);

  const filteredEvents = useMemo(() => {
    return pool.filter((event) => {
      if (event.categories.includes('food-deal')) return false;
      if (!matchesQuery(event, searchQuery)) return false;
      if (!inWindow(event)) return false;
      if (selected.length > 0) {
        const hit = selected.some((s) =>
          s === DOWNTOWN ? isDowntown(event.venue) : event.categories.includes(s)
        );
        if (!hit) return false;
      }
      if (freeOnly && formatPrice(event.price) && !isFreePrice(event.price)) return false;
      return true;
    }).sort(sortByTime);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pool, searchQuery, dateWindow, selected, freeOnly]);

  const filteredDeals = useMemo(() => {
    return pool
      .filter((event) => {
        if (!event.categories.includes('food-deal')) return false;
        if (!matchesQuery(event, searchQuery)) return false;
        if (!inWindow(event)) return false;
        return true;
      })
      .sort(
        (a, b) =>
          a.date.localeCompare(b.date) ||
          a.startTime.localeCompare(b.startTime) ||
          listingPriority(b) - listingPriority(a)
      );
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pool, searchQuery, dateWindow]);

  const applySpecialFilter = (list: Event[], f: SpecialFilter) => {
    switch (f) {
      case 'food':
        return list.filter((e) => specialKind(e) !== 'drink');
      case 'drink':
        return list.filter((e) => e.categories.includes('drink'));
      case 'now':
        return list.filter(isOnNow);
      case 'happy':
        return list.filter(isHappyHour);
      case 'downtown':
        return list.filter((e) => isDowntown(e.venue));
      default:
        return list;
    }
  };

  const handleSave = (eventId: string) => {
    if (!user) {
      router.push('/login');
      return;
    }
    const wasSaved = isLiked(eventId);
    toggleLike(eventId);
    if (!wasSaved) setShowToast(true);
  };

  const toggleRail = (id: RailFilter) =>
    setSelected((prev) => (prev.includes(id) ? prev.filter((c) => c !== id) : [...prev, id]));

  const clearAll = () => {
    setSearchQuery('');
    setSelected([]);
    setFreeOnly(false);
    setPastRange('none');
    setSpecialFilter('all');
    setDateWindow({ kind: 'upcoming' });
  };

  const singleDay = dateWindow.kind === 'day';
  const windowNoun =
    dateWindow.kind === 'day'
      ? isToday(parseISO(dateWindow.date))
        ? 'today'
        : isTomorrow(parseISO(dateWindow.date))
        ? 'tomorrow'
        : `on ${format(parseISO(dateWindow.date), 'EEE, MMM d')}`
      : dateWindow.kind === 'week'
      ? 'this week'
      : dateWindow.kind === 'range'
      ? `${format(parseISO(dateWindow.start), 'MMM d')} – ${format(parseISO(dateWindow.end), 'MMM d')}`
      : 'today or tomorrow';

  // The dropdown label only reflects custom dates/ranges
  const dateMenuLabel =
    dateWindow.kind === 'range'
      ? `${format(parseISO(dateWindow.start), 'MMM d')} – ${format(parseISO(dateWindow.end), 'MMM d')}`
      : dateWindow.kind === 'day'
      ? format(parseISO(dateWindow.date), 'EEE, MMM d')
      : dateWindow.kind === 'week'
      ? 'This week'
      : 'Pick a date';

  const specialsTitle = singleDay
    ? `${format(parseISO(dateWindow.date), 'EEEE')} Specials`
    : dateWindow.kind === 'upcoming'
    ? 'Upcoming Specials'
    : `Specials ${windowNoun}`;

  const moreFilters = (
    <div className="flex flex-col gap-4">
      <label className="flex items-center justify-between gap-3 text-[13px] font-medium text-navy">
        Free only
        <button type="button" className="switch" data-on={freeOnly} onClick={() => setFreeOnly(!freeOnly)}>
          <span />
        </button>
      </label>
      <div>
        <p className="mb-2 text-[13px] font-medium text-navy">Include past events</p>
        <div className="flex flex-wrap gap-1.5">
          {(
            [
              ['none', 'No'],
              ['week', 'Past week'],
              ['month', 'Past month'],
              ['3months', '3 months'],
            ] as [PastRange, string][]
          ).map(([id, label]) => (
            <button key={id} className="chip h-8 px-3" data-active={pastRange === id} onClick={() => setPastRange(id)}>
              {label}
            </button>
          ))}
        </div>
      </div>
    </div>
  );

  if (isLoading) return <EventsLoading />;

  const noResults =
    (activeTab === 'all' && filteredEvents.length === 0 && filteredDeals.length === 0) ||
    (activeTab === 'events' && filteredEvents.length === 0) ||
    (activeTab === 'deals' && applySpecialFilter(filteredDeals, specialFilter).length === 0);

  const EVENTS_PREVIEW = 14;
  const SPECIALS_PREVIEW = 8;

  const renderEventGroups = (list: Event[], row: (e: Event) => ReactNode) =>
    groupBy(list, (e) => e.date).map(([date, dayItems], i) => (
      <div key={date} className={i > 0 ? 'mt-12' : ''}>
        <DayHeader date={date} />
        {groupBy(dayItems, bandFor, BAND_ORDER).map(([band, items]) => (
          <div key={band}>
            <Band label={band} />
            <div className="border-t border-line">{items.map(row)}</div>
          </div>
        ))}
      </div>
    ));

  const emptyState = (
    <div className="rounded-[22px] bg-sky-soft px-6 py-14 text-center">
      <div className="mx-auto mb-5 flex h-[52px] w-[52px] items-center justify-center rounded-full bg-white text-navy">
        <Search size={20} />
      </div>
      <p className="text-[24px] font-bold text-navy">
        {searchQuery ? <>No results for &ldquo;{searchQuery}&rdquo;</> : <>Nothing listed {windowNoun}</>}
      </p>
      <p className="mx-auto mt-3 max-w-[420px] text-[14px] text-ink-muted">
        We couldn&rsquo;t find any {activeTab === 'deals' ? 'food & drink specials' : 'events'} matching that{' '}
        {windowNoun}. Try loosening things up a little:
      </p>
      <div className="mt-6 flex flex-wrap justify-center gap-2.5">
        <button onClick={clearAll} className="btn-outline">
          <X size={14} /> Clear search &amp; filters
        </button>
        {dateWindow.kind !== 'week' && (
          <button onClick={() => setDateWindow({ kind: 'week' })} className="btn-sun">
            <Calendar size={14} /> Try &ldquo;This week&rdquo;
          </button>
        )}
      </div>
      <p className="mt-8 eyebrow-sm">Popular categories</p>
      <div className="mt-3 flex flex-wrap justify-center gap-2">
        {popularCategories.map((p) => (
          <button
            key={p.label}
            className="chip"
            onClick={() => {
              setSearchQuery('');
              if (p.tab) {
                setActiveTab(p.tab);
              } else if (p.category) {
                setSelected([p.category]);
                if (activeTab === 'deals') setActiveTab('events');
              }
            }}
          >
            {p.label}
          </button>
        ))}
      </div>
      <p className="mt-6 text-[12px] text-ink-muted">
        Tip: search by venue too, like <span className="font-bold text-navy">&ldquo;Merchant Tap House&rdquo;</span>
      </p>
    </div>
  );

  return (
    <>
      {/* Toolbar */}
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div className="inline-flex items-center gap-1 self-start rounded-full bg-[#fff3de] p-1">
          {(
            [
              ['all', 'All'],
              ['events', 'Events'],
              ['deals', 'Specials'],
            ] as [TabType, string][]
          ).map(([id, label]) => (
            <button
              key={id}
              onClick={() => setActiveTab(id)}
              className={`inline-flex h-10 items-center rounded-full px-5 text-[14px] uppercase transition-colors ${
                activeTab === id ? 'bg-sun font-bold text-black' : 'font-medium text-navy hover:bg-sun/30'
              }`}
            >
              {label}
            </button>
          ))}
        </div>
        <div className="flex flex-col gap-2.5 sm:flex-row sm:items-center">
          <div className="relative" ref={dateMenuRef}>
            <button
              onClick={() => setShowDateMenu(!showDateMenu)}
              className="flex h-[46px] w-full items-center justify-center gap-2 whitespace-nowrap rounded-full border border-line bg-white px-[18px] text-[14px] font-medium text-navy hover:border-navy"
            >
              <Calendar size={18} className="text-link" />
              {dateMenuLabel}
              <ChevronDown size={16} />
            </button>
            {showDateMenu && (
              <div className="absolute left-0 top-full z-40 mt-2 w-[300px] rounded-[18px] border border-line bg-white p-4 shadow-[0_18px_40px_-12px_rgba(27,42,65,0.25)] sm:left-auto sm:right-0">
                <button
                  onClick={() => {
                    setDateWindow({ kind: 'upcoming' });
                    setShowDateMenu(false);
                  }}
                  className="chip mb-3 w-full justify-center"
                  data-active={dateWindow.kind === 'upcoming'}
                >
                  Upcoming dates
                </button>
                <div className="segmented mb-3 w-full">
                  <button className="segmented-item flex-1 justify-center" data-active={pickMode === 'single'} onClick={() => setPickMode('single')}>
                    Single date
                  </button>
                  <button className="segmented-item flex-1 justify-center" data-active={pickMode === 'range'} onClick={() => setPickMode('range')}>
                    Date range
                  </button>
                </div>
                {pickMode === 'single' ? (
                  <DatePicker value={pickDate} onChange={setPickDate} placeholder="Select date" className="text-sm" />
                ) : (
                  <div className="space-y-2">
                    <DatePicker value={pickStart} onChange={setPickStart} placeholder="Start date" className="text-sm" />
                    <DatePicker value={pickEnd} onChange={setPickEnd} placeholder="End date" className="text-sm" />
                  </div>
                )}
                <button
                  className="btn-navy btn-sm mt-3 w-full"
                  onClick={() => {
                    if (pickMode === 'single' && pickDate) setDateWindow({ kind: 'day', date: pickDate });
                    if (pickMode === 'range' && pickStart && pickEnd)
                      setDateWindow({ kind: 'range', start: pickStart <= pickEnd ? pickStart : pickEnd, end: pickStart <= pickEnd ? pickEnd : pickStart });
                    setShowDateMenu(false);
                  }}
                >
                  Apply
                </button>
              </div>
            )}
          </div>
          <div className="relative sm:w-[200px]">
            <Search size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-navy" />
            <input
              type="text"
              placeholder="Search"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="h-[46px] w-full rounded-full border border-line bg-white pl-11 pr-10 text-[16px] text-navy placeholder:text-ink-muted outline-none focus:border-navy"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute right-4 top-1/2 -translate-y-1/2 text-ink-muted hover:text-navy"
                aria-label="Clear search"
              >
                <X size={16} />
              </button>
            )}
          </div>
        </div>
      </div>

      <div className="h-[46px]" />

      <div className={`flex flex-col gap-6 lg:flex-row ${activeTab === 'deals' ? '' : 'lg:gap-12'}`}>
        {activeTab !== 'deals' && (
          <CategoryRail selected={selected} onToggle={toggleRail} onClear={() => setSelected([])} moreFilters={moreFilters} />
        )}

        <div className="min-w-0 flex-1">
          <div>
            {noResults ? (
              emptyState
            ) : activeTab === 'all' ? (
              <div className="flex flex-col gap-10 xl:flex-row xl:gap-14">
                {/* Events column */}
                <div className="min-w-0 flex-1">
                  {filteredEvents.length === 0 ? (
                    <p className="text-ink-muted">No events {windowNoun} with these filters.</p>
                  ) : (
                    renderEventGroups(
                      showAllEvents ? filteredEvents : filteredEvents.slice(0, EVENTS_PREVIEW),
                      (e) => <CompactEventRow key={e.id} event={e} />
                    )
                  )}
                  {filteredEvents.length > EVENTS_PREVIEW && !showAllEvents && (
                    <button onClick={() => setShowAllEvents(true)} className="link-arrow mt-5">
                      Show all {filteredEvents.length} →
                    </button>
                  )}
                </div>

                {/* Specials side panel */}
                <div className="self-start rounded-[25px] bg-[#f3f8fc] p-7 xl:w-[360px] xl:shrink-0">
                  <h2 className="pb-2 text-[22px] font-bold tracking-[-0.01em] text-navy">{specialsTitle}</h2>
                  <TextTabs
                    value={sideSpecialFilter}
                    onChange={setSideSpecialFilter}
                    options={[
                      { id: 'all', label: 'All' },
                      { id: 'food', label: 'Food' },
                      { id: 'drink', label: 'Drinks' },
                      { id: 'now', label: 'On now' },
                      { id: 'downtown', label: 'Downtown' },
                    ]}
                  />
                  {(() => {
                    const list = applySpecialFilter(filteredDeals, sideSpecialFilter);
                    if (list.length === 0) return <p className="py-6 text-[13px] text-ink-muted">No specials match.</p>;
                    return (
                      <>
                        {list.slice(0, SPECIALS_PREVIEW).map((deal) => (
                          <Link
                            key={deal.id}
                            href={`/events/${deal.id}`}
                            className="group block border-b border-[#dce7f1] py-3.5 last:border-b-0"
                          >
                            <p className="text-[15px] font-bold text-navy group-hover:underline">{deal.title}</p>
                            <p className="mt-1 text-[13px] text-ink-subtle">
                              {deal.venue.name} ·{' '}
                              {isAllDayEvent(deal)
                                ? 'All day'
                                : deal.endTime
                                ? `${formatTimeShort(deal.startTime)} – ${formatTimeShort(deal.endTime)}`
                                : `From ${formatTimeShort(deal.startTime)}`}
                              {!singleDay && ` · ${format(parseISO(deal.date), 'EEE')}`}
                            </p>
                          </Link>
                        ))}
                        <button onClick={() => setActiveTab('deals')} className="link-arrow mt-4">
                          All {list.length} specials →
                        </button>
                      </>
                    );
                  })()}
                </div>
              </div>
            ) : activeTab === 'events' ? (
              <div>
                {renderEventGroups(showAllEvents ? filteredEvents : filteredEvents.slice(0, EVENTS_PREVIEW), (e) => (
                  <DetailedEventRow key={e.id} event={e} saved={isLiked(e.id)} onSave={() => handleSave(e.id)} />
                ))}
                {filteredEvents.length > EVENTS_PREVIEW && !showAllEvents && (
                  <button onClick={() => setShowAllEvents(true)} className="link-arrow mt-5">
                    Show all {filteredEvents.length} →
                  </button>
                )}
              </div>
            ) : (
              <div className="rounded-[25px] bg-[#f3f8fc] p-5 sm:p-[30px]">
                {(() => {
                  const list = applySpecialFilter(filteredDeals, specialFilter);
                  const shown = showAllSpecials ? list : list.slice(0, 10);
                  const row = (e: Event) => (
                    <SpecialListRow key={e.id} event={e} saved={isLiked(e.id)} onSave={() => handleSave(e.id)} />
                  );
                  return (
                    <>
                      <h2 className="pb-1 text-[22px] font-bold tracking-[-0.01em] text-navy">{specialsTitle}</h2>
                      <TextTabs
                        value={specialFilter}
                        onChange={setSpecialFilter}
                        options={[
                          { id: 'all', label: 'All' },
                          { id: 'food', label: 'Food' },
                          { id: 'drink', label: 'Drinks' },
                          { id: 'now', label: 'On now' },
                          { id: 'happy', label: 'Happy hour' },
                        ]}
                      />
                      {singleDay
                        ? groupBy(shown, specialBand, SPECIAL_BAND_ORDER).map(([band, items]) => (
                            <div key={band}>
                              <Band label={band} />
                              <div className="border-t border-line">{items.map(row)}</div>
                            </div>
                          ))
                        : groupBy(shown, (e) => e.date).map(([date, items]) => (
                            <div key={date}>
                              <Band label={dayLabel(date)} />
                              <div className="border-t border-line">{items.map(row)}</div>
                            </div>
                          ))}
                      {list.length > shown.length && (
                        <button onClick={() => setShowAllSpecials(true)} className="link-arrow mt-5">
                          Show all {list.length} →
                        </button>
                      )}
                    </>
                  );
                })()}
              </div>
            )}
          </div>
        </div>
      </div>

      <Toast isOpen={showToast} message="Saved to My Events" type="success" onClose={() => setShowToast(false)} />
    </>
  );
}

function EventsLoading() {
  return (
    <div className="flex items-center justify-center py-24">
      <Loader2 size={32} className="animate-spin text-navy" />
    </div>
  );
}

export default function EventsPage() {
  return (
    <div className="page-container pb-24 pt-10">
      <p className="eyebrow mb-3.5">— Browse</p>
      <h1 className="display-section">
        Everything
        <br />
        happening
      </h1>
      <p className="mt-2.5 text-[14px] font-medium text-ink-muted">Feeling spontaneous or planning your week?</p>
      <div className="h-[54px]" />
      <Suspense fallback={<EventsLoading />}>
        <EventsContent />
      </Suspense>
    </div>
  );
}
