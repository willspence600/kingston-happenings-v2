'use client';

import { useState, useRef, useEffect, Suspense, type ReactNode } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import {
  Calendar,
  CalendarDays,
  Clock,
  MapPin,
  Upload,
  Link as LinkIcon,
  Check,
  AlertCircle,
  Loader2,
  X,
  Lock,
  Utensils,
  Building2,
  ChevronUp,
  ChevronDown,
  Pencil,
  ShieldCheck,
} from 'lucide-react';
import type { Event, EventCategory, Venue } from '@/types/event';
import {
  categoryLabels,
  categoryTagStyles,
  eventCategoryOptions,
  specialConditionCategories,
} from '@/constants/categories';
import { useAuth } from '@/contexts/AuthContext';
import { useEvents } from '@/contexts/EventsContext';
import { useOrganizerVerification } from '@/hooks/useOrganizerVerification';
import { supabase } from '@/lib/supabaseClient';
import { normalizeApplication, type OrganizerApplication } from '@/lib/organizerApplication';
import { DatePicker, VenueSelector } from '@/components';
import { addDays, parseISO, format } from 'date-fns';
import { compressImage } from '@/utils/compression';
import { generateId, normalizeUrl } from '@/utils/formatting';
import { formatPrice } from '@/utils/price';
import { Tag, formatTime } from '@/components/brand';

type FormType = 'event' | 'special';
type PriceType = '' | 'free' | 'paid' | 'pwyc' | 'cover' | 'free-rsvp';
type EventRecurrence = 'weekly' | 'monthly' | 'custom';
type SpecialType = 'food' | 'drink' | 'both' | 'happy-hour';
type SpecialFrequency = 'weekly' | 'once' | 'dates';

const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
// Monday-first for the day picker
const weekOrder = [1, 2, 3, 4, 5, 6, 0];

const MAX_CATEGORIES = 3;
const LIMITS = {
  eventTitle: 40,
  specialName: 30,
  deal: 30,
  summary: 90,
  description: 250,
};

const VERIFICATION_EMAIL = 'kingstonhappenings.ca@gmail.com';

interface PriceTier {
  id: string;
  label: string;
  amount: string;
}

interface VenueFields {
  venueId: string;
  newVenueName: string;
  newVenueAddress: string;
  newVenueIsDowntown: boolean;
  /** Organizer chose "Search all venues" instead of posting for their own venue */
  searchAllVenues: boolean;
}

interface EventFormData extends VenueFields {
  id: string;
  title: string;
  summary: string;
  description: string;
  date: string;
  startTime: string;
  endTime: string;
  categories: EventCategory[];
  priceType: PriceType;
  priceAmount: string;
  priceTiers: PriceTier[];
  ticketUrl: string;
  rsvpRequired: boolean;
  rsvpUrl: string;
  soldOut: boolean;
  imagePreview: string;
  isRecurring: boolean;
  recurrencePattern: EventRecurrence;
  recurrenceEndDate: string;
  customDates: string[];
  isAllDay: boolean;
}

interface SpecialFormData extends VenueFields {
  id: string;
  title: string;
  deal: string;
  summary: string;
  description: string;
  type: SpecialType;
  frequency: SpecialFrequency;
  recurringDays: number[];
  date: string;
  specificDates: string[];
  startTime: string;
  endTime: string;
  isAllDay: boolean;
  recurrenceEndDate: string;
  conditions: EventCategory[];
  is19Plus: boolean;
}

const emptyVenueFields = (venueId = ''): VenueFields => ({
  venueId,
  newVenueName: '',
  newVenueAddress: '',
  newVenueIsDowntown: false,
  searchAllVenues: false,
});

const createEmptyForm = (venueId = ''): EventFormData => ({
  ...emptyVenueFields(venueId),
  id: generateId(),
  title: '',
  summary: '',
  description: '',
  date: '',
  startTime: '',
  endTime: '',
  categories: [],
  priceType: '',
  priceAmount: '',
  priceTiers: [],
  ticketUrl: '',
  rsvpRequired: false,
  rsvpUrl: '',
  soldOut: false,
  imagePreview: '',
  isRecurring: false,
  recurrencePattern: 'weekly',
  recurrenceEndDate: '',
  customDates: [],
  isAllDay: false,
});

const createEmptySpecialForm = (venueId = ''): SpecialFormData => ({
  ...emptyVenueFields(venueId),
  id: generateId(),
  title: '',
  deal: '',
  summary: '',
  description: '',
  type: 'food',
  frequency: 'weekly',
  recurringDays: [],
  date: '',
  specificDates: [],
  startTime: '',
  endTime: '',
  isAllDay: false,
  recurrenceEndDate: '',
  conditions: [],
  is19Plus: false,
});

/** The short summary leads the description, so it's what Browse cards and previews show */
const composeDescription = (summary: string, description: string) =>
  [summary.trim(), description.trim()].filter(Boolean).join('\n\n');

function buildEventPrice(form: EventFormData): string | undefined {
  const amount = form.priceAmount.trim();
  switch (form.priceType) {
    case 'free':
      return 'Free';
    case 'free-rsvp':
      return 'Free with RSVP';
    case 'pwyc':
      return 'Pay what you can';
    case 'cover':
      return amount ? `${formatPrice(amount)} cover at the door` : 'Cover at the door';
    case 'paid': {
      const tiers = form.priceTiers
        .filter((t) => t.amount.trim())
        .map((t) => `${t.label.trim() ? `${t.label.trim()} ` : ''}${formatPrice(t.amount.trim())}`);
      if (tiers.length === 0) return amount || undefined;
      return [amount ? formatPrice(amount) : '', ...tiers].filter(Boolean).join(' · ');
    }
    default:
      return undefined;
  }
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

const specialTypeLabels: Record<SpecialType, string> = {
  food: 'Food',
  drink: 'Drinks',
  both: 'Food & drinks',
  'happy-hour': 'Happy Hour',
};

/* ---------------- UI helpers ---------------- */

function Section({
  number,
  title,
  children,
  sectionRef,
}: {
  number: number;
  title: string;
  children: ReactNode;
  sectionRef?: (el: HTMLElement | null) => void;
}) {
  return (
    <section ref={sectionRef} className="card p-5 sm:p-7">
      <h3 className="flex items-center gap-3 text-[20px] font-bold text-navy">
        <span className="flex h-7 w-7 items-center justify-center rounded-full bg-navy text-[13px] font-bold text-white">
          {number}
        </span>
        {title}
      </h3>
      <div className="mt-5 flex flex-col gap-5">{children}</div>
    </section>
  );
}

function Helper({ hint, length, max }: { hint?: string; length?: number; max?: number }) {
  return (
    <div className="mt-1.5 flex justify-between gap-4">
      <span className="field-hint">{hint}</span>
      {max !== undefined && (
        <span className="field-hint shrink-0 tabular-nums">
          {length ?? 0} / {max}
        </span>
      )}
    </div>
  );
}

function Toggle({ on, onChange, label, hint }: { on: boolean; onChange: (v: boolean) => void; label: string; hint?: string }) {
  return (
    <div className="flex items-start gap-3">
      <button type="button" className="switch mt-0.5" data-on={on} onClick={() => onChange(!on)} aria-pressed={on} aria-label={label}>
        <span />
      </button>
      <div>
        <p className="text-[14px] font-medium text-navy">{label}</p>
        {hint && <p className="field-hint">{hint}</p>}
      </div>
    </div>
  );
}

function ChipGroup<T extends string>({
  options,
  value,
  onChange,
}: {
  options: { id: T; label: string }[];
  value: T;
  onChange: (v: T) => void;
}) {
  return (
    <div className="flex flex-wrap gap-2">
      {options.map((o) => (
        <button key={o.id} type="button" className="chip" data-active={value === o.id} onClick={() => onChange(o.id)}>
          {o.label}
        </button>
      ))}
    </div>
  );
}

function TimeInput({ id, value, onChange, required }: { id: string; value: string; onChange: (v: string) => void; required?: boolean }) {
  return (
    <div className="relative">
      <Clock size={16} className="pointer-events-none absolute left-4 top-1/2 z-10 -translate-y-1/2 text-link" />
      <input type="time" id={id} required={required} value={value} onChange={(e) => onChange(e.target.value)} className="field pl-10" />
    </div>
  );
}

function DateList({
  dates,
  onChange,
  min,
  placeholder,
}: {
  dates: string[];
  onChange: (dates: string[]) => void;
  min?: string;
  placeholder: string;
}) {
  return (
    <div>
      {dates.length > 0 && (
        <div className="mb-3 flex flex-wrap gap-2">
          {dates.map((date) => (
            <span key={date} className="chip h-8" data-active="true">
              {format(parseISO(date), 'EEE, MMM d')}
              <button type="button" onClick={() => onChange(dates.filter((d) => d !== date))} aria-label="Remove date">
                <X size={13} />
              </button>
            </span>
          ))}
        </div>
      )}
      <DatePicker
        value=""
        onChange={(value) => {
          if (value && !dates.includes(value)) onChange([...dates, value].sort());
        }}
        min={min}
        placeholder={placeholder}
      />
    </div>
  );
}

/* ---------------- Organizer venue ---------------- */


function VenueSummary({
  venue,
  application,
  date,
  canEditVenue,
}: {
  venue: Venue;
  application: OrganizerApplication | null;
  date: string;
  canEditVenue: boolean;
}) {
  const [open, setOpen] = useState(true);
  const [confirmed, setConfirmed] = useState(false);

  const day = format(date ? parseISO(date) : new Date(), 'EEE');
  // Venue details live on the venue; fall back to what the organizer gave when applying
  const applied = application?.venues.find((v) => v.claimedVenueId === venue.id || v.name.trim().toLowerCase() === venue.name.trim().toLowerCase());
  const hours = venue.hours?.[day] ?? applied?.hours?.[day];
  const accessibility = venue.accessibility?.length ? venue.accessibility : application?.accessibility;
  const details: [string, string][] = [
    ['Address', `${venue.address}${venue.neighborhood ? ` · ${venue.neighborhood}` : ''}`],
  ];
  if (hours) {
    details.push(['Hours on this day', hours.closed ? `${day} · Closed` : `${day} ${formatTime(hours.open)} – ${formatTime(hours.close)}`]);
  }
  if (accessibility?.length) details.push(['Accessibility', accessibility.join(' · ')]);
  if (venue.website) details.push(['Website', venue.website.replace(/^https?:\/\//, '')]);

  const editHref = canEditVenue
    ? `/venues/${venue.id}`
    : `mailto:${VERIFICATION_EMAIL}?subject=${encodeURIComponent(`Venue details update: ${venue.name}`)}&body=${encodeURIComponent(
    `Hi! Some details for ${venue.name} have changed:\n\n`
  )}`;

  return (
    <div className="overflow-hidden rounded-[16px] bg-[#f3f8fc]">
      <div className="flex items-center gap-3 px-4 py-3.5">
        <Building2 size={18} className="shrink-0 text-link" />
        <div className="min-w-0 flex-1">
          <p className="text-[14px] font-bold text-navy">Your venue details</p>
          <p className="text-[13px] text-ink-muted">
            {confirmed ? 'Thanks for checking. These are added to your listing automatically.' : 'These are added to your listing automatically. Check they’re still right.'}
          </p>
        </div>
        <button
          type="button"
          onClick={() => setOpen((o) => !o)}
          className="flex shrink-0 items-center gap-1 text-[13px] font-medium text-link hover:underline"
        >
          {open ? 'Hide' : 'Show'}
          {open ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
        </button>
      </div>
      {open && (
        <>
          <div className="grid grid-cols-1 gap-x-6 gap-y-4 pb-4 pl-[46px] pr-4 pt-1 sm:grid-cols-2">
            {details.map(([label, value]) => (
              <div key={label} className="min-w-0">
                <p className="text-[12px] font-medium uppercase tracking-[0.14em] text-[#6d7682]">{label}</p>
                <p className="mt-[3px] break-words text-[14px] text-navy">{value}</p>
              </div>
            ))}
          </div>
          <div className="flex flex-wrap items-center gap-4 border-t border-[#dce7f1] py-3 pl-[46px] pr-4">
            <button
              type="button"
              onClick={() => {
                setConfirmed(true);
                setOpen(false);
              }}
              className="inline-flex items-center gap-1.5 rounded-full bg-navy px-3.5 py-[7px] text-[13px] font-medium text-white"
            >
              <Check size={13} strokeWidth={2.5} /> Looks right
            </button>
            <a href={editHref} className="inline-flex items-center gap-1.5 text-[13px] font-medium text-link hover:underline">
              <Pencil size={14} /> Something changed? Edit venue details
            </a>
          </div>
        </>
      )}
    </div>
  );
}

function LocationFields({
  idPrefix,
  form,
  update,
  venues,
  organizerVenues,
  linkedVenueIds,
  application,
  noun,
}: {
  idPrefix: string;
  form: VenueFields & { id: string; date: string };
  update: (updates: Partial<VenueFields>) => void;
  venues: Venue[];
  organizerVenues: Venue[];
  linkedVenueIds: string[];
  application: OrganizerApplication | null;
  noun: 'event' | 'special';
}) {
  const organizerVenue = form.searchAllVenues ? undefined : organizerVenues.find((v) => v.id === form.venueId);
  const postingForOwnVenue = !!organizerVenue;
  return (
    <>
      <VenueSelector
        venues={venues}
        selectedVenueId={form.venueId}
        newVenueName={form.newVenueName}
        newVenueAddress={form.newVenueAddress}
        newVenueIsDowntown={form.newVenueIsDowntown}
        onVenueSelect={(venueId) => update({ venueId })}
        onNewVenueNameChange={(newVenueName) => update({ newVenueName })}
        onNewVenueAddressChange={(newVenueAddress) => update({ newVenueAddress })}
        onNewVenueIsDowntownChange={(newVenueIsDowntown) => update({ newVenueIsDowntown })}
        label={postingForOwnVenue ? 'Posting for' : 'Venue'}
        placeholder="Search venues…"
        required
        id={`${idPrefix}-${form.id}`}
      />
      {postingForOwnVenue && organizerVenue ? (
        <>
          {organizerVenues.length > 1 && (
            <div className="flex flex-wrap gap-2">
              {organizerVenues.map((v) => (
                <button key={v.id} type="button" className="chip" data-active={v.id === organizerVenue.id} onClick={() => update({ venueId: v.id })}>
                  {v.name}
                </button>
              ))}
            </div>
          )}
          <VenueSummary venue={organizerVenue} application={application} date={form.date} canEditVenue={linkedVenueIds.includes(organizerVenue.id)} />
          <button
            type="button"
            onClick={() => update({ ...emptyVenueFields(), searchAllVenues: true })}
            className="self-start text-[13px] font-medium text-link hover:underline"
          >
            Posting somewhere else? Search all venues
          </button>
        </>
      ) : (
        <p className="text-[13px] font-medium text-link">
          Can&rsquo;t find your venue? Add a new one and we&rsquo;ll review it with your {noun}.
        </p>
      )}
    </>
  );
}

function PhotoField({
  preview,
  onSelect,
  onRemove,
}: {
  preview: string;
  onSelect: (file: File) => void;
  onRemove: () => void;
}) {
  const inputRef = useRef<HTMLInputElement | null>(null);
  return (
    <div>
      <p className="field-label">Photo (optional)</p>
      {preview ? (
        <div className="relative overflow-hidden rounded-[14px]">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={preview} alt="Event preview" className="h-48 w-full object-cover" />
          <button
            type="button"
            onClick={() => {
              onRemove();
              if (inputRef.current) inputRef.current.value = '';
            }}
            className="absolute right-2 top-2 flex h-8 w-8 items-center justify-center rounded-full bg-navy text-white"
            aria-label="Remove photo"
          >
            <X size={15} />
          </button>
        </div>
      ) : (
        <div
          onDragOver={(e) => e.preventDefault()}
          onDrop={(e) => {
            e.preventDefault();
            const file = e.dataTransfer.files[0];
            if (file && file.type.startsWith('image/')) onSelect(file);
          }}
          onClick={() => inputRef.current?.click()}
          className="cursor-pointer rounded-[14px] border-[1.5px] border-dashed border-link/50 bg-sky-soft p-7 text-center transition-colors hover:bg-sky"
        >
          <Upload size={22} className="mx-auto text-link" />
          <p className="mt-2 text-[14px] font-medium text-navy">Drag your photo here, or click to upload</p>
          <p className="field-hint mt-1">PNG, JPG up to 5MB · Recommended 800×600</p>
        </div>
      )}
      <p className="field-hint mt-1.5">Major Venues can add a photo. It shows on the Coming up page.</p>
      <input
        type="file"
        ref={inputRef}
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) onSelect(file);
        }}
        accept="image/*"
        className="hidden"
      />
    </div>
  );
}

function SubmitSidebar({ formType, instant, showOrganizerTips }: { formType: FormType; instant: boolean; showOrganizerTips: boolean }) {
  const noun = formType === 'event' ? 'event' : 'special';
  const steps = instant
    ? [
        ['Fill in the details', 'Tell us what, when and where.'],
        ['Publish', 'Listings go live right away.'],
        ['It goes live', 'On Today, Browse and in your venue.'],
      ]
    : [
        ['Fill in the details', 'Tell us what, when and where.'],
        ['We review it', 'Usually within 24 hours.'],
        ['It goes live', 'On Today, Browse and in your venue.'],
      ];
  return (
    <aside className="flex flex-col gap-4 lg:sticky lg:top-24 self-start w-full">
      <div className="rounded-[22px] bg-navy p-7 text-white">
        <p className="eyebrow-bold text-sun">Post your {noun}</p>
        <ol className="mt-4 flex flex-col gap-[18px]">
          {steps.map(([t, d], i) => (
            <li key={t} className="flex gap-3.5">
              <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-sun text-[12px] font-bold text-navy">
                {i + 1}
              </span>
              <span>
                <span className="block text-[15px] font-bold">{t}</span>
                <span className="block text-[13px] text-on-dark-muted">{d}</span>
              </span>
            </li>
          ))}
        </ol>
      </div>
      {showOrganizerTips && (
        <div className="rounded-[22px] bg-sky p-7">
          <p className="eyebrow-bold text-ink-muted">Make an organizer account</p>
          <ul className="mt-3 flex flex-col gap-3">
            {['If you are associated with a restaurant or venue in Kingston.', 'Verified organizers can auto-publish events & specials.'].map((t) => (
              <li key={t} className="flex items-center gap-2.5 text-[14px] text-navy">
                <Check size={16} className="shrink-0 text-link" />
                {t}
              </li>
            ))}
          </ul>
        </div>
      )}
    </aside>
  );
}

function OrganizerBanner({
  name,
  isVerified,
  requestedAt,
}: {
  name: string;
  isVerified: boolean;
  requestedAt: string | null;
}) {
  if (isVerified) {
    return (
      <div className="mt-6 flex flex-wrap items-center gap-3 rounded-[14px] bg-[#fff1d6] px-[18px] py-3.5 text-[14px] text-navy">
        <span className="tag bg-sun text-navy gap-1">
          <Check size={12} strokeWidth={3} /> Verified Organizer
        </span>
        Signed in as {name}. Your listings go live right away, no admin approval needed.
      </div>
    );
  }
  return (
    <div className="mt-6 flex flex-col gap-3 rounded-[14px] bg-[#fff1d6] px-[18px] py-3.5 text-[14px] text-navy sm:flex-row sm:items-center sm:justify-between">
      <p>
        {requestedAt
          ? `Signed in as ${name}. Your verification request was sent ${format(new Date(requestedAt), 'MMM d')}. Until it’s approved, listings are reviewed before they go live.`
          : `Signed in as ${name}. Your listings are reviewed by our team before they go live.`}
      </p>
      {requestedAt ? (
        <span className="tag shrink-0 self-start bg-white text-[#8a5a00] gap-1 sm:self-auto">
          <span className="h-1.5 w-1.5 rounded-full bg-sun" /> Verification requested
        </span>
      ) : (
        <Link href="/organizer-verification" className="btn-navy btn-sm shrink-0 self-start sm:self-auto">
          <ShieldCheck size={14} /> Request to be an approved organizer
        </Link>
      )}
    </div>
  );
}

/* ---------------- Page ---------------- */

interface SubmittedSummary {
  formType: FormType;
  count: number;
  title: string;
  venueName: string;
  when: string;
  time: string;
  tags: { label: string; className: string }[];
  submittedAt: Date;
  eventId?: string;
}

function SubmitContent() {
  const searchParams = useSearchParams();
  const typeParam = searchParams.get('type');
  const formType: FormType | null = typeParam === 'special' ? 'special' : typeParam === 'event' ? 'event' : null;

  const { user, isAdmin, isLoading: authLoading } = useAuth();
  const { submitEvent, venues } = useEvents();
  const { isVerifiedOrganizer, verificationRequestedAt, organizerVenueIds } = useOrganizerVerification();
  const isOrganizerRole = user?.role === 'organizer';
  const isVerified = isVerifiedOrganizer;

  const [submitted, setSubmitted] = useState<SubmittedSummary | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [eventForms, setEventForms] = useState<EventFormData[]>(() => [createEmptyForm()]);
  const [specialForms, setSpecialForms] = useState<SpecialFormData[]>(() => [createEmptySpecialForm()]);
  const [application, setApplication] = useState<OrganizerApplication | null>(null);
  const fieldRefs = useRef<Record<string, HTMLElement | null>>({});

  // Organizers post for the venue on their account by default
  const organizerVenueName = isOrganizerRole ? user?.venueName?.trim().toLowerCase() : undefined;
  const organizerVenues = isOrganizerRole
    ? venues.filter((v) => organizerVenueIds.includes(v.id) || (!!organizerVenueName && v.name.trim().toLowerCase() === organizerVenueName))
    : [];
  const organizerVenueId = organizerVenues[0]?.id;

  useEffect(() => {
    if (!organizerVenueId) return;
    const fill = <T extends VenueFields>(forms: T[]) =>
      forms.some((f) => !f.venueId && !f.searchAllVenues)
        ? forms.map((f) => (!f.venueId && !f.searchAllVenues ? { ...f, venueId: organizerVenueId } : f))
        : forms;
    setEventForms(fill);
    setSpecialForms(fill);
  }, [organizerVenueId]);

  // Venue hours/accessibility the organizer gave when applying
  useEffect(() => {
    if (!isOrganizerRole) return;
    let cancelled = false;
    supabase.auth.getUser().then(({ data }) => {
      if (!cancelled) setApplication(normalizeApplication(data.user?.user_metadata?.organizerApplication));
    });
    return () => {
      cancelled = true;
    };
  }, [isOrganizerRole]);

  // Fresh form + error state whenever the user switches between event and special
  useEffect(() => {
    setError('');
    setSubmitted(null);
  }, [formType]);

  const registerFieldRef = (key: string) => (el: HTMLElement | null) => {
    fieldRefs.current[key] = el;
  };

  // Scroll the offending field/section into view and focus its first control
  const scrollToField = (key: string) => {
    requestAnimationFrame(() => {
      const el = fieldRefs.current[key];
      if (!el) return;
      el.scrollIntoView({ behavior: 'smooth', block: 'center' });
      const focusable = el.querySelector<HTMLElement>('input:not([type="hidden"]), select, textarea, button');
      (focusable || el).focus?.({ preventScroll: true });
    });
  };

  const updateForm = (formId: string, updates: Partial<EventFormData>) => {
    setEventForms((prev) => prev.map((form) => (form.id === formId ? { ...form, ...updates } : form)));
  };

  const updateSpecialForm = (formId: string, updates: Partial<SpecialFormData>) => {
    setSpecialForms((prev) => prev.map((form) => (form.id === formId ? { ...form, ...updates } : form)));
  };

  const handleCategoryToggle = (formId: string, category: EventCategory) => {
    setEventForms((prev) =>
      prev.map((form) => {
        if (form.id !== formId) return form;
        if (form.categories.includes(category)) {
          return { ...form, categories: form.categories.filter((c) => c !== category) };
        }
        // 19+ is the age limit, so it doesn't count toward the 3-category cap
        const picked = form.categories.filter((c) => c !== '19plus').length;
        if (category !== '19plus' && picked >= MAX_CATEGORIES) return form;
        return { ...form, categories: [...form.categories, category] };
      })
    );
  };

  const resetForms = () => {
    setEventForms([createEmptyForm(organizerVenueId)]);
    setSpecialForms([createEmptySpecialForm(organizerVenueId)]);
    setError('');
  };

  const venueFor = (venueId: string) => venues.find((v) => v.id === venueId);
  const venueNameFor = (venueId: string, newName: string) => (venueId === 'new' ? newName : venueFor(venueId)?.name || '');
  const canAddPhoto = (venueId: string) => !!venueFor(venueId)?.isMajor;

  const venuePayload = (form: VenueFields) => ({
    venueId: form.venueId === 'new' ? 'new' : form.venueId || undefined,
    newVenueName: form.venueId === 'new' ? form.newVenueName : undefined,
    newVenueAddress: form.venueId === 'new' ? form.newVenueAddress : undefined,
    newVenueIsDowntown: form.venueId === 'new' ? form.newVenueIsDowntown : undefined,
  });

  const validateVenue = (form: VenueFields, label: string, key: string) => {
    if (!form.venueId) {
      setError(`Please select a venue or create a new one for "${label}"`);
      scrollToField(key);
      return false;
    }
    if (form.venueId === 'new' && (!form.newVenueName || !form.newVenueAddress)) {
      setError(`Please provide both venue name and address for "${label}"`);
      scrollToField(key);
      return false;
    }
    return true;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (formType === 'event') {
      for (const form of eventForms) {
        const label = form.title || 'untitled event';
        if (form.categories.filter((c) => c !== '19plus').length === 0) {
          setError(`Please select at least one category for "${label}"`);
          scrollToField(`categories-${form.id}`);
          return;
        }
        if (!form.date) {
          setError(`Please pick a date for "${label}"`);
          scrollToField(`date-${form.id}`);
          return;
        }
        if (!validateVenue(form, label, `venue-${form.id}`)) return;
        if (form.isRecurring && form.recurrencePattern === 'weekly' && !form.recurrenceEndDate) {
          setError(`Please select an end date for the recurring weekly event "${label}". Maximum duration is 52 weeks.`);
          scrollToField(`recurrenceEndDate-${form.id}`);
          return;
        }
        if (form.isRecurring && form.recurrencePattern === 'weekly' && form.recurrenceEndDate && form.date) {
          const weeksDiff = Math.ceil(
            (parseISO(form.recurrenceEndDate).getTime() - parseISO(form.date).getTime()) / (7 * 24 * 60 * 60 * 1000)
          );
          if (weeksDiff > 52) {
            setError(
              `The recurrence period for "${label}" cannot exceed 52 weeks. Please select an end date within 52 weeks from the start date.`
            );
            scrollToField(`recurrenceEndDate-${form.id}`);
            return;
          }
        }
        if (form.isRecurring && form.recurrencePattern === 'custom' && form.customDates.length === 0) {
          setError(`Please add the other dates for "${label}"`);
          scrollToField(`customDates-${form.id}`);
          return;
        }
      }

      setIsSubmitting(true);
      try {
        let first: Event | null = null;
        for (const form of eventForms) {
          const categories: EventCategory[] = [...form.categories];
          if (form.rsvpRequired) categories.push('rsvp');
          if (form.soldOut) categories.push('sold-out');

          const base = {
            title: form.title.trim(),
            description: composeDescription(form.summary, form.description),
            startTime: form.isAllDay ? '00:00' : form.startTime,
            endTime: form.isAllDay ? undefined : form.endTime || undefined,
            ...venuePayload(form),
            categories,
            price: buildEventPrice(form),
            ticketUrl: normalizeUrl(form.ticketUrl) || (form.rsvpRequired ? normalizeUrl(form.rsvpUrl) : '') || undefined,
            imageUrl: canAddPhoto(form.venueId) ? form.imagePreview || undefined : undefined,
            isAllDay: form.isAllDay,
          };

          if (form.isRecurring && form.recurrencePattern === 'custom') {
            // Multiple specific dates: one listing per date
            for (const date of [form.date, ...form.customDates.filter((d) => d !== form.date)]) {
              const created = await submitEvent({ ...base, date, isRecurring: false });
              first = first ?? created;
            }
          } else {
            const created = await submitEvent({
              ...base,
              date: form.date,
              isRecurring: form.isRecurring,
              recurrencePattern: form.isRecurring ? form.recurrencePattern : undefined,
              recurrenceEndDate: form.isRecurring ? form.recurrenceEndDate || undefined : undefined,
            });
            first = first ?? created;
          }
        }
        const f = eventForms[0];
        setSubmitted({
          formType: 'event',
          count: eventForms.length,
          title: f.title,
          venueName: venueNameFor(f.venueId, f.newVenueName),
          when:
            f.isRecurring && f.recurrencePattern !== 'custom' && f.date
              ? `${f.recurrencePattern === 'monthly' ? 'Monthly' : 'Every'} ${dayNames[parseISO(f.date).getDay()]}`
              : format(parseISO(f.date), 'EEEE, MMMM d'),
          time: f.isAllDay ? 'All day' : `${formatTime(f.startTime)}${f.endTime ? ` – ${formatTime(f.endTime)}` : ''}`,
          tags: f.categories
            .filter((c) => c !== '19plus')
            .slice(0, 2)
            .map((c) => ({ label: categoryLabels[c], className: categoryTagStyles[c] })),
          submittedAt: new Date(),
          eventId: first?.id,
        });
        window.scrollTo({ top: 0, behavior: 'smooth' });
      } catch (err) {
        console.error('[Submit] Error submitting events:', err);
        setError(err instanceof Error ? err.message : 'Failed to submit event(s). Please try again.');
        window.scrollTo({ top: 0, behavior: 'smooth' });
      } finally {
        setIsSubmitting(false);
      }
      return;
    }

    // Specials
    for (const form of specialForms) {
      const label = form.title || 'untitled special';
      if (form.frequency === 'weekly' && form.recurringDays.length === 0) {
        setError(`Please pick which days "${label}" runs`);
        scrollToField(`special-days-${form.id}`);
        return;
      }
      if (form.frequency === 'dates' ? form.specificDates.length === 0 : !form.date) {
        setError(`Please pick ${form.frequency === 'dates' ? 'the dates' : 'a start date'} for "${label}"`);
        scrollToField(`special-date-${form.id}`);
        return;
      }
      if (!validateVenue(form, label, `special-venue-${form.id}`)) return;
      if (form.frequency === 'weekly' && form.recurrenceEndDate && form.date) {
        const weeksDiff = Math.ceil(
          (parseISO(form.recurrenceEndDate).getTime() - parseISO(form.date).getTime()) / (7 * 24 * 60 * 60 * 1000)
        );
        if (weeksDiff > 52) {
          setError(`The run for "${label}" cannot exceed 52 weeks.`);
          scrollToField(`special-recurrenceEndDate-${form.id}`);
          return;
        }
      }
    }

    setIsSubmitting(true);
    try {
      let first: Event | null = null;
      for (const form of specialForms) {
        // 'food-deal' marks it as a special; type, fine print and age are stored alongside
        const categories: EventCategory[] = ['food-deal', ...specialTypeCategories(form.type), ...form.conditions];
        if (form.is19Plus) categories.push('19plus');

        const base = {
          title: form.title.trim(),
          description: composeDescription(form.summary, form.description),
          startTime: form.isAllDay ? '00:00' : form.startTime,
          endTime: form.isAllDay ? undefined : form.endTime || undefined,
          ...venuePayload(form),
          categories,
          price: form.deal.trim() || undefined,
          ticketUrl: undefined,
          isAllDay: form.isAllDay,
        };

        if (form.frequency === 'weekly') {
          const created = await submitEvent({
            ...base,
            date: form.date,
            isRecurring: true,
            recurrencePattern: 'weekly',
            recurrenceEndDate: form.recurrenceEndDate || undefined,
            recurrenceDays: form.recurringDays,
          });
          first = first ?? created;
        } else {
          const dates = form.frequency === 'dates' ? form.specificDates : [form.date];
          for (const date of dates) {
            const created = await submitEvent({ ...base, date, isRecurring: false });
            first = first ?? created;
          }
        }
      }
      const f = specialForms[0];
      const days = [...f.recurringDays].sort((a, b) => weekOrder.indexOf(a) - weekOrder.indexOf(b)).map((d) => dayNames[d]);
      const firstDate = f.frequency === 'dates' ? f.specificDates[0] : f.date;
      setSubmitted({
        formType: 'special',
        count: specialForms.length,
        title: f.title,
        venueName: venueNameFor(f.venueId, f.newVenueName),
        when:
          f.frequency === 'weekly' && days.length > 0
            ? `Every ${days.join(' & ')}`
            : f.frequency === 'dates' && f.specificDates.length > 1
            ? `${f.specificDates.length} dates from ${format(parseISO(firstDate), 'MMMM d')}`
            : format(parseISO(firstDate), 'EEEE, MMMM d'),
        time: f.isAllDay ? 'All day' : `${formatTime(f.startTime)}${f.endTime ? ` – ${formatTime(f.endTime)}` : ''}`,
        tags: [{ label: specialTypeLabels[f.type], className: categoryTagStyles[f.type === 'drink' ? 'drink' : 'food'] }],
        submittedAt: new Date(),
        eventId: first?.id,
      });
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } catch (err) {
      console.error('[Submit] Error submitting specials:', err);
      setError(err instanceof Error ? err.message : 'Failed to submit special(s). Please try again.');
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } finally {
      setIsSubmitting(false);
    }
  };

  if (authLoading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <Loader2 size={32} className="animate-spin text-navy" />
      </div>
    );
  }

  /* ---------- Signed-out gate ---------- */
  if (!user) {
    const redirect = formType ? `/submit?type=${formType}` : '/submit';
    return (
      <div className="bg-sky-soft px-4 py-16">
        <div className="mx-auto max-w-[440px] rounded-[22px] border border-line bg-white p-8 text-center">
          <div className="mx-auto flex h-[52px] w-[52px] items-center justify-center rounded-full bg-sky text-navy">
            <Lock size={20} />
          </div>
          <p className="eyebrow-sm mt-5">— Submit an event</p>
          <h1 className="mt-3 text-[30px] font-bold leading-[1.1] tracking-[-0.02em] text-navy">
            Create an account
            <br />
            to post
          </h1>
          <p className="mt-4 text-[14px] leading-[1.5] text-ink-muted">
            Submitting events and specials requires an account. If you are associated with a venue or are an artist, you can
            create an Organizer account!
          </p>
          <ul className="mx-auto mt-5 flex w-fit flex-col gap-2 text-left">
            {['Track every submission in My Events', 'Edit or cancel a listing anytime', 'Get an email the moment it goes live'].map((t) => (
              <li key={t} className="flex items-center gap-2 text-[13px] text-navy">
                <Check size={14} className="text-link" />
                {t}
              </li>
            ))}
          </ul>
          <div className="mt-6 flex flex-col gap-2.5">
            <Link href={`/login?redirect=${encodeURIComponent(redirect)}`} className="btn-sun w-full">
              Sign in
            </Link>
            <Link href="/register" className="btn-outline w-full">
              Create account
            </Link>
          </div>
          <p className="mt-5 border-t border-line pt-4 text-[13px] text-ink-muted">
            Run a venue?{' '}
            <Link href="/become-organizer" className="font-medium text-link hover:underline">
              Become an organizer →
            </Link>
          </p>
        </div>
        <p className="mt-6 text-center text-[13px] text-ink-muted">
          Just looking around?{' '}
          <Link href="/events" className="font-medium text-navy underline">
            Browse what&rsquo;s on →
          </Link>
        </p>
      </div>
    );
  }

  /* ---------- Event or special? ---------- */
  if (!formType) {
    const choices = [
      {
        href: '/submit?type=event',
        icon: <CalendarDays size={22} />,
        iconClass: 'bg-navy text-white',
        title: 'An event',
        body: 'Live music, activity nights, markets, workshops, anything happening on a certain day.',
        cta: 'Submit an event →',
      },
      {
        href: '/submit?type=special',
        icon: <Utensils size={22} />,
        iconClass: 'bg-coral text-navy',
        title: 'A food & drink special',
        body: 'Happy hours, weekly deals and limited-time menus at your restaurant or bar.',
        cta: 'Submit a special →',
      },
    ];
    return (
      <div className="page-container pb-24 pt-10">
        <p className="eyebrow mb-3.5">— Submit</p>
        <h1 className="display-section">
          What are you
          <br />
          posting?
        </h1>
        <p className="mt-4 text-[18px] text-ink-muted">Pick one to get started.</p>
        <div className="mt-10 grid max-w-[880px] grid-cols-1 gap-4 sm:grid-cols-2">
          {choices.map((c) => (
            <Link
              key={c.href}
              href={c.href}
              className="card group flex flex-col items-start p-7 transition-colors hover:border-navy"
            >
              <span className={`flex h-12 w-12 items-center justify-center rounded-full ${c.iconClass}`}>{c.icon}</span>
              <span className="mt-5 text-[24px] font-bold leading-tight text-navy">{c.title}</span>
              <span className="mt-2 text-[14px] leading-[1.5] text-ink-muted">{c.body}</span>
              <span className="mt-6 text-[14px] font-bold text-link group-hover:underline">{c.cta}</span>
            </Link>
          ))}
        </div>
      </div>
    );
  }

  /* ---------- Thank-you ---------- */
  if (submitted) {
    const noun = submitted.formType === 'event' ? 'event' : 'special';
    const plural = submitted.count > 1;
    return (
      <div className="page-container pb-24 pt-12">
        <div className="grid grid-cols-1 gap-10 lg:grid-cols-[1fr_400px]">
          <div>
            <div className="flex h-16 w-16 items-center justify-center rounded-full bg-sun text-navy">
              <Check size={26} strokeWidth={2.5} />
            </div>
            <p className="eyebrow mt-6">— {isVerified ? 'Published' : 'Submitted'}</p>
            <h1 className="display-section mt-3">Thank you</h1>
            <p className="mt-4 text-[18px] text-ink-muted">
              {isVerified
                ? `Your ${noun}${plural ? 's are' : ' is'} live now.`
                : `We’ve got your ${noun}${plural ? 's' : ''} and will review ${plural ? 'them' : 'it'} soon!`}
            </p>

            {!isVerified && (
              <>
                <p className="eyebrow-sm mt-10">What happens next</p>
                <div className="card mt-3 px-5">
                  {[
                    ['We review it', 'Usually within 24 hours.'],
                    ['It shows in My Events', 'Check its status anytime under Submitted.'],
                    ['It goes live', `On Today, Browse and ${submitted.venueName ? `${submitted.venueName}’s` : 'the'} venue page.`],
                  ].map(([t, d], i) => (
                    <div key={t} className="flex items-center gap-4 border-b border-line py-4 last:border-b-0">
                      <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-navy text-[12px] font-bold text-white">
                        {i + 1}
                      </span>
                      <span>
                        <span className="block text-[15px] font-bold text-navy">{t}</span>
                        <span className="block text-[12px] text-ink-muted">{d}</span>
                      </span>
                    </div>
                  ))}
                </div>
              </>
            )}

            <div className="mt-8 flex flex-wrap gap-3">
              <button
                onClick={() => {
                  setSubmitted(null);
                  resetForms();
                }}
                className="btn-sun"
              >
                Submit another
              </button>
              <Link href="/my-events?tab=submitted" className="btn-outline">
                Go to My Events
              </Link>
            </div>
          </div>

          <div>
            <p className="eyebrow-sm">Your submission{plural ? 's' : ''}</p>
            <div className="card mt-3 p-5">
              <div className="flex flex-wrap gap-1.5">
                {submitted.tags.map((t) => (
                  <Tag key={t.label} className={t.className}>
                    {t.label}
                  </Tag>
                ))}
                {isVerified ? (
                  <Tag className="bg-success-tint text-success gap-1">
                    <span className="h-1.5 w-1.5 rounded-full bg-success" /> Live now
                  </Tag>
                ) : (
                  <Tag className="bg-[#fff1d6] text-[#8a5a00] gap-1">
                    <span className="h-1.5 w-1.5 rounded-full bg-sun" /> In review
                  </Tag>
                )}
              </div>
              <p className="mt-3 text-[20px] font-bold text-navy">{submitted.title}</p>
              <ul className="mt-3 flex flex-col gap-2 text-[13px] text-ink-muted">
                {submitted.venueName && (
                  <li className="flex items-center gap-2">
                    <MapPin size={14} className="text-link" />
                    {submitted.venueName}
                  </li>
                )}
                <li className="flex items-center gap-2">
                  <Calendar size={14} className="text-link" />
                  {submitted.when}
                </li>
                <li className="flex items-center gap-2">
                  <Clock size={14} className="text-link" />
                  {submitted.time}
                </li>
              </ul>
              {plural && (
                <p className="mt-3 text-[12px] text-ink-muted">
                  + {submitted.count - 1} more {noun}
                  {submitted.count - 1 > 1 ? 's' : ''}
                </p>
              )}
              <div className="mt-4 flex items-center justify-between border-t border-line pt-3 text-[12px]">
                <span className="text-ink-muted">Submitted {format(submitted.submittedAt, 'MMM d, yyyy · h:mm a')}</span>
                {isVerified && submitted.eventId ? (
                  <Link href={`/events/${submitted.eventId}`} className="font-medium text-link hover:underline">
                    View it live →
                  </Link>
                ) : submitted.eventId ? (
                  <Link href={`/events/${submitted.eventId}/edit`} className="font-medium text-link hover:underline">
                    Edit submission
                  </Link>
                ) : null}
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  /* ---------- Form ---------- */
  const isEvent = formType === 'event';

  return (
    <div className="page-container pb-24 pt-10">
      <p className="eyebrow mb-3.5">— Submit</p>
      <h1 className="display-section">
        {isEvent ? (
          <>
            Share what&rsquo;s
            <br />
            happening
          </>
        ) : (
          <>
            Share a
            <br />
            special
          </>
        )}
      </h1>
      <p className="mt-3.5 text-[14px] text-ink-muted">
        {isEvent ? 'Posting a food & drink special instead?' : 'Posting an event instead?'}{' '}
        <Link href={`/submit?type=${isEvent ? 'special' : 'event'}`} className="font-medium text-link hover:underline">
          Switch →
        </Link>
      </p>

      {(isOrganizerRole || isAdmin) && (
        <OrganizerBanner name={user.name} isVerified={isVerified} requestedAt={verificationRequestedAt} />
      )}

      {error && (
        <div className="mt-6 flex items-start gap-3 rounded-[14px] bg-danger-tint p-4 text-[14px] text-danger">
          <AlertCircle size={18} className="mt-0.5 shrink-0" />
          <p>{error}</p>
        </div>
      )}

      <form onSubmit={handleSubmit} className="mt-6 grid grid-cols-1 gap-10 lg:grid-cols-[1fr_360px]">
        <div className="flex min-w-0 flex-col gap-5">
          {isEvent
            ? eventForms.map((formData, formIndex) => {
                const pickedCount = formData.categories.filter((c) => c !== '19plus').length;
                const showPrice = formData.priceType === 'paid' || formData.priceType === 'cover';
                return (
                  <div key={formData.id} className="flex flex-col gap-5">
                    {eventForms.length > 1 && (
                      <div className="flex items-center justify-between pt-2">
                        <p className="text-[22px] font-bold text-navy">Event {formIndex + 1}</p>
                        <button
                          type="button"
                          onClick={() => setEventForms((prev) => prev.filter((f) => f.id !== formData.id))}
                          className="flex items-center gap-1 text-[13px] font-medium text-danger hover:underline"
                        >
                          <X size={14} /> Remove
                        </button>
                      </div>
                    )}

                    <Section number={1} title="Event details">
                      <div>
                        <label htmlFor={`title-${formData.id}`} className="field-label">
                          Event title
                        </label>
                        <input
                          id={`title-${formData.id}`}
                          required
                          maxLength={LIMITS.eventTitle}
                          value={formData.title}
                          onChange={(e) => updateForm(formData.id, { title: e.target.value })}
                          placeholder="e.g., Trivia Night at The Ale House"
                          className="field"
                        />
                        <Helper length={formData.title.length} max={LIMITS.eventTitle} />
                      </div>
                      <div>
                        <label htmlFor={`summary-${formData.id}`} className="field-label">
                          Short summary
                        </label>
                        <input
                          id={`summary-${formData.id}`}
                          required
                          maxLength={LIMITS.summary}
                          value={formData.summary}
                          onChange={(e) => updateForm(formData.id, { summary: e.target.value })}
                          placeholder="e.g., Teams of up to six, prizes for the top three, half-price nachos"
                          className="field"
                        />
                        <Helper
                          hint="One line that shows on the Browse page and event previews."
                          length={formData.summary.length}
                          max={LIMITS.summary}
                        />
                      </div>
                      <div>
                        <label htmlFor={`description-${formData.id}`} className="field-label">
                          Description
                        </label>
                        <textarea
                          id={`description-${formData.id}`}
                          required
                          rows={4}
                          maxLength={LIMITS.description}
                          value={formData.description}
                          onChange={(e) => updateForm(formData.id, { description: e.target.value })}
                          placeholder="Tell people what they can expect at your event..."
                          className="field"
                        />
                        <Helper length={formData.description.length} max={LIMITS.description} />
                      </div>
                    </Section>

                    <Section number={2} title="Date & time">
                      <div className={`grid grid-cols-1 gap-4 ${formData.isAllDay ? '' : 'sm:grid-cols-3'}`}>
                        <div ref={registerFieldRef(`date-${formData.id}`)}>
                          <label htmlFor={`date-${formData.id}`} className="field-label">
                            Date
                          </label>
                          <DatePicker
                            id={`date-${formData.id}`}
                            value={formData.date}
                            onChange={(value) => updateForm(formData.id, { date: value })}
                            required
                            placeholder="Select date"
                          />
                        </div>
                        {!formData.isAllDay && (
                          <>
                            <div>
                              <label htmlFor={`startTime-${formData.id}`} className="field-label">
                                Start time
                              </label>
                              <TimeInput
                                id={`startTime-${formData.id}`}
                                required
                                value={formData.startTime}
                                onChange={(v) => updateForm(formData.id, { startTime: v })}
                              />
                            </div>
                            <div>
                              <label htmlFor={`endTime-${formData.id}`} className="field-label">
                                End time
                              </label>
                              <TimeInput
                                id={`endTime-${formData.id}`}
                                value={formData.endTime}
                                onChange={(v) => updateForm(formData.id, { endTime: v })}
                              />
                            </div>
                          </>
                        )}
                      </div>
                      <Toggle
                        on={formData.isAllDay}
                        onChange={(v) => updateForm(formData.id, { isAllDay: v, startTime: v ? '00:00' : '', endTime: '' })}
                        label="This is an all-day event"
                      />
                      <Toggle
                        on={formData.isRecurring}
                        onChange={(v) =>
                          updateForm(formData.id, { isRecurring: v, recurrencePattern: 'weekly', recurrenceEndDate: '', customDates: [] })
                        }
                        label="This is a recurring event"
                      />
                      {formData.isRecurring && (
                        <div className="flex flex-col gap-4 sm:pl-[52px]">
                          <ChipGroup
                            value={formData.recurrencePattern}
                            onChange={(v) => updateForm(formData.id, { recurrencePattern: v, customDates: [], recurrenceEndDate: '' })}
                            options={[
                              { id: 'weekly', label: 'Every week' },
                              { id: 'monthly', label: 'Every month' },
                              { id: 'custom', label: 'Multiple specific dates' },
                            ]}
                          />
                          {formData.date && formData.recurrencePattern !== 'custom' && (
                            <p className="field-hint">
                              Repeats {formData.recurrencePattern === 'monthly' ? 'monthly on' : 'every'}{' '}
                              {dayNames[parseISO(formData.date).getDay()]}
                            </p>
                          )}
                          {formData.recurrencePattern !== 'custom' ? (
                            <div ref={registerFieldRef(`recurrenceEndDate-${formData.id}`)} className="sm:max-w-[403px]">
                              <label className="field-label">Until{formData.recurrencePattern === 'weekly' ? '' : ' (optional)'}</label>
                              <DatePicker
                                value={formData.recurrenceEndDate}
                                onChange={(value) => updateForm(formData.id, { recurrenceEndDate: value })}
                                min={formData.date}
                                max={
                                  formData.recurrencePattern === 'weekly' && formData.date
                                    ? format(addDays(parseISO(formData.date), 52 * 7), 'yyyy-MM-dd')
                                    : undefined
                                }
                                required={formData.recurrencePattern === 'weekly'}
                                placeholder="Pick an end date"
                              />
                              <p className="field-hint mt-1.5">
                                {formData.recurrencePattern === 'weekly'
                                  ? 'Required. Up to 52 weeks from the start date.'
                                  : 'Leave empty for no end date (max 52 weeks).'}
                              </p>
                            </div>
                          ) : (
                            <div ref={registerFieldRef(`customDates-${formData.id}`)}>
                              <label className="field-label">Other dates</label>
                              <DateList
                                dates={formData.customDates}
                                onChange={(customDates) => updateForm(formData.id, { customDates })}
                                min={formData.date}
                                placeholder="Click to add a date"
                              />
                              <p className="field-hint mt-1.5">The first date is set above.</p>
                            </div>
                          )}
                        </div>
                      )}
                    </Section>

                    <Section number={3} title="Location" sectionRef={registerFieldRef(`venue-${formData.id}`)}>
                      <LocationFields
                        idPrefix="venue"
                        form={formData}
                        update={(updates) => updateForm(formData.id, updates)}
                        venues={venues}
                        organizerVenues={organizerVenues}
                        linkedVenueIds={organizerVenueIds}
                        application={application}
                        noun="event"
                      />
                      {canAddPhoto(formData.venueId) && (
                        <PhotoField
                          preview={formData.imagePreview}
                          onSelect={async (file) => updateForm(formData.id, { imagePreview: await compressImage(file) })}
                          onRemove={() => updateForm(formData.id, { imagePreview: '' })}
                        />
                      )}
                    </Section>

                    <Section number={4} title="Categories" sectionRef={registerFieldRef(`categories-${formData.id}`)}>
                      <div>
                        <p className="mb-5 text-[14px] text-ink-muted">Pick up to {MAX_CATEGORIES} that fit best.</p>
                        <div className="flex flex-wrap gap-2">
                          {eventCategoryOptions.map((category) => {
                            const selected = formData.categories.includes(category);
                            const atLimit = !selected && category !== '19plus' && pickedCount >= MAX_CATEGORIES;
                            return (
                              <button
                                key={category}
                                type="button"
                                onClick={() => handleCategoryToggle(formData.id, category)}
                                aria-pressed={selected}
                                disabled={atLimit}
                                className={`inline-flex h-9 items-center gap-1.5 rounded-full px-4 text-[13px] font-medium transition-colors disabled:cursor-not-allowed disabled:opacity-40 ${
                                  selected ? `${categoryTagStyles[category]} font-bold` : 'border border-line bg-white text-navy hover:border-navy'
                                }`}
                              >
                                {selected && <Check size={14} strokeWidth={3} />}
                                {categoryLabels[category]}
                              </button>
                            );
                          })}
                        </div>
                      </div>
                      <div>
                        <p className="field-label mb-1">Age limit</p>
                        <p className="field-hint mb-3">Who can come? Shown as a label on the listing.</p>
                        <ChipGroup
                          value={formData.categories.includes('19plus') ? '19' : 'all'}
                          onChange={(v) =>
                            updateForm(formData.id, {
                              categories:
                                v === '19'
                                  ? [...formData.categories.filter((c) => c !== '19plus'), '19plus']
                                  : formData.categories.filter((c) => c !== '19plus'),
                            })
                          }
                          options={[
                            { id: 'all', label: 'All ages' },
                            { id: '19', label: '19+' },
                          ]}
                        />
                      </div>
                    </Section>

                    <Section number={5} title="Pricing & tickets">
                      <div className="flex flex-wrap gap-2">
                        {(
                          [
                            ['free', 'Free'],
                            ['paid', 'Paid'],
                            ['pwyc', 'Pay what you can'],
                            ['cover', 'Cover at the door'],
                            ['free-rsvp', 'Free with RSVP'],
                          ] as [PriceType, string][]
                        ).map(([id, label]) => (
                          <button
                            key={id}
                            type="button"
                            className="chip"
                            data-active={formData.priceType === id}
                            onClick={() =>
                              updateForm(formData.id, {
                                priceType: formData.priceType === id ? '' : id,
                                ...(id === 'paid' || id === 'cover' ? {} : { priceAmount: '', priceTiers: [] }),
                                ...(id === 'free-rsvp' ? { rsvpRequired: true } : {}),
                              })
                            }
                          >
                            {label}
                          </button>
                        ))}
                      </div>
                      <div className={`grid grid-cols-1 gap-4 ${showPrice ? 'sm:grid-cols-2' : ''}`}>
                        {showPrice && (
                          <div>
                            <label htmlFor={`priceAmount-${formData.id}`} className="field-label">
                              Price ($)
                            </label>
                            <input
                              id={`priceAmount-${formData.id}`}
                              value={formData.priceAmount}
                              onChange={(e) => updateForm(formData.id, { priceAmount: e.target.value })}
                              placeholder="e.g., 15, 20-40"
                              className="field"
                            />
                          </div>
                        )}
                        <div>
                          <label htmlFor={`ticketUrl-${formData.id}`} className="field-label">
                            Ticket link (optional)
                          </label>
                          <div className="relative">
                            <LinkIcon size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-link" />
                            <input
                              id={`ticketUrl-${formData.id}`}
                              value={formData.ticketUrl}
                              onChange={(e) => updateForm(formData.id, { ticketUrl: e.target.value })}
                              placeholder="e.g., ticketmaster.com/event/abc"
                              className="field field-with-icon"
                            />
                          </div>
                        </div>
                      </div>
                      {formData.priceType === 'paid' && (
                        <div className="flex flex-col gap-3">
                          {formData.priceTiers.map((tier) => {
                            const setTier = (updates: Partial<PriceTier>) =>
                              updateForm(formData.id, {
                                priceTiers: formData.priceTiers.map((t) => (t.id === tier.id ? { ...t, ...updates } : t)),
                              });
                            return (
                              <div key={tier.id} className="flex items-center gap-3">
                                <input
                                  value={tier.label}
                                  onChange={(e) => setTier({ label: e.target.value })}
                                  placeholder="e.g., VIP"
                                  aria-label="Price name"
                                  className="field"
                                />
                                <input
                                  value={tier.amount}
                                  onChange={(e) => setTier({ amount: e.target.value })}
                                  placeholder="e.g., 40"
                                  aria-label="Price ($)"
                                  className="field"
                                />
                                <button
                                  type="button"
                                  onClick={() =>
                                    updateForm(formData.id, { priceTiers: formData.priceTiers.filter((t) => t.id !== tier.id) })
                                  }
                                  className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-ink-muted hover:bg-sky-soft hover:text-navy"
                                  aria-label="Remove price"
                                >
                                  <X size={15} />
                                </button>
                              </div>
                            );
                          })}
                          <button
                            type="button"
                            onClick={() =>
                              updateForm(formData.id, {
                                priceTiers: [...formData.priceTiers, { id: generateId(), label: '', amount: '' }],
                              })
                            }
                            className="self-start text-[13px] font-medium text-link hover:underline"
                          >
                            + Add another price (e.g., General $20 · VIP $40)
                          </button>
                        </div>
                      )}
                      <div className="h-px bg-line" />
                      <div className="flex flex-col gap-2">
                        <Toggle
                          on={formData.rsvpRequired}
                          onChange={(v) => updateForm(formData.id, { rsvpRequired: v, ...(v ? {} : { rsvpUrl: '' }) })}
                          label="RSVP or registration required"
                          hint="People need to sign up before coming."
                        />
                        {formData.rsvpRequired && (
                          <div className="mt-2 sm:pl-[52px]">
                            <label htmlFor={`rsvpUrl-${formData.id}`} className="field-label">
                              RSVP / registration link
                            </label>
                            <div className="relative">
                              <LinkIcon size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-link" />
                              <input
                                id={`rsvpUrl-${formData.id}`}
                                value={formData.rsvpUrl}
                                onChange={(e) => updateForm(formData.id, { rsvpUrl: e.target.value })}
                                placeholder="e.g., eventbrite.ca/e/trivia-night"
                                className="field field-with-icon"
                              />
                            </div>
                          </div>
                        )}
                      </div>
                      <Toggle
                        on={formData.soldOut}
                        onChange={(v) => updateForm(formData.id, { soldOut: v })}
                        label="Sold out"
                        hint="Keeps the listing up with a “Sold out” label."
                      />
                    </Section>
                  </div>
                );
              })
            : specialForms.map((formData, formIndex) => (
                <div key={formData.id} className="flex flex-col gap-5">
                  {specialForms.length > 1 && (
                    <div className="flex items-center justify-between pt-2">
                      <p className="text-[22px] font-bold text-navy">Special {formIndex + 1}</p>
                      <button
                        type="button"
                        onClick={() => setSpecialForms((prev) => prev.filter((f) => f.id !== formData.id))}
                        className="flex items-center gap-1 text-[13px] font-medium text-danger hover:underline"
                      >
                        <X size={14} /> Remove
                      </button>
                    </div>
                  )}

                  <Section number={1} title="The deal">
                    <div>
                      <label htmlFor={`special-title-${formData.id}`} className="field-label">
                        Special name
                      </label>
                      <input
                        id={`special-title-${formData.id}`}
                        required
                        maxLength={LIMITS.specialName}
                        value={formData.title}
                        onChange={(e) => updateSpecialForm(formData.id, { title: e.target.value })}
                        placeholder="e.g., Half-Price Wings"
                        className="field"
                      />
                      <Helper
                        hint="Recommended: include the price or discount and keep it concise."
                        length={formData.title.length}
                        max={LIMITS.specialName}
                      />
                    </div>
                    <div>
                      <label htmlFor={`special-deal-${formData.id}`} className="field-label">
                        The deal
                      </label>
                      <input
                        id={`special-deal-${formData.id}`}
                        maxLength={LIMITS.deal}
                        value={formData.deal}
                        onChange={(e) => updateSpecialForm(formData.id, { deal: e.target.value })}
                        placeholder="e.g., $5 pints · Half-price wings · $12 burger & pint"
                        className="field"
                      />
                      <Helper length={formData.deal.length} max={LIMITS.deal} />
                    </div>
                    <div>
                      <label htmlFor={`special-summary-${formData.id}`} className="field-label">
                        Short summary
                      </label>
                      <input
                        id={`special-summary-${formData.id}`}
                        required
                        maxLength={LIMITS.summary}
                        value={formData.summary}
                        onChange={(e) => updateSpecialForm(formData.id, { summary: e.target.value })}
                        placeholder="e.g., All sauces and dry rubs, dine-in only"
                        className="field"
                      />
                      <Helper
                        hint="One line that shows on the Browse page and previews."
                        length={formData.summary.length}
                        max={LIMITS.summary}
                      />
                    </div>
                    <div>
                      <label htmlFor={`special-description-${formData.id}`} className="field-label">
                        Description (optional)
                      </label>
                      <textarea
                        id={`special-description-${formData.id}`}
                        rows={3}
                        maxLength={LIMITS.description}
                        value={formData.description}
                        onChange={(e) => updateSpecialForm(formData.id, { description: e.target.value })}
                        placeholder="Anything else people should know - what’s included, how to order etc."
                        className="field"
                      />
                      <Helper length={formData.description.length} max={LIMITS.description} />
                    </div>
                    <div>
                      <p className="field-label">Type</p>
                      <ChipGroup
                        value={formData.type}
                        onChange={(type) => updateSpecialForm(formData.id, { type })}
                        options={(Object.keys(specialTypeLabels) as SpecialType[]).map((id) => ({ id, label: specialTypeLabels[id] }))}
                      />
                    </div>
                  </Section>

                  <Section number={2} title="When it runs">
                    <div>
                      <p className="field-label">How often?</p>
                      <ChipGroup
                        value={formData.frequency}
                        onChange={(frequency) =>
                          updateSpecialForm(formData.id, { frequency, recurrenceEndDate: '', specificDates: [], recurringDays: [] })
                        }
                        options={[
                          { id: 'weekly', label: 'Every week' },
                          { id: 'once', label: 'One day only' },
                          { id: 'dates', label: 'Specific dates' },
                        ]}
                      />
                    </div>
                    {formData.frequency === 'weekly' && (
                      <div ref={registerFieldRef(`special-days-${formData.id}`)}>
                        <p className="field-label mb-1">Which days?</p>
                        <p className="field-hint mb-3">Pick every day the special runs.</p>
                        <div className="flex flex-wrap gap-2">
                          {weekOrder.map((d) => {
                            const active = formData.recurringDays.includes(d);
                            return (
                              <button
                                key={d}
                                type="button"
                                className="chip"
                                data-active={active}
                                onClick={() =>
                                  updateSpecialForm(formData.id, {
                                    recurringDays: active
                                      ? formData.recurringDays.filter((x) => x !== d)
                                      : [...formData.recurringDays, d],
                                  })
                                }
                              >
                                {dayNames[d].slice(0, 3)}
                              </button>
                            );
                          })}
                        </div>
                      </div>
                    )}
                    {!formData.isAllDay && (
                      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                        <div>
                          <label htmlFor={`special-startTime-${formData.id}`} className="field-label">
                            Start time
                          </label>
                          <TimeInput
                            id={`special-startTime-${formData.id}`}
                            required
                            value={formData.startTime}
                            onChange={(v) => updateSpecialForm(formData.id, { startTime: v })}
                          />
                        </div>
                        <div>
                          <label htmlFor={`special-endTime-${formData.id}`} className="field-label">
                            End time
                          </label>
                          <TimeInput
                            id={`special-endTime-${formData.id}`}
                            value={formData.endTime}
                            onChange={(v) => updateSpecialForm(formData.id, { endTime: v })}
                          />
                        </div>
                      </div>
                    )}
                    <Toggle
                      on={formData.isAllDay}
                      onChange={(v) => updateSpecialForm(formData.id, { isAllDay: v, startTime: v ? '00:00' : '', endTime: '' })}
                      label="All day"
                    />
                    {formData.frequency === 'dates' ? (
                      <div ref={registerFieldRef(`special-date-${formData.id}`)}>
                        <label className="field-label">Dates</label>
                        <DateList
                          dates={formData.specificDates}
                          onChange={(specificDates) => updateSpecialForm(formData.id, { specificDates, date: specificDates[0] || '' })}
                          placeholder="Click to add a date"
                        />
                        <p className="field-hint mt-1.5">Add every date the special runs.</p>
                      </div>
                    ) : (
                      <div className={`grid grid-cols-1 gap-4 ${formData.frequency === 'weekly' ? 'sm:grid-cols-2' : ''}`}>
                        <div ref={registerFieldRef(`special-date-${formData.id}`)}>
                          <label htmlFor={`special-date-${formData.id}`} className="field-label">
                            {formData.frequency === 'weekly' ? 'Starts' : 'Date'}
                          </label>
                          <DatePicker
                            id={`special-date-${formData.id}`}
                            value={formData.date}
                            onChange={(value) => updateSpecialForm(formData.id, { date: value })}
                            required
                            placeholder="Select date"
                          />
                        </div>
                        {formData.frequency === 'weekly' && (
                          <div ref={registerFieldRef(`special-recurrenceEndDate-${formData.id}`)}>
                            <label className="field-label">Runs until (optional)</label>
                            <DatePicker
                              value={formData.recurrenceEndDate}
                              onChange={(value) => updateSpecialForm(formData.id, { recurrenceEndDate: value })}
                              min={formData.date}
                              max={formData.date ? format(addDays(parseISO(formData.date), 52 * 7), 'yyyy-MM-dd') : undefined}
                              placeholder="Pick an end date"
                            />
                            <p className="field-hint mt-1.5">Leave empty to keep it running (up to 52 weeks).</p>
                          </div>
                        )}
                      </div>
                    )}
                  </Section>

                  <Section number={3} title="Location" sectionRef={registerFieldRef(`special-venue-${formData.id}`)}>
                    <LocationFields
                      idPrefix="special-venue"
                      form={formData}
                      update={(updates) => updateSpecialForm(formData.id, updates)}
                      venues={venues}
                      organizerVenues={organizerVenues}
                        linkedVenueIds={organizerVenueIds}
                      application={application}
                      noun="special"
                    />
                  </Section>

                  <Section number={4} title="Fine print">
                    <p className="-mt-1 text-[13px] text-ink-muted">Optional - helps people avoid surprises.</p>
                    <div>
                      <p className="field-label mb-1">Conditions</p>
                      <p className="field-hint mb-3">Pick any that apply.</p>
                      <div className="flex flex-wrap gap-2">
                        {specialConditionCategories.map((c) => {
                          const active = formData.conditions.includes(c);
                          return (
                            <button
                              key={c}
                              type="button"
                              className="chip"
                              data-active={active}
                              aria-pressed={active}
                              onClick={() =>
                                updateSpecialForm(formData.id, {
                                  conditions: active ? formData.conditions.filter((x) => x !== c) : [...formData.conditions, c],
                                })
                              }
                            >
                              {categoryLabels[c]}
                            </button>
                          );
                        })}
                      </div>
                    </div>
                    <div>
                      <p className="field-label mb-1">Age limit</p>
                      <p className="field-hint mb-3">Drink specials are usually 19+.</p>
                      <ChipGroup
                        value={formData.is19Plus ? '19' : 'all'}
                        onChange={(v) => updateSpecialForm(formData.id, { is19Plus: v === '19' })}
                        options={[
                          { id: 'all', label: 'All ages' },
                          { id: '19', label: '19+' },
                        ]}
                      />
                    </div>
                  </Section>
                </div>
              ))}

          <div className="mt-2 flex flex-wrap items-center justify-between gap-4">
            <button
              type="button"
              onClick={() =>
                isEvent
                  ? setEventForms((p) => [...p, createEmptyForm(organizerVenueId)])
                  : setSpecialForms((p) => [...p, createEmptySpecialForm(organizerVenueId)])
              }
              className="text-[15px] font-medium text-link hover:underline"
            >
              + Add another {isEvent ? 'event' : 'special'}
            </button>
            <button type="submit" disabled={isSubmitting} className="btn-sun h-[52px] px-7 text-[15px]">
              {isSubmitting ? (
                <>
                  <Loader2 size={18} className="animate-spin" />
                  {isVerified ? 'Publishing...' : 'Submitting...'}
                </>
              ) : isVerified ? (
                'Publish now →'
              ) : (
                'Submit for review →'
              )}
            </button>
          </div>
        </div>

        <SubmitSidebar formType={formType} instant={isVerified} showOrganizerTips={user.role === 'user'} />
      </form>
    </div>
  );
}

export default function SubmitEventPage() {
  return (
    <Suspense fallback={null}>
      <SubmitContent />
    </Suspense>
  );
}
