'use client';

import { useRouter, useSearchParams } from 'next/navigation';
import { useEffect, useState, useCallback, useMemo, useRef, Suspense } from 'react';
import Link from 'next/link';
import { Calendar, ChevronDown, Loader2, MapPin, Pencil, Search, X } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { useEvents } from '@/contexts/EventsContext';
import { format, parseISO, isToday, isTomorrow, addDays } from 'date-fns';
import type { Event, EventCategory } from '@/types/event';
import { categoryLabels, categoryDotColors } from '@/constants/categories';
import { DatePicker } from '@/components';
import { formatPrice } from '@/utils/price';
import { getRecurrenceLabel } from '@/utils/recurrenceLabel';
import { DAY_NAMES, DAY_SHORT } from '@/utils/recurrence';
import { SaveButton, formatTime, formatTimeShort, isAllDayEvent, primaryCategory } from '@/components/brand';

interface SubmittedEvent {
  id: string;
  title: string;
  description: string;
  date: string;
  startTime: string;
  endTime?: string;
  price?: string;
  imageUrl?: string;
  isAllDay?: boolean;
  status: string;
  submittedById?: string;
  createdAt: string;
  venue: { id: string; name: string; address: string };
  categories: string[];
  likeCount: number;
  isRecurring?: boolean;
  seriesId?: string;
  recurrencePattern?: string;
  recurrenceDays?: number[];
  recurrenceDay?: number;
  recurrenceEndDate?: string;
  rejectionReason?: string;
  /** Submitted by someone else at one of the organizer's venues (verified organizers only) */
  fromVenue?: boolean;
}

/** One card on the Submitted tab: a one-off listing, or a whole recurring series */
interface Submission {
  key: string;
  event: SubmittedEvent;
  status: string;
  untilDate?: string;
}

type DateWindow =
  | { kind: 'upcoming' }
  | { kind: 'week' }
  | { kind: 'past' }
  | { kind: 'day'; date: string };

const EVENTS_PREVIEW = 10;
const SPECIALS_PREVIEW = 8;

const isSpecial = (e: { categories: string[] }) =>
  e.categories.includes('food-deal') || e.categories.includes('food') || e.categories.includes('drink');

const todayStr = () => format(new Date(), 'yyyy-MM-dd');

function seriesDays(e: Pick<Event, 'recurrenceDays' | 'recurrenceDay' | 'date'>): number[] {
  if (e.recurrenceDays && e.recurrenceDays.length > 0) return [...e.recurrenceDays].sort((a, b) => a - b);
  if (e.recurrenceDay != null) return [e.recurrenceDay];
  return [parseISO(e.date).getDay()];
}

/** "Thursdays", "Mondays & Wednesdays", "Mon, Wed & Fri", "Every other Tuesday" */
function pluralDaysLabel(e: SubmittedEvent) {
  const days = seriesDays(e);
  if (e.recurrencePattern === 'monthly') return `Monthly on ${DAY_NAMES[days[0]]}`;
  if (e.recurrencePattern === 'biweekly') {
    return days.length === 1 ? `Every other ${DAY_NAMES[days[0]]}` : getRecurrenceLabel(e);
  }
  if (days.length === 1) return `${DAY_NAMES[days[0]]}s`;
  if (days.length === 2) return `${DAY_NAMES[days[0]]}s & ${DAY_NAMES[days[1]]}s`;
  const short = days.map((d) => DAY_SHORT[d]);
  return `${short.slice(0, -1).join(', ')} & ${short[short.length - 1]}`;
}

/** "Every Tue", "Every Fri & Sat" */
function everyDaysLabel(e: Event) {
  if (e.recurrencePattern && e.recurrencePattern !== 'weekly') return getRecurrenceLabel(e);
  const short = seriesDays(e).map((d) => DAY_SHORT[d]);
  if (short.length <= 2) return `Every ${short.join(' & ')}`;
  return `Every ${short.slice(0, -1).join(', ')} & ${short[short.length - 1]}`;
}

function specialHours(e: Pick<Event, 'isAllDay' | 'startTime' | 'endTime'>) {
  if (isAllDayEvent(e)) return 'All day';
  if (!e.endTime) return `From ${formatTimeShort(e.startTime)}`;
  return `${formatTimeShort(e.startTime)} – ${formatTimeShort(e.endTime)}`;
}

function inWindow(date: string, w: DateWindow) {
  const today = todayStr();
  if (w.kind === 'past') return date < today;
  if (w.kind === 'week') return date >= today && date <= format(addDays(new Date(), 6), 'yyyy-MM-dd');
  if (w.kind === 'day') return date === w.date;
  return date >= today;
}

function matchesSearch(e: Event, q: string) {
  if (!q) return true;
  const needle = q.toLowerCase();
  return e.title.toLowerCase().includes(needle) || e.venue?.name.toLowerCase().includes(needle);
}

function StatusPill({ status }: { status: string }) {
  const styles: Record<string, string> = {
    approved: 'bg-[#c1efe4] text-[#1a1a1a]',
    pending: 'bg-sun text-navy',
    rejected: 'bg-[#ffe1da] text-[#ad290c]',
    cancelled: 'bg-[#e9ecf0] text-ink-muted',
  };
  return (
    <span className={`tag shrink-0 px-3 py-1.5 tracking-[0.12em] ${styles[status] ?? 'bg-sky text-navy'}`}>{status}</span>
  );
}

function CategoryDot({ category }: { category?: EventCategory }) {
  return <span className={`h-[7px] w-[7px] shrink-0 rounded-full ${category ? categoryDotColors[category] : 'bg-ink-muted'}`} />;
}

function DayBand({ date, first }: { date: string; first: boolean }) {
  const d = parseISO(date);
  const prefix = isToday(d) ? 'Today · ' : isTomorrow(d) ? 'Tomorrow · ' : '';
  return (
    <p className={`${first ? 'pt-7' : 'pt-14'} pb-1.5 text-[12px] font-medium uppercase tracking-[0.14em] text-navy`}>
      — {prefix}
      {format(d, 'EEEE, MMMM d')}
    </p>
  );
}

function SavedEventRow({ event, onUnsave }: { event: Event; onUnsave: () => void }) {
  const cat = primaryCategory(event);
  const price = formatPrice(event.price) || 'Free';
  return (
    <div className="group relative flex items-center gap-5 border-b border-[#eceff3] py-4">
      <Link href={`/events/${event.id}`} className="absolute inset-0" aria-label={event.title} />
      <span className="pointer-events-none w-[72px] shrink-0 text-[14px] font-medium text-navy">
        {isAllDayEvent(event) ? 'All day' : formatTime(event.startTime)}
      </span>
      <span className="pointer-events-none flex min-w-0 flex-1 flex-col gap-1">
        <span className="truncate text-[16px] font-bold text-navy group-hover:underline">{event.title}</span>
        <span className="flex min-w-0 items-center gap-2 text-[13px] text-[#6d7682]">
          <CategoryDot category={cat} />
          <span className="truncate">
            {cat ? categoryLabels[cat] : 'Event'} · {event.venue.name}
          </span>
        </span>
      </span>
      <span className={`pointer-events-none shrink-0 text-[14px] font-medium ${price === 'Free' ? 'text-link' : 'text-navy'}`}>
        {price}
      </span>
      <SaveButton saved onClick={onUnsave} size={17} className="relative z-10 text-navy" />
    </div>
  );
}

function SavedSpecialRow({ event, when, onUnsave }: { event: Event; when: string; onUnsave: () => void }) {
  return (
    <div className="group relative flex items-start justify-between gap-3 border-b border-[#dce7f1] py-3.5">
      <Link href={`/events/${event.id}`} className="absolute inset-0" aria-label={event.title} />
      <div className="pointer-events-none flex min-w-0 flex-col gap-1">
        <p className="text-[15px] font-bold text-navy group-hover:underline">{event.title}</p>
        <p className="truncate text-[13px] text-[#69717d]">{event.venue.name}</p>
        <p className="text-[12px] font-bold uppercase tracking-[0.08em] text-link">{when}</p>
      </div>
      <SaveButton saved onClick={onUnsave} size={17} className="relative z-10 text-navy" />
    </div>
  );
}

function MyEventsContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { user, isLoading: authLoading } = useAuth();
  const { events, userLikes, toggleLike } = useEvents();
  const [activeTab, setActiveTab] = useState<'liked' | 'submitted'>(
    searchParams.get('tab') === 'submitted' ? 'submitted' : 'liked'
  );

  // Saved tab
  const [dateWindow, setDateWindow] = useState<DateWindow>({ kind: 'upcoming' });
  const [showDateMenu, setShowDateMenu] = useState(false);
  const [pickDate, setPickDate] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [showAllEvents, setShowAllEvents] = useState(false);
  const [showAllSpecials, setShowAllSpecials] = useState(false);
  const dateMenuRef = useRef<HTMLDivElement>(null);

  // Submitted tab
  const [submittedEvents, setSubmittedEvents] = useState<SubmittedEvent[]>([]);
  const [loadingSubmissions, setLoadingSubmissions] = useState(false);

  useEffect(() => {
    if (!showDateMenu) return;
    const onClick = (e: MouseEvent) => {
      if (dateMenuRef.current && !dateMenuRef.current.contains(e.target as Node)) setShowDateMenu(false);
    };
    document.addEventListener('mousedown', onClick);
    return () => document.removeEventListener('mousedown', onClick);
  }, [showDateMenu]);

  const saved = useMemo(
    () =>
      events
        .filter((e) => userLikes.includes(e.id))
        .filter((e) => inWindow(e.date, dateWindow))
        .filter((e) => matchesSearch(e, searchQuery))
        .sort((a, b) =>
          dateWindow.kind === 'past'
            ? b.date.localeCompare(a.date) || a.startTime.localeCompare(b.startTime)
            : a.date.localeCompare(b.date) || a.startTime.localeCompare(b.startTime)
        ),
    [events, userLikes, dateWindow, searchQuery]
  );

  const savedEvents = useMemo(() => saved.filter((e) => !isSpecial(e)), [saved]);

  // Specials split into one-off ("Upcoming") and weekly recurring (one row per series)
  const { upcomingSpecials, recurringSpecials } = useMemo(() => {
    const upcoming: Event[] = [];
    const recurring: Event[] = [];
    const seenSeries = new Set<string>();
    for (const e of saved.filter(isSpecial)) {
      if (e.isRecurring && e.seriesId) {
        if (seenSeries.has(e.seriesId)) continue;
        seenSeries.add(e.seriesId);
        recurring.push(e);
      } else {
        upcoming.push(e);
      }
    }
    return { upcomingSpecials: upcoming, recurringSpecials: recurring };
  }, [saved]);

  const savedEventsByDate = useMemo(() => {
    const shown = showAllEvents ? savedEvents : savedEvents.slice(0, EVENTS_PREVIEW);
    const map = new Map<string, Event[]>();
    shown.forEach((e) => {
      if (!map.has(e.date)) map.set(e.date, []);
      map.get(e.date)!.push(e);
    });
    return [...map.entries()];
  }, [savedEvents, showAllEvents]);

  useEffect(() => {
    if (!authLoading && !user) router.push('/login?redirect=/my-events');
  }, [user, authLoading, router]);

  const fetchSubmissions = useCallback(async () => {
    if (!user) return;
    setLoadingSubmissions(true);
    try {
      const res = await fetch('/api/events/my-submissions');
      const data = await res.json();
      if (data.events) setSubmittedEvents(data.events);
    } catch (error) {
      console.error('[MyEvents] Error fetching submissions:', error);
    } finally {
      setLoadingSubmissions(false);
    }
  }, [user]);

  useEffect(() => {
    if (user && activeTab === 'submitted') fetchSubmissions();
  }, [user, activeTab, fetchSubmissions]);

  const submissions = useMemo((): Submission[] => {
    const today = todayStr();
    const seriesMap = new Map<string, SubmittedEvent[]>();
    const result: Submission[] = [];
    for (const ev of submittedEvents) {
      if (ev.seriesId) {
        const list = seriesMap.get(ev.seriesId) || [];
        list.push(ev);
        seriesMap.set(ev.seriesId, list);
      } else {
        result.push({ key: ev.id, event: ev, status: ev.status });
      }
    }
    for (const [seriesId, instances] of seriesMap) {
      instances.sort((a, b) => a.date.localeCompare(b.date));
      // Represent the series by its next occurrence (or the last one if it's over)
      const rep = instances.find((i) => i.date >= today && i.status !== 'cancelled') ?? instances[instances.length - 1];
      const status = instances.some((i) => i.status === 'pending') ? 'pending' : rep.status;
      result.push({
        key: seriesId,
        event: rep,
        status,
        untilDate: rep.recurrenceEndDate || instances[instances.length - 1].date,
      });
    }
    return result.sort((a, b) => b.event.createdAt.localeCompare(a.event.createdAt));
  }, [submittedEvents]);

  const hasVenueListings = submittedEvents.some((e) => e.fromVenue);
  const submittedEventCards = submissions.filter((s) => !isSpecial(s.event));
  const submittedSpecialCards = submissions.filter((s) => isSpecial(s.event));

  if (authLoading || !user) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <Loader2 size={32} className="animate-spin text-navy" />
      </div>
    );
  }

  const dateMenuLabel =
    dateWindow.kind === 'day'
      ? format(parseISO(dateWindow.date), 'EEE, MMM d')
      : dateWindow.kind === 'week'
      ? 'This week'
      : dateWindow.kind === 'past'
      ? 'Past'
      : 'Pick a date';

  const specialsCount = upcomingSpecials.length + recurringSpecials.length;
  let specialsBudget = showAllSpecials ? Infinity : SPECIALS_PREVIEW;
  const shownUpcoming = upcomingSpecials.slice(0, specialsBudget);
  specialsBudget -= shownUpcoming.length;
  const shownRecurring = recurringSpecials.slice(0, Math.max(0, specialsBudget));
  const unsave = (id: string) => toggleLike(id);

  return (
    <div className="page-container pb-24 pt-10">
      <p className="eyebrow mb-7">— My Events</p>
      <div className="flex flex-col gap-6 sm:flex-row sm:items-end sm:justify-between">
        <h1 className="display-section">
          {activeTab === 'liked' ? (
            <>
              Your saved
              <br />
              plans
            </>
          ) : (
            <>
              Your
              <br />
              submissions
            </>
          )}
        </h1>
        <div className="inline-flex items-center gap-1 self-start rounded-full bg-[#fff3de] p-1 sm:self-auto">
          {(
            [
              ['liked', 'Saved'],
              ['submitted', 'Submitted'],
            ] as const
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
      </div>

      {activeTab === 'liked' ? (
        <>
          {/* Toolbar */}
          <div className="mt-[78px] flex flex-col gap-2.5 sm:flex-row sm:items-center">
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
                <div className="absolute left-0 top-full z-40 mt-2 w-[300px] rounded-[18px] border border-line bg-white p-4 shadow-[0_18px_40px_-12px_rgba(27,42,65,0.25)]">
                  <div className="mb-3 flex flex-wrap gap-1.5">
                    {(
                      [
                        ['upcoming', 'Upcoming'],
                        ['week', 'This week'],
                        ['past', 'Past'],
                      ] as const
                    ).map(([kind, label]) => (
                      <button
                        key={kind}
                        className="chip h-8 px-3"
                        data-active={dateWindow.kind === kind}
                        onClick={() => {
                          setDateWindow({ kind });
                          setShowDateMenu(false);
                        }}
                      >
                        {label}
                      </button>
                    ))}
                  </div>
                  <DatePicker value={pickDate} onChange={setPickDate} placeholder="Select date" className="text-sm" />
                  <button
                    className="btn-navy btn-sm mt-3 w-full"
                    onClick={() => {
                      if (pickDate) setDateWindow({ kind: 'day', date: pickDate });
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

          {saved.length === 0 ? (
            <div className="mt-7 rounded-[22px] bg-sky-soft px-6 py-14 text-center">
              <p className="text-[24px] font-bold text-navy">
                {searchQuery ? <>No saved plans match &ldquo;{searchQuery}&rdquo;</> : <>Nothing saved {dateWindow.kind === 'past' ? 'in the past' : 'yet'}</>}
              </p>
              <p className="mx-auto mt-3 max-w-[420px] text-[14px] text-ink-muted">
                Tap the bookmark on any event or special and it&rsquo;ll show up here, sorted by day.
              </p>
              <Link href="/events" className="btn-sun mt-6">
                Browse what&rsquo;s on →
              </Link>
            </div>
          ) : (
            <div className="mt-7 flex flex-col gap-10 lg:flex-row lg:items-start lg:gap-14">
              {/* Saved events */}
              <div className="min-w-0 flex-1">
                <h2 className="text-[22px] font-bold tracking-[-0.01em] text-navy">Saved Events</h2>
                {savedEvents.length === 0 ? (
                  <p className="pt-6 text-[14px] text-ink-muted">No saved events{dateWindow.kind === 'past' ? ' in the past' : ''}.</p>
                ) : (
                  <>
                    {savedEventsByDate.map(([date, items], i) => (
                      <div key={date}>
                        <DayBand date={date} first={i === 0} />
                        {items.map((e) => (
                          <SavedEventRow key={e.id} event={e} onUnsave={() => unsave(e.id)} />
                        ))}
                      </div>
                    ))}
                    {savedEvents.length > EVENTS_PREVIEW && !showAllEvents && (
                      <button onClick={() => setShowAllEvents(true)} className="link-arrow mt-5 text-[14px]">
                        Show all {savedEvents.length} →
                      </button>
                    )}
                  </>
                )}
              </div>

              {/* Saved specials */}
              <div className="rounded-[25px] bg-[#f3f8fc] p-7 lg:w-[360px] lg:shrink-0">
                <h2 className="pb-2 text-[22px] font-bold tracking-[-0.01em] text-navy">Saved Specials</h2>
                {specialsCount === 0 ? (
                  <p className="pt-4 text-[13px] text-ink-muted">No saved specials{dateWindow.kind === 'past' ? ' in the past' : ''}.</p>
                ) : (
                  <>
                    {shownUpcoming.length > 0 && (
                      <>
                        <p className="pt-[30px] text-[12px] font-medium uppercase tracking-[0.14em] text-navy">
                          — {dateWindow.kind === 'past' ? 'Past' : 'Upcoming'}
                        </p>
                        {shownUpcoming.map((s) => (
                          <SavedSpecialRow
                            key={s.id}
                            event={s}
                            when={`${format(parseISO(s.date), 'EEE, MMM d')}  ·  ${specialHours(s)}`}
                            onUnsave={() => unsave(s.id)}
                          />
                        ))}
                      </>
                    )}
                    {shownRecurring.length > 0 && (
                      <>
                        <p className="pt-[30px] text-[12px] font-medium uppercase tracking-[0.14em] text-navy">
                          — Weekly recurring
                        </p>
                        {shownRecurring.map((s) => (
                          <SavedSpecialRow
                            key={s.seriesId ?? s.id}
                            event={s}
                            when={`${everyDaysLabel(s)}  ·  ${specialHours(s)}`}
                            onUnsave={() => unsave(s.id)}
                          />
                        ))}
                      </>
                    )}
                    {specialsCount > SPECIALS_PREVIEW && !showAllSpecials && (
                      <button onClick={() => setShowAllSpecials(true)} className="link-arrow mt-4 text-[14px]">
                        All {specialsCount} specials →
                      </button>
                    )}
                  </>
                )}
              </div>
            </div>
          )}
        </>
      ) : (
        <>
          <div className="mt-[78px] flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-[15px] text-ink-muted">
              Events and specials you&rsquo;ve sent in{hasVenueListings ? ', plus everything listed at your venues' : ''}. We review new
              submissions within 24 hours.
            </p>
            <Link href="/submit" className="btn-sun self-start sm:self-auto">
              + Submit new
            </Link>
          </div>

          {loadingSubmissions ? (
            <div className="flex justify-center py-16">
              <Loader2 size={32} className="animate-spin text-navy" />
            </div>
          ) : submissions.length === 0 ? (
            <div className="mt-8 rounded-[22px] bg-sky-soft px-6 py-14 text-center">
              <p className="text-[24px] font-bold text-navy">No submissions yet</p>
              <p className="mx-auto mt-3 max-w-[420px] text-[14px] text-ink-muted">
                Share what&rsquo;s happening at your venue — submit your first event or special.
              </p>
              <Link href="/submit" className="btn-sun mt-6">
                Submit an event →
              </Link>
            </div>
          ) : (
            <div className="mt-6 flex flex-col gap-10 lg:flex-row lg:items-start lg:gap-[14px]">
              <div className="flex min-w-0 flex-1 flex-col gap-[14px]">
                <h2 className="text-[22px] font-bold tracking-[-0.01em] text-navy">Submitted Events</h2>
                {submittedEventCards.length === 0 ? (
                  <p className="text-[14px] text-ink-muted">No events submitted yet.</p>
                ) : (
                  submittedEventCards.map((s) => <SubmissionCard key={s.key} submission={s} />)
                )}
              </div>
              <div className="flex min-w-0 flex-1 flex-col gap-[14px] rounded-[25px] bg-[#f3f8fc] p-5 sm:p-7">
                <h2 className="text-[22px] font-bold tracking-[-0.01em] text-navy">Submitted Specials</h2>
                {submittedSpecialCards.length === 0 ? (
                  <p className="text-[14px] text-ink-muted">No specials submitted yet.</p>
                ) : (
                  <div>
                    {submittedSpecialCards.map((s) => (
                      <SubmissionCard key={s.key} submission={s} variant="row" />
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}

function SubmissionCard({ submission, variant = 'card' }: { submission: Submission; variant?: 'card' | 'row' }) {
  const { event, status, untilDate } = submission;
  const special = isSpecial(event);
  const allDay = isAllDayEvent({ isAllDay: event.isAllDay, startTime: event.startTime });
  const time = allDay ? 'All day' : formatTime(event.startTime);
  const when = event.isRecurring
    ? `${pluralDaysLabel(event)}  ·  ${time}`
    : `${format(parseISO(event.date), 'EEE, MMM d')}  ·  ${time}`;
  const href = status === 'approved' ? `/events/${event.id}` : event.fromVenue ? null : `/events/${event.id}/edit`;
  const titleClass = 'text-[22px] font-bold leading-tight tracking-[-0.01em] text-navy';

  return (
    <div
      className={`flex flex-wrap items-center gap-x-5 gap-y-3 p-5 sm:flex-nowrap ${
        variant === 'card' ? 'rounded-[22px] border border-line bg-white' : 'border-b border-line last:border-b-0'
      }`}
    >
      <div className="flex min-w-0 basis-full flex-col gap-1.5 sm:basis-auto sm:flex-1">
        {href ? (
          <Link href={href} className={`${titleClass} hover:underline`}>
            {event.title}
          </Link>
        ) : (
          <p className={titleClass}>{event.title}</p>
        )}
        <p className="flex flex-wrap items-center gap-x-4 gap-y-1 whitespace-pre text-[14px] text-ink-muted">
          <span>{when}</span>
          <span className="flex items-center gap-1.5">
            <MapPin size={14} className="text-link" />
            {event.venue?.name}
          </span>
        </p>
        {status === 'rejected' ? (
          <div className="text-[13px] text-[#c25138]">
            <p className="font-medium">Not approved — edit and resubmit</p>
            {event.rejectionReason && (
              <p className="mt-1 whitespace-pre-line rounded-[10px] bg-[#ffe1da] px-3 py-2 text-[#ad290c]">
                <span className="font-bold">Note from our team:</span> {event.rejectionReason}
              </p>
            )}
          </div>
        ) : event.isRecurring && untilDate ? (
          <p className="text-[13px] font-medium text-link">
            Recurring {special ? 'special' : 'event'} · Until {format(parseISO(untilDate), 'MMM d, yyyy')}
          </p>
        ) : null}
      </div>
      {event.fromVenue && (
        <span className="tag shrink-0 bg-sky px-3 py-1.5 text-navy" title="Submitted by someone else at your venue">
          From your venue
        </span>
      )}
      <StatusPill status={status} />
      {status !== 'cancelled' && !event.fromVenue && (
        <Link
          href={`/events/${event.id}/edit`}
          className="inline-flex h-10 shrink-0 items-center gap-1.5 rounded-full border-[1.5px] border-navy px-4 text-[14px] font-medium text-navy transition-colors hover:bg-navy hover:text-white"
        >
          <Pencil size={15} /> Edit
        </Link>
      )}
    </div>
  );
}

export default function MyEventsPage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-[60vh] items-center justify-center">
          <Loader2 size={32} className="animate-spin text-navy" />
        </div>
      }
    >
      <MyEventsContent />
    </Suspense>
  );
}
