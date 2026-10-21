'use client';

/**
 * Kingston Happenings brand primitives, built to the Figma design system:
 * logo, tags, section headers, event cards, specials rows and decorative rings.
 */

import Link from 'next/link';
import Image from 'next/image';
import { Bookmark, Clock, MapPin, Ticket, User } from 'lucide-react';
import type { ReactNode } from 'react';
import type { Event, EventCategory } from '@/types/event';
import { categoryLabels, categoryTagStyles, isListingDetailCategory } from '@/constants/categories';
import { format, parseISO } from 'date-fns';

/* ---------------- Logo ---------------- */

export function LogoMark({ size = 26, className = '' }: { size?: number; className?: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 26 26" fill="none" className={className} aria-hidden>
      <circle cx="13" cy="13" r="11.375" stroke="#1B2A41" strokeWidth="2.6" />
      <circle cx="13" cy="13" r="7.3125" stroke="#3E7CA6" strokeWidth="2.4375" />
      <circle cx="13" cy="13" r="3.7375" stroke="#FF894A" strokeWidth="2.275" />
      <circle cx="13" cy="13" r="1.5437" fill="#FFB547" />
    </svg>
  );
}

export function Wordmark({ dark = false }: { dark?: boolean }) {
  return (
    <Link href="/" className="flex items-center gap-2.5 shrink-0">
      <LogoMark />
      <span className={`font-bold uppercase text-[15px] sm:text-[17px] tracking-[0.01em] ${dark ? 'text-white' : 'text-navy'}`}>
        Kingston <span className="text-sun">Happenings</span>
      </span>
    </Link>
  );
}

/* ---------------- Tags ---------------- */

export function CategoryTag({ category, className = '' }: { category: EventCategory; className?: string }) {
  return (
    <span className={`tag ${categoryTagStyles[category] ?? 'bg-sky text-navy'} ${className}`}>
      {categoryLabels[category] ?? category}
    </span>
  );
}

export function Tag({ children, className = 'bg-sky text-navy' }: { children: ReactNode; className?: string }) {
  return <span className={`tag ${className}`}>{children}</span>;
}

export function DKMark({ size = 16 }: { size?: number }) {
  return (
    <span
      className="inline-flex items-center justify-center rounded-full bg-white shrink-0 overflow-hidden"
      style={{ width: size, height: size }}
    >
      <Image src="/dk-logo.png" alt="" width={Math.round(size * 0.7)} height={Math.round(size * 0.7)} />
    </span>
  );
}

export function DowntownTag() {
  return (
    <span className="tag bg-[#db3247] text-white pl-1">
      <DKMark />
      Downtown Kingston
    </span>
  );
}

/** Venue is flagged by an admin as part of the Downtown Kingston business district */
export function isDowntown(venue?: { isDowntownDistrict?: boolean } | null) {
  return !!venue?.isDowntownDistrict;
}

/** Pick the first category that isn't the generic food-deal marker */
export function primaryCategory(event: Event): EventCategory | undefined {
  return (
    event.categories.find((c) => c !== 'food-deal' && !isListingDetailCategory(c)) ??
    event.categories.find((c) => c !== 'food-deal') ??
    event.categories[0]
  );
}

/* ---------------- Section header ---------------- */

export function SectionHeader({
  eyebrow,
  title,
  aside,
  className = '',
  titleClassName = 'display-section',
}: {
  eyebrow?: ReactNode;
  title: ReactNode;
  aside?: ReactNode;
  className?: string;
  titleClassName?: string;
}) {
  return (
    <div className={className}>
      {eyebrow && <p className="eyebrow mb-3.5">— {eyebrow}</p>}
      <div className="flex flex-col gap-6 sm:flex-row sm:items-end sm:justify-between">
        <h2 className={titleClassName}>{title}</h2>
        {aside && <div className="flex flex-col items-start gap-3.5 sm:items-end pb-2">{aside}</div>}
      </div>
    </div>
  );
}

/* ---------------- Time helpers ---------------- */

export function splitTime(time?: string): { clock: string; meridiem: string } {
  if (!time) return { clock: '', meridiem: '' };
  const d = parseISO(`2000-01-01T${time}`);
  return { clock: format(d, 'h:mm'), meridiem: format(d, 'a') };
}

export function formatTime(time?: string) {
  if (!time) return '';
  return format(parseISO(`2000-01-01T${time}`), 'h:mm a');
}

export function formatTimeShort(time?: string) {
  if (!time) return '';
  const d = parseISO(`2000-01-01T${time}`);
  return format(d, d.getMinutes() === 0 ? 'ha' : 'h:mma').toLowerCase();
}

export function isAllDayEvent(event: Pick<Event, 'isAllDay' | 'startTime'>) {
  return !!event.isAllDay || event.startTime === '00:00';
}

/* ---------------- Event card (grid) ---------------- */

export function TimeCard({
  event,
  subtitle,
  href,
}: {
  event: Event;
  subtitle?: string;
  href?: string;
}) {
  const allDay = isAllDayEvent(event);
  const { clock, meridiem } = splitTime(event.startTime);
  const cat = primaryCategory(event);
  return (
    <Link
      href={href ?? `/events/${event.id}`}
      className="card card-hover flex h-[200px] flex-col justify-between p-6 hover:border-navy/30"
    >
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-baseline gap-1 text-navy">
          {allDay ? (
            <span className="text-[28px] font-bold tracking-[-0.03em]">All day</span>
          ) : (
            <>
              <span className="text-[34px] font-bold tracking-[-0.03em] leading-none">{clock}</span>
              <span className="text-[13px] font-medium">{meridiem}</span>
            </>
          )}
        </div>
        {cat && <CategoryTag category={cat} />}
      </div>
      <div className="flex flex-col gap-2 min-w-0">
        <p className="text-[22px] font-bold tracking-[-0.01em] text-navy leading-tight line-clamp-2">{event.title}</p>
        <p className="text-[16px] text-ink-muted truncate">{subtitle ?? event.venue?.name}</p>
      </div>
    </Link>
  );
}

/* ---------------- Event card that expands on hover (homepage grid) ---------------- */

/** Human-readable duration from start/end times, e.g. "2 hrs" or "90 min" */
export function eventDurationLabel(event: Pick<Event, 'startTime' | 'endTime' | 'isAllDay'>) {
  if (!event.endTime || isAllDayEvent(event)) return null;
  const toMin = (t: string) => {
    const [h, m] = t.split(':').map(Number);
    return h * 60 + m;
  };
  let mins = toMin(event.endTime) - toMin(event.startTime);
  if (mins <= 0) mins += 24 * 60; // runs past midnight
  if (mins < 60) return `${mins} min`;
  const hrs = Math.round((mins / 60) * 2) / 2;
  return `${hrs} ${hrs === 1 ? 'hr' : 'hrs'}`;
}

function eventAgesLabel(event: Event) {
  if (event.categories.includes('19plus')) return '19+';
  if (event.categories.includes('family')) return 'All ages';
  return null;
}

/**
 * Figma "Event card": State=Default in the grid, State=Hover reveals the
 * description, price/ages/duration facts and View / Save actions. The expanded
 * card floats over its neighbours so the grid doesn't reflow.
 */
export function ExpandableTimeCard({
  event,
  saved,
  onToggleSave,
}: {
  event: Event;
  saved: boolean;
  onToggleSave: () => void;
}) {
  const allDay = isAllDayEvent(event);
  const { clock, meridiem } = splitTime(event.startTime);
  const cat = primaryCategory(event);
  const href = `/events/${event.id}`;
  const ages = eventAgesLabel(event);
  const duration = eventDurationLabel(event);

  return (
    <div className="group relative h-[200px] hover:z-20 focus-within:z-20">
      <div className="card absolute inset-x-0 top-0 flex min-h-[200px] flex-col p-6 transition-[border-color,box-shadow] duration-200 group-hover:border-[1.5px] group-hover:border-navy group-hover:p-[23.5px] group-hover:shadow-[0_14px_16px_rgba(27,42,65,0.14)] group-focus-within:border-[1.5px] group-focus-within:border-navy group-focus-within:p-[23.5px] group-focus-within:shadow-[0_14px_16px_rgba(27,42,65,0.14)]">
        {/* Whole card is clickable; buttons sit above this link */}
        <Link href={href} aria-label={event.title} className="absolute inset-0 z-0 rounded-[22px]" />

        <div className="flex items-center justify-between gap-3">
          <div className="flex items-baseline gap-1 text-navy">
            {allDay ? (
              <span className="text-[28px] font-bold tracking-[-0.03em]">All day</span>
            ) : (
              <>
                <span className="text-[34px] font-bold tracking-[-0.03em] leading-none">{clock}</span>
                <span className="text-[13px] font-medium">{meridiem}</span>
              </>
            )}
          </div>
          {cat && <CategoryTag category={cat} />}
        </div>
        <div className="min-h-4 flex-1 group-hover:min-h-[51px] group-focus-within:min-h-[51px]" aria-hidden />
        <div className="flex min-w-0 flex-col gap-2">
          <p className="text-[22px] font-bold tracking-[-0.01em] text-navy leading-tight line-clamp-2 group-hover:line-clamp-none">
            {event.title}
          </p>
          <p className="text-[16px] text-ink-muted truncate">{event.venue?.name}</p>
        </div>

        <div className="hidden group-hover:block group-focus-within:block">
          <div className="mt-5 flex flex-col gap-4 border-t border-line pt-5">
            {event.description && (
              <p className="text-[16px] leading-[1.5] text-ink-muted line-clamp-3">{event.description}</p>
            )}
            {(event.price || ages || duration) && (
              <div className="flex flex-wrap gap-x-5 gap-y-2 text-[13px] font-medium text-navy">
                {event.price && (
                  <span className="flex items-center gap-1.5">
                    <Ticket size={16} className="text-link" />
                    {event.price}
                  </span>
                )}
                {ages && (
                  <span className="flex items-center gap-1.5">
                    <User size={16} className="text-link" />
                    {ages}
                  </span>
                )}
                {duration && (
                  <span className="flex items-center gap-1.5">
                    <Clock size={16} className="text-link" />
                    {duration}
                  </span>
                )}
              </div>
            )}
            <div className="relative z-10 flex gap-2.5 pt-1">
              <Link href={href} className="btn-sun flex-1">
                View event →
              </Link>
              <SaveButton variant="circle" saved={saved} onClick={onToggleSave} />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ---------------- Specials row (homepage list) ---------------- */

export function specialHoursLabel(event: Event) {
  if (isAllDayEvent(event)) return 'All day';
  const start = formatTimeShort(event.startTime);
  if (!event.endTime) return `From ${start}`;
  return `${start} – ${formatTimeShort(event.endTime)}`;
}

/** True once a special's end time has passed today (all-day / open-ended specials never end early) */
export function hasSpecialEnded(event: Event, now: Date = new Date()) {
  if (isAllDayEvent(event) || !event.endTime) return false;
  const today = format(now, 'yyyy-MM-dd');
  if (event.date !== today) return event.date < today;
  // An end time before the start time means the special runs past midnight
  if (event.endTime <= event.startTime) return false;
  return event.endTime <= format(now, 'HH:mm');
}

/**
 * Figma "Specials row". With `revealOnHover`, hovering shows the deal
 * description and a "View special" button (State=Hover).
 */
export function SpecialRow({
  event,
  tone = 'navy',
  revealOnHover = false,
}: {
  event: Event;
  tone?: 'navy' | 'line';
  revealOnHover?: boolean;
}) {
  return (
    <Link
      href={`/events/${event.id}`}
      className={`group flex flex-col gap-3 py-6 px-1 sm:flex-row sm:items-center sm:gap-5 sm:h-[90px] sm:py-0 border-b ${
        tone === 'navy' ? 'border-navy' : 'border-line'
      }`}
    >
      <div className="flex min-w-0 flex-1 items-center gap-8 sm:h-full">
        <p
          className={`min-w-0 text-[24px] sm:text-[30px] font-bold leading-[1.1] tracking-[-0.02em] text-navy ${
            revealOnHover
              ? 'sm:flex-1 sm:truncate sm:group-hover:flex-none sm:group-hover:max-w-[45%] sm:group-focus-visible:flex-none sm:group-focus-visible:max-w-[45%]'
              : 'flex-1 group-hover:underline decoration-2 underline-offset-4'
          }`}
        >
          {event.title}
        </p>
        {revealOnHover && event.description && (
          <p className="hidden min-w-0 flex-1 text-[16px] leading-[1.5] text-ink-muted line-clamp-2 sm:group-hover:[display:-webkit-box] sm:group-focus-visible:[display:-webkit-box]">
            {event.description}
          </p>
        )}
      </div>
      <div className="flex items-center gap-[15px]">
        {revealOnHover && (
          <span className="hidden h-9 shrink-0 items-center rounded-full bg-sun px-4 text-[13px] font-bold text-navy whitespace-nowrap sm:group-hover:inline-flex sm:group-focus-visible:inline-flex sm:mr-5">
            View special →
          </span>
        )}
        <div className="flex items-center gap-1.5 sm:w-[210px] text-ink-muted">
          <MapPin size={16} className="text-link shrink-0" />
          <span className="truncate text-[16px]">{event.venue?.name}</span>
        </div>
        <div className="flex sm:w-[130px] justify-end">
          <span className="inline-flex items-center gap-1.5 rounded-full pl-3 pr-3.5 py-[7px] text-[12px] font-bold uppercase tracking-[0.08em] text-navy">
            <Clock size={14} />
            {specialHoursLabel(event)}
          </span>
        </div>
      </div>
    </Link>
  );
}

/* ---------------- Save (bookmark) button ---------------- */

export function SaveButton({
  saved,
  onClick,
  variant = 'plain',
  size = 18,
  className = '',
}: {
  saved: boolean;
  onClick: (e: React.MouseEvent) => void;
  variant?: 'plain' | 'circle' | 'circle-dark';
  size?: number;
  className?: string;
}) {
  const base =
    variant === 'circle'
      ? 'h-11 w-11 rounded-full border-[1.5px] border-navy text-navy hover:bg-navy hover:text-white'
      : variant === 'circle-dark'
      ? 'h-[46px] w-[46px] rounded-full border-[1.5px] border-white text-white hover:bg-white hover:text-navy'
      : 'h-8 w-8 rounded-full text-ink-muted hover:text-navy';
  return (
    <button
      type="button"
      onClick={(e) => {
        e.preventDefault();
        e.stopPropagation();
        onClick(e);
      }}
      aria-pressed={saved}
      aria-label={saved ? 'Remove from saved' : 'Save'}
      title={saved ? 'Saved' : 'Save'}
      className={`inline-flex items-center justify-center shrink-0 transition-colors ${base} ${className}`}
    >
      <Bookmark size={size} className={saved ? 'fill-current' : ''} />
    </button>
  );
}

/* ---------------- Decorative concentric rings ---------------- */

export function Rings({ className = '' }: { className?: string }) {
  return (
    <svg viewBox="0 0 400 400" className={className} aria-hidden>
      <circle cx="200" cy="200" r="185" fill="none" stroke="#3b4a60" strokeWidth="18" />
      <circle cx="200" cy="200" r="140" fill="none" stroke="#3e8fd6" strokeWidth="18" />
      <circle cx="200" cy="200" r="95" fill="none" stroke="#ff8a4a" strokeWidth="18" />
      <circle cx="200" cy="200" r="42" fill="#ffb547" />
    </svg>
  );
}

/* ---------------- Empty state ---------------- */

export function EmptyPanel({ icon, title, children }: { icon?: ReactNode; title: string; children?: ReactNode }) {
  return (
    <div className="rounded-[22px] bg-sky-soft px-6 py-14 text-center">
      {icon && (
        <div className="mx-auto mb-5 flex h-[52px] w-[52px] items-center justify-center rounded-full bg-white text-navy">
          {icon}
        </div>
      )}
      <p className="text-[22px] font-bold text-navy">{title}</p>
      {children && <div className="mt-3 text-[14px] text-ink-muted">{children}</div>}
    </div>
  );
}
