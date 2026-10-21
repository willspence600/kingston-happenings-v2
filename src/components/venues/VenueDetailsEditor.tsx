'use client';

import { AtSign, Check } from 'lucide-react';
import { ACCESSIBILITY_OPTIONS, VENUE_TYPE_OPTIONS, WEEK_DAYS } from '@/constants/venueDetails';
import type { Venue, VenueHours } from '@/types/event';

export interface VenueDetailsDraft {
  types: string[];
  otherType: string;
  phone: string;
  website: string;
  instagram: string;
  about: string;
  hours: VenueHours;
  accessibility: string[];
  accessibilityNotes: string;
}

const defaultHours = (): VenueHours =>
  Object.fromEntries(WEEK_DAYS.map((d) => [d, { open: '11:00', close: '23:00', closed: false }]));

export function venueDetailsDraft(venue: Partial<Venue>): VenueDetailsDraft {
  const known = (venue.venueTypes || []).filter((t) => VENUE_TYPE_OPTIONS.includes(t));
  const custom = (venue.venueTypes || []).filter((t) => !VENUE_TYPE_OPTIONS.includes(t));
  return {
    types: custom.length > 0 ? [...known, 'Other'] : known,
    otherType: custom.join(', '),
    phone: venue.phone || '',
    website: venue.website || '',
    instagram: venue.instagram || '',
    about: venue.about || '',
    hours: venue.hours && Object.keys(venue.hours).length > 0 ? { ...defaultHours(), ...venue.hours } : defaultHours(),
    accessibility: venue.accessibility || [],
    accessibilityNotes: venue.accessibilityNotes || '',
  };
}

/** Request body for PUT /api/venues/[id] */
export function venueDetailsPayload(d: VenueDetailsDraft) {
  return {
    venueTypes: [...d.types.filter((t) => t !== 'Other'), ...(d.types.includes('Other') && d.otherType.trim() ? [d.otherType.trim()] : [])],
    phone: d.phone,
    website: d.website,
    instagram: d.instagram,
    about: d.about,
    hours: d.hours,
    accessibility: d.accessibility,
    accessibilityNotes: d.accessibilityNotes,
  };
}

export default function VenueDetailsEditor({
  value,
  onChange,
  showWebsite = true,
}: {
  value: VenueDetailsDraft;
  onChange: (d: VenueDetailsDraft) => void;
  showWebsite?: boolean;
}) {
  const set = (patch: Partial<VenueDetailsDraft>) => onChange({ ...value, ...patch });

  return (
    <div className="flex flex-col gap-5">
      <div>
        <p className="field-label mb-1">Venue type</p>
        <p className="field-hint mb-3">Pick all that apply.</p>
        <div className="flex flex-wrap gap-2">
          {VENUE_TYPE_OPTIONS.map((o) => {
            const active = value.types.includes(o);
            return (
              <button
                key={o}
                type="button"
                className="chip h-10"
                data-active={active}
                onClick={() => {
                  const types = active ? value.types.filter((x) => x !== o) : [...value.types, o];
                  set({ types, otherType: types.includes('Other') ? value.otherType : '' });
                }}
              >
                {o}
              </button>
            );
          })}
        </div>
        {value.types.includes('Other') && (
          <input
            aria-label="Your venue type"
            value={value.otherType}
            onChange={(e) => set({ otherType: e.target.value })}
            placeholder="Type your venue type, e.g., Bookstore"
            maxLength={60}
            className="field mt-3"
          />
        )}
      </div>
      <div className={`grid grid-cols-1 gap-4 ${showWebsite ? 'sm:grid-cols-2' : ''}`}>
        <div>
          <label htmlFor="vd-phone" className="field-label">
            Venue phone
          </label>
          <input id="vd-phone" type="tel" value={value.phone} onChange={(e) => set({ phone: e.target.value })} placeholder="123-456-7890" className="field" />
        </div>
        {showWebsite && (
          <div>
            <label htmlFor="vd-website" className="field-label">
              Website
            </label>
            <input id="vd-website" value={value.website} onChange={(e) => set({ website: e.target.value })} placeholder="website.com" className="field" />
          </div>
        )}
      </div>
      <div>
        <label htmlFor="vd-ig" className="field-label">
          Instagram (optional)
        </label>
        <div className="relative">
          <AtSign size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-link" />
          <input id="vd-ig" value={value.instagram} onChange={(e) => set({ instagram: e.target.value })} placeholder="instagramaccount" className="field field-with-icon" />
        </div>
      </div>
      <div>
        <label htmlFor="vd-about" className="field-label">
          About the venue
        </label>
        <textarea
          id="vd-about"
          rows={3}
          value={value.about}
          onChange={(e) => set({ about: e.target.value })}
          placeholder="A sentence or two about what it’s like. Shown on your venue page."
          className="field"
        />
      </div>
      <div>
        <p className="field-label">Opening hours</p>
        <div className="overflow-hidden rounded-[14px] border border-line">
          {WEEK_DAYS.map((d) => {
            const h = value.hours[d];
            const setDay = (patch: Partial<typeof h>) => set({ hours: { ...value.hours, [d]: { ...h, ...patch } } });
            return (
              <div key={d} className="flex flex-wrap items-center gap-3 border-b border-line px-4 py-2.5 last:border-b-0">
                <span className="w-10 text-[14px] font-medium text-navy">{d}</span>
                {h.closed ? (
                  <span className="text-[13px] text-ink-muted">Closed</span>
                ) : (
                  <>
                    <input
                      type="time"
                      value={h.open}
                      onChange={(e) => setDay({ open: e.target.value })}
                      className="h-9 rounded-[10px] border border-line px-3 text-[13px] text-navy"
                      aria-label={`${d} opening time`}
                    />
                    <span className="text-[13px] text-ink-muted">to</span>
                    <input
                      type="time"
                      value={h.close}
                      onChange={(e) => setDay({ close: e.target.value })}
                      className="h-9 rounded-[10px] border border-line px-3 text-[13px] text-navy"
                      aria-label={`${d} closing time`}
                    />
                  </>
                )}
                <span className="ml-auto flex items-center gap-2 text-[13px] text-navy">
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
        <p className="field-label">Accessibility</p>
        <div className="grid grid-cols-1 gap-3.5 sm:grid-cols-2">
          {ACCESSIBILITY_OPTIONS.map((o) => {
            const checked = value.accessibility.includes(o);
            return (
              <button
                key={o}
                type="button"
                role="checkbox"
                aria-checked={checked}
                onClick={() => set({ accessibility: checked ? value.accessibility.filter((x) => x !== o) : [...value.accessibility, o] })}
                className="flex items-center gap-3 text-left text-[14px] text-navy"
              >
                <span
                  className={`flex h-[22px] w-[22px] shrink-0 items-center justify-center rounded-[6px] border-[1.5px] ${
                    checked ? 'border-navy bg-navy text-white' : 'border-line bg-white'
                  }`}
                >
                  {checked && <Check size={13} strokeWidth={3} />}
                </span>
                {o}
              </button>
            );
          })}
        </div>
      </div>
      <div>
        <label htmlFor="vd-a11y-notes" className="field-label">
          Accessibility notes (optional)
        </label>
        <textarea
          id="vd-a11y-notes"
          rows={3}
          value={value.accessibilityNotes}
          onChange={(e) => set({ accessibilityNotes: e.target.value })}
          placeholder="e.g., Ramp at the side door on Ontario St. Washroom is on the main floor."
          className="field"
        />
      </div>
    </div>
  );
}
