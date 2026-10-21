'use client';

import { useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import Link from 'next/link';
import { Calendar, Clock, Edit, ImageIcon, Loader2, MapPin, Repeat, Tag as TagIcon, Ticket, X } from 'lucide-react';
import { format, parseISO } from 'date-fns';
import type { Event, EventCategory, Venue } from '@/types/event';
import { categoryLabels, eventCategoryOptions, specialConditionCategories, isListingDetailCategory } from '@/constants/categories';
import { DatePicker } from '@/components';
import SmartImage from '@/components/ui/SmartImage';
import { CategoryTag, Tag, formatTime, isAllDayEvent } from '@/components/brand';
import { compressImage } from '@/utils/compression';
import { formatPrice, isFreePrice } from '@/utils/price';
import { getRecurrenceLabel } from '@/utils/recurrenceLabel';
import { DAY_SHORT } from '@/utils/recurrence';

export type EditScope = 'this' | 'future';

type SpecialType = 'food' | 'drink' | 'both' | 'happy-hour';

const SPECIAL_TYPES: { id: SpecialType; label: string }[] = [
  { id: 'food', label: 'Food' },
  { id: 'drink', label: 'Drinks' },
  { id: 'both', label: 'Food & drinks' },
  { id: 'happy-hour', label: 'Happy Hour' },
];

const EVENT_DETAIL_FLAGS: EventCategory[] = ['sold-out', 'rsvp'];
// Monday-first for the day picker
const WEEK_ORDER = [1, 2, 3, 4, 5, 6, 0];
// Match the Submit form's limits
const SUMMARY_MAX = 150;
const DESCRIPTION_MAX = 600;
// Older listings stored a summary of up to 90 characters as the description's first paragraph
const LEGACY_SUMMARY_MAX = 90;

export interface ListingDraft {
  title: string;
  summary: string;
  description: string;
  date: string;
  startTime: string;
  endTime: string;
  isAllDay: boolean;
  venueId: string;
  categories: EventCategory[];
  price: string;
  ticketUrl: string;
  imageUrl: string;
  recurrencePattern: string;
  recurrenceDays: number[];
  recurrenceEndDate: string;
}

export const isSpecialListing = (e: { categories: string[] }) => e.categories.includes('food-deal');

/** Short description and description, splitting older listings that stored "summary\n\ndescription" in one field */
export function splitDescription(event: Pick<Event, 'summary' | 'description'>): { summary: string; description: string } {
  const text = event.description || '';
  if (event.summary) return { summary: event.summary, description: text };
  const idx = text.indexOf('\n\n');
  if (idx === -1) {
    return text.length <= LEGACY_SUMMARY_MAX ? { summary: text, description: '' } : { summary: '', description: text };
  }
  return { summary: text.slice(0, idx).trim(), description: text.slice(idx + 2).trim() };
}

function toDraft(event: Event): ListingDraft {
  const { summary, description } = splitDescription(event);
  return {
    title: event.title,
    summary,
    description,
    date: event.date,
    startTime: event.startTime === '00:00' && event.isAllDay ? '' : event.startTime,
    endTime: event.endTime || '',
    isAllDay: isAllDayEvent(event),
    venueId: event.venue.id,
    categories: [...event.categories],
    price: event.price || '',
    ticketUrl: event.ticketUrl || '',
    imageUrl: event.imageUrl || '',
    recurrencePattern: event.recurrencePattern || 'weekly',
    recurrenceDays: event.recurrenceDays?.length ? [...event.recurrenceDays] : event.recurrenceDay !== undefined ? [event.recurrenceDay] : [],
    recurrenceEndDate: event.recurrenceEndDate || '',
  };
}

function recurrenceChanged(a: ListingDraft, b: ListingDraft) {
  return (
    a.recurrencePattern !== b.recurrencePattern ||
    JSON.stringify([...a.recurrenceDays].sort()) !== JSON.stringify([...b.recurrenceDays].sort()) ||
    a.recurrenceEndDate !== b.recurrenceEndDate
  );
}

function specialTypeOf(categories: string[]): SpecialType {
  if (categories.includes('happy-hour')) return 'happy-hour';
  const food = categories.includes('food');
  const drink = categories.includes('drink');
  return food && drink ? 'both' : drink ? 'drink' : 'food';
}

function specialTypeCategories(type: SpecialType): EventCategory[] {
  switch (type) {
    case 'drink':
      return ['drink'];
    case 'both':
      return ['food', 'drink'];
    case 'happy-hour':
      return ['food', 'drink', 'happy-hour'];
    default:
      return ['food'];
  }
}

const normalizeUrl = (url: string) => {
  const u = url.trim();
  if (!u) return '';
  return /^https?:\/\//.test(u) ? u : `https://${u}`;
};

function timeLabel(e: { isAllDay?: boolean; startTime: string; endTime?: string }) {
  if (isAllDayEvent(e)) return 'All day';
  return `${formatTime(e.startTime)}${e.endTime ? ` – ${formatTime(e.endTime)}` : ''}`;
}

function recurrenceText(event: Event) {
  if (!event.isRecurring) return 'One-time';
  const label = getRecurrenceLabel({
    recurrencePattern: event.recurrencePattern,
    recurrenceDays: event.recurrenceDays,
    recurrenceDay: event.recurrenceDay,
  });
  return `${label}${event.recurrenceEndDate ? ` · until ${format(parseISO(event.recurrenceEndDate), 'MMM d, yyyy')}` : ' · no end date'}`;
}

/* ---------------- Read-only views ---------------- */

function SummaryRow({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="grid grid-cols-1 gap-1 border-b border-line py-3 last:border-b-0 sm:grid-cols-[140px_1fr] sm:gap-4">
      <p className="text-[11px] font-medium uppercase tracking-[0.14em] text-ink-muted sm:pt-0.5">{label}</p>
      <div className="min-w-0 text-[14px] text-navy">{children}</div>
    </div>
  );
}

function categoryChips(event: Event) {
  const special = isSpecialListing(event);
  const shown = event.categories.filter((c) => c !== 'food-deal' && !(special && (c === 'food' || c === 'drink' || c === 'happy-hour')));
  return (
    <div className="flex flex-wrap gap-1.5">
      {special && <Tag className="bg-coral text-navy">{SPECIAL_TYPES.find((t) => t.id === specialTypeOf(event.categories))?.label}</Tag>}
      {shown.map((c) => (
        <CategoryTag key={c} category={c} />
      ))}
      {!special && shown.length === 0 && <span className="text-ink-muted">None picked</span>}
    </div>
  );
}

/** Everything the submitter entered on the Submit form, laid out cleanly */
export function ListingSummary({ event }: { event: Event }) {
  const { summary, description } = splitDescription(event);
  const pendingVenue = (event.venue as Venue & { status?: string }).status === 'pending';
  return (
    <div>
      <SummaryRow label={isSpecialListing(event) ? 'Special name' : 'Event title'}>
        <span className="text-[16px] font-bold">{event.title}</span>
      </SummaryRow>
      <SummaryRow label="Short description">{summary || <span className="text-ink-muted">—</span>}</SummaryRow>
      <SummaryRow label="Description">
        {description ? <p className="whitespace-pre-line">{description}</p> : <span className="text-ink-muted">—</span>}
      </SummaryRow>
      <SummaryRow label="Date">{format(parseISO(event.date), 'EEEE, MMMM d, yyyy')}</SummaryRow>
      <SummaryRow label="Time">{timeLabel(event)}</SummaryRow>
      <SummaryRow label="Recurring">{recurrenceText(event)}</SummaryRow>
      <SummaryRow label="Location">
        <span className="font-bold">{event.venue.name}</span>
        {pendingVenue && <span className="tag ml-2 bg-[#fff1d6] text-[#8a5a00]">New venue</span>}
        <span className="block text-[13px] text-ink-muted">{event.venue.address}</span>
      </SummaryRow>
      <SummaryRow label="Categories">{categoryChips(event)}</SummaryRow>
      <SummaryRow label={isSpecialListing(event) ? 'Deal / price' : 'Pricing'}>
        {event.price ? formatPrice(event.price) : <span className="text-ink-muted">Not listed</span>}
      </SummaryRow>
      {!isSpecialListing(event) && (
        <SummaryRow label="Ticket link">
          {event.ticketUrl ? (
            <a href={event.ticketUrl} target="_blank" rel="noopener noreferrer" className="break-all text-link hover:underline">
              {event.ticketUrl}
            </a>
          ) : (
            <span className="text-ink-muted">—</span>
          )}
        </SummaryRow>
      )}
      {event.imageUrl && (
        <SummaryRow label="Photo">
          <div className="relative h-32 w-48 overflow-hidden rounded-[12px] bg-sky">
            <SmartImage src={event.imageUrl} alt={event.title} sizes="192px" />
          </div>
        </SummaryRow>
      )}
    </div>
  );
}

/** The listing as a visitor sees it on its detail page */
export function ListingDetailView({ event }: { event: Event }) {
  const special = isSpecialListing(event);
  const displayPrice = formatPrice(event.price);
  const isFree = !displayPrice || isFreePrice(displayPrice);
  const tags = event.categories.filter(
    (c) => c !== 'food-deal' && !isListingDetailCategory(c) && !(special && (c === 'food' || c === 'drink'))
  );
  const conditions = specialConditionCategories.filter((c) => event.categories.includes(c));
  const recurrence = event.isRecurring
    ? getRecurrenceLabel({ recurrencePattern: event.recurrencePattern, recurrenceDays: event.recurrenceDays, recurrenceDay: event.recurrenceDay })
    : null;

  return (
    <div>
      <div className="flex flex-wrap gap-1.5">
        {special && <Tag className="bg-coral text-navy">{SPECIAL_TYPES.find((t) => t.id === specialTypeOf(event.categories))?.label}</Tag>}
        {tags.slice(0, 3).map((c) => (
          <CategoryTag key={c} category={c} />
        ))}
        {!special && isFree && <Tag className="bg-sky text-navy">Free</Tag>}
        {!special && event.categories.includes('rsvp') && <CategoryTag category="rsvp" />}
        {!special && event.categories.includes('sold-out') && <CategoryTag category="sold-out" />}
        {special && conditions.map((c) => <CategoryTag key={c} category={c} />)}
        {event.status === 'cancelled' && <Tag className="bg-danger text-white">Cancelled</Tag>}
      </div>
      <h2 className="mt-4 text-[clamp(2rem,4vw,52px)] font-bold uppercase leading-[0.92] tracking-[-0.035em] text-navy">{event.title}</h2>
      {special && <p className="mt-3 text-[16px] text-ink-muted">at {event.venue.name}</p>}

      <div className="mt-5 flex flex-wrap gap-2">
        <span className="info-pill">
          <Calendar size={14} className="text-link" />
          {format(parseISO(event.date), 'EEEE, MMMM d')}
        </span>
        <span className="info-pill">
          <Clock size={14} className="text-link" />
          {timeLabel(event)}
        </span>
        <span className="info-pill">
          <MapPin size={14} className="text-link" />
          {event.venue.name}
        </span>
        {!special && (
          <span className="info-pill">
            <Ticket size={14} className="text-link" />
            {isFree ? 'Free entry' : displayPrice}
          </span>
        )}
        {recurrence && (
          <span className="info-pill">
            <Repeat size={14} className="text-link" />
            {recurrence}
          </span>
        )}
      </div>

      <div className="mt-7 grid grid-cols-1 gap-8 lg:grid-cols-[1fr_300px]">
        <div className="min-w-0">
          <p className="eyebrow-sm">About this {special ? 'special' : 'event'}</p>
          <p className="mt-3 whitespace-pre-line text-[16px] leading-[1.6] text-navy">{event.description || event.summary}</p>
          {event.imageUrl && (
            <div className="relative mt-6 aspect-[16/9] overflow-hidden rounded-[18px] bg-sky-soft">
              <SmartImage src={event.imageUrl} alt={event.title} sizes="(max-width: 1024px) 100vw, 640px" />
            </div>
          )}
          <p className="eyebrow-sm mt-8">Venue</p>
          <div className="card mt-3 p-4">
            <p className="text-[17px] font-bold text-navy">{event.venue.name}</p>
            <p className="mt-0.5 text-[13px] text-ink-muted">{event.venue.address}</p>
          </div>
        </div>
        <aside className="flex flex-col gap-3 self-start">
          <div className="rounded-[20px] bg-navy p-5 text-white">
            <p className="eyebrow-bold text-sun">{special ? 'The deal' : 'Entry'}</p>
            <p className="mt-2 text-[26px] font-bold leading-tight tracking-[-0.02em]">
              {special ? displayPrice || event.title : isFree ? 'Free' : displayPrice}
            </p>
            {event.ticketUrl && (
              <a href={event.ticketUrl} target="_blank" rel="noopener noreferrer" className="mt-3 block truncate text-[12px] text-on-dark-muted hover:underline">
                {event.ticketUrl}
              </a>
            )}
          </div>
          <div className="card px-4 py-1 text-[13px]">
            <p className="border-b border-line py-3">
              <span className="block text-[11px] uppercase tracking-[0.14em] text-ink-muted">Date</span>
              {format(parseISO(event.date), 'EEEE, MMMM d, yyyy')}
            </p>
            <p className="border-b border-line py-3">
              <span className="block text-[11px] uppercase tracking-[0.14em] text-ink-muted">Repeats</span>
              {recurrenceText(event)}
            </p>
            <p className="py-3">
              <span className="block text-[11px] uppercase tracking-[0.14em] text-ink-muted">Saves</span>
              {event.likeCount ?? 0}
            </p>
          </div>
        </aside>
      </div>
    </div>
  );
}

/* ---------------- Editable form ---------------- */

function FieldBlock({ label, hint, children }: { label: string; hint?: string; children: ReactNode }) {
  return (
    <div>
      <p className="field-label">{label}</p>
      {children}
      {hint && <p className="field-hint mt-1.5">{hint}</p>}
    </div>
  );
}

export function ListingForm({
  draft,
  onChange,
  venues,
  special,
  isSeries,
}: {
  draft: ListingDraft;
  onChange: (d: ListingDraft) => void;
  venues: Pick<Venue, 'id' | 'name' | 'address'>[];
  special: boolean;
  isSeries: boolean;
}) {
  const set = (patch: Partial<ListingDraft>) => onChange({ ...draft, ...patch });
  const fileRef = useRef<HTMLInputElement>(null);
  const toggleCategory = (c: EventCategory) =>
    set({ categories: draft.categories.includes(c) ? draft.categories.filter((x) => x !== c) : [...draft.categories, c] });
  const specialType = specialTypeOf(draft.categories);

  return (
    <div className="flex flex-col gap-5">
      <FieldBlock label={special ? 'Special name' : 'Event title'}>
        <input className="field" value={draft.title} onChange={(e) => set({ title: e.target.value })} required />
      </FieldBlock>
      <FieldBlock label="Short description" hint={`${draft.summary.length} / ${SUMMARY_MAX} — shown on event cards and previews`}>
        <textarea className="field" rows={2} value={draft.summary} maxLength={SUMMARY_MAX} onChange={(e) => set({ summary: e.target.value })} />
      </FieldBlock>
      <FieldBlock label="Description" hint={`${draft.description.length} / ${DESCRIPTION_MAX} — shown on the event’s details page`}>
        <textarea
          className="field"
          rows={6}
          value={draft.description}
          maxLength={DESCRIPTION_MAX}
          onChange={(e) => set({ description: e.target.value })}
        />
      </FieldBlock>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <FieldBlock label={isSeries ? 'Date (this date)' : 'Date'}>
          <DatePicker value={draft.date} onChange={(v) => set({ date: v })} placeholder="Select date" />
        </FieldBlock>
        {!draft.isAllDay && (
          <>
            <FieldBlock label="Start time">
              <input type="time" className="field" value={draft.startTime} onChange={(e) => set({ startTime: e.target.value })} />
            </FieldBlock>
            <FieldBlock label="End time">
              <input type="time" className="field" value={draft.endTime} onChange={(e) => set({ endTime: e.target.value })} />
            </FieldBlock>
          </>
        )}
      </div>
      <label className="flex items-center gap-3 text-[14px] font-medium text-navy">
        <button type="button" className="switch" data-on={draft.isAllDay} onClick={() => set({ isAllDay: !draft.isAllDay })} aria-pressed={draft.isAllDay}>
          <span />
        </button>
        All day
      </label>

      {isSeries && (
        <div className="rounded-[16px] bg-sky-soft p-4">
          <p className="flex items-center gap-2 text-[14px] font-bold text-navy">
            <Repeat size={15} className="text-link" /> Recurring schedule
          </p>
          <p className="field-hint mt-1">Changing the schedule replaces upcoming dates that no longer fit and adds any that are missing.</p>
          <div className="mt-4 flex flex-col gap-4">
            <div className="flex flex-wrap gap-2">
              {(['weekly', 'biweekly', 'monthly'] as const).map((p) => (
                <button key={p} type="button" className="chip" data-active={draft.recurrencePattern === p} onClick={() => set({ recurrencePattern: p })}>
                  {p === 'weekly' ? 'Every week' : p === 'biweekly' ? 'Every 2 weeks' : 'Monthly'}
                </button>
              ))}
            </div>
            <div className="flex flex-wrap gap-1.5">
              {WEEK_ORDER.map((d) => {
                const on = draft.recurrenceDays.includes(d);
                return (
                  <button
                    key={d}
                    type="button"
                    className="chip h-9 w-12 justify-center px-0"
                    data-active={on}
                    onClick={() =>
                      set({
                        recurrenceDays: on
                          ? draft.recurrenceDays.filter((x) => x !== d)
                          : draft.recurrencePattern === 'monthly'
                          ? [d]
                          : [...draft.recurrenceDays, d],
                      })
                    }
                  >
                    {DAY_SHORT[d]}
                  </button>
                );
              })}
            </div>
            <FieldBlock label="Ends on" hint="Leave empty to keep it running (up to a year of dates).">
              <div className="flex items-center gap-2">
                <div className="flex-1">
                  <DatePicker value={draft.recurrenceEndDate} onChange={(v) => set({ recurrenceEndDate: v })} placeholder="No end date" min={draft.date} />
                </div>
                {draft.recurrenceEndDate && (
                  <button type="button" className="btn-ghost btn-sm" onClick={() => set({ recurrenceEndDate: '' })}>
                    Clear
                  </button>
                )}
              </div>
            </FieldBlock>
          </div>
        </div>
      )}

      <FieldBlock label="Location">
        <select className="field" value={draft.venueId} onChange={(e) => set({ venueId: e.target.value })}>
          {venues.map((v) => (
            <option key={v.id} value={v.id}>
              {v.name} — {v.address}
            </option>
          ))}
        </select>
      </FieldBlock>

      {special ? (
        <>
          <FieldBlock label="Type">
            <div className="flex flex-wrap gap-2">
              {SPECIAL_TYPES.map((t) => (
                <button
                  key={t.id}
                  type="button"
                  className="chip"
                  data-active={specialType === t.id}
                  onClick={() =>
                    set({
                      categories: [
                        ...draft.categories.filter((c) => c !== 'food' && c !== 'drink' && c !== 'happy-hour'),
                        ...specialTypeCategories(t.id),
                      ],
                    })
                  }
                >
                  {t.label}
                </button>
              ))}
            </div>
          </FieldBlock>
          <FieldBlock label="Conditions">
            <div className="flex flex-wrap gap-2">
              {[...specialConditionCategories, '19plus' as EventCategory].map((c) => (
                <button key={c} type="button" className="chip" data-active={draft.categories.includes(c)} onClick={() => toggleCategory(c)}>
                  {categoryLabels[c]}
                </button>
              ))}
            </div>
          </FieldBlock>
        </>
      ) : (
        <>
          <FieldBlock label="Categories">
            <div className="flex flex-wrap gap-2">
              {eventCategoryOptions.map((c) => (
                <button key={c} type="button" className="chip" data-active={draft.categories.includes(c)} onClick={() => toggleCategory(c)}>
                  {categoryLabels[c]}
                </button>
              ))}
            </div>
          </FieldBlock>
          <FieldBlock label="Listing details">
            <div className="flex flex-wrap gap-2">
              {EVENT_DETAIL_FLAGS.map((c) => (
                <button key={c} type="button" className="chip" data-active={draft.categories.includes(c)} onClick={() => toggleCategory(c)}>
                  {categoryLabels[c]}
                </button>
              ))}
            </div>
          </FieldBlock>
        </>
      )}

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <FieldBlock
          label={special ? 'Deal / price' : 'Pricing'}
          hint={special ? 'e.g. $5 pints, Half-price wings' : 'e.g. Free, 15, $10 advance · $15 door, Pay what you can'}
        >
          <input className="field" value={draft.price} onChange={(e) => set({ price: e.target.value })} placeholder="Not listed" />
        </FieldBlock>
        {!special && (
          <FieldBlock label="Ticket / RSVP link">
            <input className="field" value={draft.ticketUrl} onChange={(e) => set({ ticketUrl: e.target.value })} placeholder="https://" />
          </FieldBlock>
        )}
      </div>

      {!special && (
        <FieldBlock label="Photo">
          {draft.imageUrl ? (
            <div className="relative h-40 w-full max-w-[320px] overflow-hidden rounded-[14px] bg-sky">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={draft.imageUrl} alt="" className="h-full w-full object-cover" />
              <button
                type="button"
                onClick={() => set({ imageUrl: '' })}
                className="absolute right-2 top-2 flex h-7 w-7 items-center justify-center rounded-full bg-navy text-white"
                aria-label="Remove photo"
              >
                <X size={14} />
              </button>
            </div>
          ) : (
            <button type="button" onClick={() => fileRef.current?.click()} className="btn-ghost btn-sm">
              <ImageIcon size={14} /> Add photo
            </button>
          )}
          <input
            ref={fileRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={async (e) => {
              const file = e.target.files?.[0];
              if (file) set({ imageUrl: await compressImage(file) });
            }}
          />
        </FieldBlock>
      )}
    </div>
  );
}

/* ---------------- Editor ---------------- */

export interface ListingEditorProps {
  event: Event;
  /** "review" shows the submitted fields cleanly; "detail" looks like the public detail page */
  variant: 'review' | 'detail';
  venues: Pick<Venue, 'id' | 'name' | 'address'>[];
  /** Called with the saved listing after a successful save */
  onSaved: (event: Event | null, info: { scope: EditScope }) => void;
  /** Skip the "this date / all future dates" question (e.g. reviewing a whole series) */
  forceScope?: EditScope;
  /** Extra buttons shown beside Edit when not editing */
  actions?: ReactNode;
  onError?: (message: string) => void;
}

export default function ListingEditor({ event, variant, venues, onSaved, forceScope, actions, onError }: ListingEditorProps) {
  const original = useMemo(() => toDraft(event), [event]);
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState<ListingDraft>(original);
  const [saving, setSaving] = useState(false);
  const [askScope, setAskScope] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    setDraft(original);
  }, [original]);

  const special = isSpecialListing(event);
  const isSeries = Boolean(event.seriesId && event.isRecurring);
  const venueOptions = useMemo(() => {
    const list = venues.some((v) => v.id === event.venue.id) ? venues : [event.venue, ...venues];
    return [...list].sort((a, b) => a.name.localeCompare(b.name));
  }, [venues, event.venue]);
  const dirty = JSON.stringify(draft) !== JSON.stringify(original);
  const scheduleChanged = isSeries && recurrenceChanged(draft, original);

  const save = async (scope: EditScope) => {
    setAskScope(false);
    setError('');
    if (!draft.title.trim()) return setError('Add a title.');
    if (!draft.isAllDay && !draft.startTime) return setError('Add a start time, or mark it all day.');
    if (!special && !draft.categories.some((c) => eventCategoryOptions.includes(c))) return setError('Pick at least one category.');
    if (isSeries && scope === 'future' && draft.recurrenceDays.length === 0) return setError('Pick at least one day for the schedule.');

    const body: Record<string, unknown> = {
      title: draft.title.trim(),
      summary: draft.summary.trim() || null,
      description: draft.description.trim(),
      date: draft.date,
      startTime: draft.isAllDay ? '00:00' : draft.startTime,
      endTime: draft.isAllDay ? null : draft.endTime || null,
      isAllDay: draft.isAllDay,
      venueId: draft.venueId,
      categories: special ? [...new Set(['food-deal', ...draft.categories])] : draft.categories,
      price: draft.price.trim() || null,
      ...(special ? {} : { ticketUrl: normalizeUrl(draft.ticketUrl) || null }),
      ...(special || draft.imageUrl === original.imageUrl ? {} : { imageUrl: draft.imageUrl || null }),
      ...(isSeries && scope === 'future'
        ? {
            recurrencePattern: draft.recurrencePattern,
            recurrenceDays: draft.recurrenceDays,
            recurrenceEndDate: draft.recurrenceEndDate || null,
          }
        : {}),
    };

    setSaving(true);
    try {
      const res = await fetch(`/api/events/${event.id}?scope=${scope}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || 'Failed to save changes');
      setEditing(false);
      onSaved(data.event ?? null, { scope });
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to save changes';
      setError(message);
      onError?.(message);
    } finally {
      setSaving(false);
    }
  };

  const handleSave = () => {
    if (forceScope) return save(forceScope);
    if (!isSeries) return save('this');
    if (scheduleChanged) return save('future');
    setAskScope(true);
  };

  return (
    <div>
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <p className="eyebrow-sm">{editing ? 'Editing — admin' : variant === 'review' ? 'Submitted details' : 'Listing preview'}</p>
        <div className="flex flex-wrap gap-2">
          {editing ? (
            <>
              <button type="button" className="btn-ghost btn-sm" onClick={() => { setDraft(original); setEditing(false); setError(''); }} disabled={saving}>
                Discard
              </button>
              <button type="button" className="btn-navy btn-sm" onClick={handleSave} disabled={saving || !dirty}>
                {saving && <Loader2 size={13} className="animate-spin" />} Save changes
              </button>
            </>
          ) : (
            <>
              {actions}
              <button type="button" className="btn-outline btn-sm" onClick={() => setEditing(true)}>
                <Edit size={13} /> Edit
              </button>
            </>
          )}
        </div>
      </div>

      {error && <p className="mb-4 rounded-[12px] bg-danger-tint px-4 py-3 text-[13px] text-danger">{error}</p>}

      {editing ? (
        <ListingForm draft={draft} onChange={setDraft} venues={venueOptions} special={special} isSeries={isSeries && forceScope !== 'this'} />
      ) : variant === 'review' ? (
        <ListingSummary event={event} />
      ) : (
        <ListingDetailView event={event} />
      )}

      {askScope && (
        <div className="fixed inset-0 z-[70] flex items-center justify-center bg-navy/50 p-4" onClick={() => setAskScope(false)}>
          <div className="w-full max-w-md rounded-[22px] bg-white p-6" onClick={(e) => e.stopPropagation()}>
            <p className="text-[20px] font-bold text-navy">Update the recurring {special ? 'special' : 'event'}?</p>
            <p className="mt-2 text-[14px] text-ink-muted">
              This is part of a series ({recurrenceText(event)}). Choose which dates get your changes.
            </p>
            <div className="mt-5 flex flex-col gap-2">
              <button type="button" className="btn-navy w-full" onClick={() => save('future')}>
                <Repeat size={14} /> This &amp; all upcoming dates
              </button>
              <button type="button" className="btn-ghost w-full" onClick={() => save('this')}>
                Only {format(parseISO(event.date), 'EEE, MMM d')}
              </button>
              <button type="button" className="mt-1 text-[13px] text-ink-muted hover:text-navy" onClick={() => setAskScope(false)}>
                Keep editing
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export function ListingLink({ event }: { event: Event }) {
  return (
    <Link href={`/events/${event.id}`} target="_blank" className="link-arrow">
      <TagIcon size={12} /> Public page →
    </Link>
  );
}
