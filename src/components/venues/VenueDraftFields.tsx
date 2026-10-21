'use client';

import { useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { AtSign, ChevronDown, FileText, MapPin, Upload, Users, X } from 'lucide-react';
import { compressImage } from '@/utils/compression';
import { VENUE_TYPE_OPTIONS, WEEK_DAYS } from '@/constants/venueDetails';
import type { Venue, VenueHours } from '@/types/event';
import type { OrganizerVenueApplication } from '@/lib/organizerApplication';

/**
 * The venue form organizers fill in on sign-up, also used to request another venue later
 */

const venueTypes = VENUE_TYPE_OPTIONS;
const days = WEEK_DAYS;

export interface VenueDraft {
  key: number;
  claimedVenueId: string;
  claimQuery: string;
  name: string;
  types: string[];
  otherType: string;
  street: string;
  unit: string;
  city: string;
  postal: string;
  phone: string;
  website: string;
  instagram: string;
  about: string;
  hours: VenueHours;
  logo: string;
}

export const defaultHours = (): VenueHours =>
  Object.fromEntries(days.map((d) => [d, { open: '11:00', close: '23:00', closed: d === 'Sun' }]));

let nextVenueKey = 0;
export const emptyVenue = (): VenueDraft => ({
  key: nextVenueKey++,
  claimedVenueId: '',
  claimQuery: '',
  name: '',
  types: [],
  otherType: '',
  street: '',
  unit: '',
  city: 'Kingston',
  postal: '',
  phone: '',
  website: '',
  instagram: '',
  about: '',
  hours: defaultHours(),
  logo: '',
});

/** Copy an existing venue's details into the form so the organizer can check and update them */
export function draftFromVenue(draft: VenueDraft, v: Venue): VenueDraft {
  const known = (v.venueTypes || []).filter((t) => venueTypes.includes(t));
  const custom = (v.venueTypes || []).filter((t) => !venueTypes.includes(t));
  return {
    ...draft,
    claimedVenueId: v.id,
    name: v.name,
    types: custom.length > 0 ? [...known, 'Other'] : known,
    otherType: custom.join(', '),
    street: v.address,
    unit: '',
    city: '',
    postal: '',
    phone: v.phone || '',
    website: v.website || '',
    instagram: v.instagram || '',
    about: v.about || '',
    hours: v.hours && Object.keys(v.hours).length > 0 ? { ...defaultHours(), ...v.hours } : defaultHours(),
    logo: '',
  };
}

/** The draft as it's stored on an application or venue request (the logo is uploaded separately) */
export function draftToApplication(v: VenueDraft): OrganizerVenueApplication {
  return {
    claimedVenueId: v.claimedVenueId || undefined,
    name: v.name.trim(),
    venueTypes: [...v.types.filter((t) => t !== 'Other'), ...(v.types.includes('Other') ? [v.otherType.trim()] : [])],
    street: v.street,
    unit: v.unit,
    city: v.city,
    postal: v.postal,
    phone: v.phone,
    website: v.website,
    instagram: v.instagram,
    about: v.about,
    hours: v.hours,
  };
}

export function Field({ label, id, children, hint }: { label: string; id?: string; children: ReactNode; hint?: ReactNode }) {
  return (
    <div>
      <label htmlFor={id} className="field-label">
        {label}
      </label>
      {children}
      {hint && <p className="field-hint mt-1.5">{hint}</p>}
    </div>
  );
}

function MultiChips({ options, value, onChange }: { options: string[]; value: string[]; onChange: (v: string[]) => void }) {
  return (
    <div className="flex flex-wrap gap-2">
      {options.map((o) => {
        const active = value.includes(o);
        return (
          <button key={o} type="button" className="chip h-10" data-active={active} onClick={() => onChange(active ? value.filter((x) => x !== o) : [...value, o])}>
            {o}
          </button>
        );
      })}
    </div>
  );
}

export function Dropzone({
  accept,
  title,
  hint,
  fileLabel,
  preview,
  onSelect,
  onRemove,
}: {
  accept: string;
  title: string;
  hint: string;
  fileLabel?: string;
  preview?: string;
  onSelect: (file: File) => void;
  onRemove: () => void;
}) {
  const inputRef = useRef<HTMLInputElement | null>(null);
  const clear = () => {
    onRemove();
    if (inputRef.current) inputRef.current.value = '';
  };
  return (
    <>
      {preview || fileLabel ? (
        <div className="flex items-center gap-4 rounded-[14px] border border-line p-3">
          {preview ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={preview} alt="" className="h-16 w-16 shrink-0 rounded-[10px] object-contain bg-sky-soft" />
          ) : (
            <span className="flex h-16 w-16 shrink-0 items-center justify-center rounded-[10px] bg-sky-soft text-link">
              <FileText size={22} />
            </span>
          )}
          <span className="min-w-0 flex-1 truncate text-[14px] font-medium text-navy">{fileLabel || 'Logo added'}</span>
          <button type="button" onClick={clear} className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-navy text-white" aria-label="Remove file">
            <X size={15} />
          </button>
        </div>
      ) : (
        <div
          role="button"
          tabIndex={0}
          onDragOver={(e) => e.preventDefault()}
          onDrop={(e) => {
            e.preventDefault();
            const file = e.dataTransfer.files[0];
            if (file) onSelect(file);
          }}
          onClick={() => inputRef.current?.click()}
          onKeyDown={(e) => (e.key === 'Enter' || e.key === ' ') && inputRef.current?.click()}
          className="cursor-pointer rounded-[14px] border-[1.5px] border-dashed border-link/50 bg-sky-soft px-6 py-10 text-center transition-colors hover:bg-sky"
        >
          <Upload size={24} className="mx-auto text-link" />
          <p className="mt-2 text-[15px] font-medium text-navy">{title}</p>
          <p className="field-hint mt-1.5">{hint}</p>
        </div>
      )}
      <input
        type="file"
        ref={inputRef}
        accept={accept}
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) onSelect(file);
        }}
        className="hidden"
      />
    </>
  );
}

function TimeBox({ value, disabled, onChange, label }: { value: string; disabled: boolean; onChange: (v: string) => void; label: string }) {
  if (disabled) {
    return (
      <span aria-label={label} className="flex h-9 w-[140px] items-center rounded-[10px] border border-line bg-sky-soft px-3 text-[13px] text-ink-muted">
        —
      </span>
    );
  }
  return (
    <input
      type="time"
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className="h-9 w-[140px] rounded-[10px] border border-line px-3 text-[13px] text-navy"
      aria-label={label}
    />
  );
}

export function VenueFields({
  draft,
  index,
  venues,
  takenIds,
  onChange,
  onRemove,
  onLogoError,
}: {
  draft: VenueDraft;
  index: number;
  venues: Venue[];
  takenIds: string[];
  onChange: (d: VenueDraft) => void;
  onRemove?: () => void;
  onLogoError: (msg: string) => void;
}) {
  const [claimOpen, setClaimOpen] = useState(false);
  const [associates, setAssociates] = useState<{ venueId: string; count: number } | null>(null);
  const set = (patch: Partial<VenueDraft>) => onChange({ ...draft, ...patch });
  const id = (name: string) => `venue-${draft.key}-${name}`;

  const claimedVenue = venues.find((v) => v.id === draft.claimedVenueId);

  const claimMatches = useMemo(() => {
    const q = draft.claimQuery.toLowerCase().trim();
    const available = venues.filter((v) => !takenIds.includes(v.id));
    if (!q) return available.slice(0, 6);
    return available.filter((v) => v.name.toLowerCase().includes(q) || v.address.toLowerCase().includes(q)).slice(0, 6);
  }, [venues, draft.claimQuery, takenIds]);

  useEffect(() => {
    if (!draft.claimedVenueId) return;
    let cancelled = false;
    fetch(`/api/venues/${draft.claimedVenueId}/organizers`)
      .then((res) => (res.ok ? res.json() : null))
      .catch(() => null)
      .then((data) => {
        if (!cancelled && data) setAssociates({ venueId: draft.claimedVenueId, count: data.count ?? 0 });
      });
    return () => {
      cancelled = true;
    };
  }, [draft.claimedVenueId]);

  const associateCount = associates && associates.venueId === draft.claimedVenueId ? associates.count : 0;

  return (
    <div className="flex flex-col gap-5">
      {index > 0 && (
        <div className="flex items-center justify-between border-t border-line pt-6">
          <p className="text-[16px] font-bold text-navy">Venue {index + 1}</p>
          {onRemove && (
            <button type="button" onClick={onRemove} className="text-[13px] font-medium text-danger hover:underline">
              Remove venue
            </button>
          )}
        </div>
      )}

      <Field label="Is your venue already on Kingston Happenings?" hint="Claiming copies its details over so you can check and update them.">
        <div className="relative">
          <MapPin size={17} className="absolute left-4 top-1/2 -translate-y-1/2 text-link" />
          <input
            value={claimedVenue ? claimedVenue.name : draft.claimQuery}
            onChange={(e) => {
              setClaimOpen(true);
              if (claimedVenue) {
                onChange({ ...emptyVenue(), key: draft.key, claimQuery: e.target.value });
              } else {
                set({ claimQuery: e.target.value });
              }
            }}
            onFocus={() => setClaimOpen(true)}
            onBlur={() => setTimeout(() => setClaimOpen(false), 150)}
            placeholder="Search venues to claim it…"
            className="field field-with-icon pr-10"
          />
          <ChevronDown size={16} className="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2 text-navy" />
          {claimOpen && claimMatches.length > 0 && !claimedVenue && (
            <div className="absolute left-0 right-0 top-full z-20 mt-1 max-h-64 overflow-y-auto rounded-[14px] border border-line bg-white py-1 shadow-lg">
              {claimMatches.map((v) => (
                <button
                  key={v.id}
                  type="button"
                  onMouseDown={(e) => e.preventDefault()}
                  onClick={() => {
                    onChange(draftFromVenue(draft, v));
                    setClaimOpen(false);
                  }}
                  className="block w-full px-4 py-2.5 text-left hover:bg-sky-soft"
                >
                  <span className="block text-[14px] font-bold text-navy">{v.name}</span>
                  <span className="block text-[12px] text-ink-muted">{v.address}</span>
                </button>
              ))}
            </div>
          )}
        </div>
        {claimedVenue && (
          <>
            {associateCount > 0 && (
              <span className="mt-3 flex items-start gap-2 rounded-[12px] bg-sky-soft px-3.5 py-2.5 text-[13px] text-navy">
                <Users size={15} className="mt-0.5 shrink-0 text-link" />
                <span>
                  There {associateCount === 1 ? 'is' : 'are'} {associateCount} {associateCount === 1 ? 'user' : 'users'} currently associated with{' '}
                  {claimedVenue.name}. You&rsquo;ll be able to see everyone associated with it once your account is approved.
                </span>
              </span>
            )}
            <button type="button" onClick={() => onChange({ ...emptyVenue(), key: draft.key })} className="mt-2 block text-[12px] font-medium text-link hover:underline">
              Not this one? Clear
            </button>
          </>
        )}
      </Field>

      {!claimedVenue && (
        <div className="flex items-center gap-3 text-[12px] font-medium uppercase tracking-[0.12em] text-ink-muted">
          <span className="h-px flex-1 bg-line" />
          or add a new venue
          <span className="h-px flex-1 bg-line" />
        </div>
      )}

      <Field label="Venue name" id={id('name')}>
        <input
          id={id('name')}
          value={draft.name}
          readOnly={!!claimedVenue}
          onChange={(e) => set({ name: e.target.value })}
          placeholder="Merchant Tap House"
          className={`field ${claimedVenue ? 'bg-sky-soft text-ink-muted' : ''}`}
        />
      </Field>
      <div>
        <p className="field-label mb-1">Venue type</p>
        <p className="field-hint mb-3">Pick all that apply.</p>
        <MultiChips options={venueTypes} value={draft.types} onChange={(types) => set({ types, otherType: types.includes('Other') ? draft.otherType : '' })} />
        {draft.types.includes('Other') && (
          <input
            aria-label="Your venue type"
            value={draft.otherType}
            onChange={(e) => set({ otherType: e.target.value })}
            placeholder="Type your venue type, e.g., Bookstore"
            maxLength={60}
            className="field mt-3"
          />
        )}
      </div>
      {claimedVenue ? (
        <Field label="Street address" id={id('street')}>
          <input id={id('street')} value={draft.street} readOnly className="field bg-sky-soft text-ink-muted" />
        </Field>
      ) : (
        <>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-[1fr_220px]">
            <Field label="Street address" id={id('street')}>
              <input id={id('street')} value={draft.street} onChange={(e) => set({ street: e.target.value })} placeholder="123 Princess St." className="field" />
            </Field>
            <Field label="Unit / floor (optional)" id={id('unit')}>
              <input id={id('unit')} value={draft.unit} onChange={(e) => set({ unit: e.target.value })} placeholder="Second Floor" className="field" />
            </Field>
          </div>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <Field label="City" id={id('city')}>
              <input id={id('city')} value={draft.city} onChange={(e) => set({ city: e.target.value })} placeholder="Kingston" className="field" />
            </Field>
            <Field label="Postal code" id={id('postal')}>
              <input id={id('postal')} value={draft.postal} onChange={(e) => set({ postal: e.target.value })} placeholder="K7L 123" className="field" />
            </Field>
          </div>
        </>
      )}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <Field label="Venue phone" id={id('phone')}>
          <input id={id('phone')} type="tel" value={draft.phone} onChange={(e) => set({ phone: e.target.value })} placeholder="123-456-7890" className="field" />
        </Field>
        <Field label="Website" id={id('website')}>
          <input id={id('website')} value={draft.website} onChange={(e) => set({ website: e.target.value })} placeholder="website.com" className="field" />
        </Field>
      </div>
      <Field label="Instagram (optional)" id={id('ig')}>
        <div className="relative">
          <AtSign size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-link" />
          <input id={id('ig')} value={draft.instagram} onChange={(e) => set({ instagram: e.target.value })} placeholder="instagramaccount" className="field field-with-icon" />
        </div>
      </Field>
      <Field label="About the venue" id={id('about')}>
        <textarea
          id={id('about')}
          rows={3}
          value={draft.about}
          onChange={(e) => set({ about: e.target.value })}
          placeholder="A sentence or two about what it’s like. Shown on your venue page."
          className="field"
        />
      </Field>
      <div>
        <p className="field-label">Opening hours</p>
        <div className="overflow-hidden rounded-[14px] border border-line">
          {days.map((d) => {
            const h = draft.hours[d];
            const setDay = (patch: Partial<typeof h>) => set({ hours: { ...draft.hours, [d]: { ...h, ...patch } } });
            return (
              <div key={d} className="flex flex-wrap items-center gap-3 border-b border-line px-4 py-2.5 last:border-b-0">
                <span className="w-14 text-[14px] font-medium text-navy">{d}</span>
                <TimeBox value={h.open} disabled={h.closed} onChange={(open) => setDay({ open })} label={`${d} opening time`} />
                <span className="text-[13px] text-ink-muted">to</span>
                <TimeBox value={h.close} disabled={h.closed} onChange={(close) => setDay({ close })} label={`${d} closing time`} />
                <span className="ml-auto flex items-center gap-3 text-[14px] text-navy">
                  <button type="button" className="switch" data-on={h.closed} onClick={() => setDay({ closed: !h.closed })} aria-label={`${d} closed`}>
                    <span />
                  </button>
                  Closed
                </span>
              </div>
            );
          })}
        </div>
      </div>
      <div>
        <p className="field-label">Logo</p>
        <Dropzone
          accept="image/png,image/jpeg,image/webp"
          title="Drag your logo here, or click to upload"
          hint="JPG or PNG, landscape works best · max 5 MB"
          preview={draft.logo}
          onSelect={async (file) => {
            if (!file.type.startsWith('image/')) return onLogoError('Your logo needs to be a JPG or PNG image.');
            if (file.size > 5 * 1024 * 1024) return onLogoError('Your logo needs to be 5 MB or smaller.');
            set({ logo: await compressImage(file, 800, 0.85, file.type === 'image/png' ? 'image/png' : 'image/jpeg') });
          }}
          onRemove={() => set({ logo: '' })}
        />
      </div>
    </div>
  );
}

