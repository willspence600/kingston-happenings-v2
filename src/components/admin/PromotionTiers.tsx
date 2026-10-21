'use client';

import { useEffect, useState } from 'react';
import { Info, Loader2, X } from 'lucide-react';
import type { Venue } from '@/types/event';
import {
  PROMOTION_RULES,
  PROMOTION_TIERS,
  promotionTierLabels,
  venueTier,
  type PromotionKind,
  type PromotionTier,
} from '@/lib/promotion';

export const tierChipClass: Record<PromotionTier, string> = {
  featured: 'bg-sun text-navy',
  promoted: 'bg-navy text-white',
  boosted: 'bg-sky text-link-deep',
  standard: 'bg-[#eef1f5] text-ink-muted',
};

export function TierBadge({ tier, kind }: { tier: PromotionTier; kind?: PromotionKind }) {
  return (
    <span className={`tag ${tierChipClass[tier]}`}>
      {kind ? `${kind === 'events' ? 'Events' : 'Specials'}: ` : ''}
      {promotionTierLabels[tier]}
    </span>
  );
}

/** Pick a tier, with a reminder of what each one does on the site */
export function TierPicker({
  kind,
  value,
  onChange,
}: {
  kind: PromotionKind;
  value: PromotionTier;
  onChange: (tier: PromotionTier) => void;
}) {
  return (
    <div className="flex flex-col gap-2">
      {PROMOTION_TIERS.map((tier) => {
        const active = value === tier;
        return (
          <button
            key={tier}
            type="button"
            onClick={() => onChange(tier)}
            className={`rounded-[14px] border-[1.5px] p-3 text-left transition-colors ${active ? 'border-navy bg-sky-soft' : 'border-line hover:border-navy/40'}`}
            aria-pressed={active}
          >
            <span className="flex items-center gap-2">
              <span className={`flex h-4 w-4 shrink-0 items-center justify-center rounded-full border-[1.5px] ${active ? 'border-navy' : 'border-line'}`}>
                {active && <span className="h-2 w-2 rounded-full bg-navy" />}
              </span>
              <span className={`tag ${tierChipClass[tier]}`}>{promotionTierLabels[tier]}</span>
            </span>
            <span className="mt-1.5 block pl-6 text-[12px] leading-[1.45] text-ink-muted">{PROMOTION_RULES[kind][tier]}</span>
          </button>
        );
      })}
    </div>
  );
}

/** Reference card listing every tier's rules for events and specials */
export function TierRulesBox({ defaultOpen = false }: { defaultOpen?: boolean }) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div className="rounded-[18px] bg-sky-soft p-4 sm:p-5">
      <button type="button" onClick={() => setOpen(!open)} className="flex w-full items-center gap-2 text-left text-[14px] font-bold text-navy">
        <Info size={15} className="text-link" />
        What do the promotion tiers do?
        <span className="ml-auto text-[12px] font-medium text-link">{open ? 'Hide' : 'Show'}</span>
      </button>
      {open && (
        <div className="mt-4 grid grid-cols-1 gap-5 md:grid-cols-2">
          {(['events', 'specials'] as const).map((kind) => (
            <div key={kind}>
              <p className="eyebrow-sm mb-2">{kind === 'events' ? 'Events' : 'Food & drink specials'}</p>
              <div className="flex flex-col gap-2">
                {PROMOTION_TIERS.map((tier) => (
                  <div key={tier} className="flex gap-3 text-[12px] leading-[1.45] text-navy">
                    <span className={`tag h-fit shrink-0 ${tierChipClass[tier]}`}>{promotionTierLabels[tier]}</span>
                    <span>{PROMOTION_RULES[kind][tier]}</span>
                  </div>
                ))}
              </div>
            </div>
          ))}
          <p className="text-[12px] text-ink-muted md:col-span-2">
            A listing hidden from promotion is always treated as Standard. Only Major Venues appear on Coming up and can add photos when submitting.
          </p>
        </div>
      )}
    </div>
  );
}

/** Modal for editing a venue's event and special tiers */
export function TierModal({
  venue,
  onClose,
  onSave,
}: {
  venue: Pick<Venue, 'id' | 'name' | 'promotionTier' | 'eventPromotionTier' | 'specialPromotionTier'>;
  onClose: () => void;
  onSave: (tiers: { eventPromotionTier: PromotionTier; specialPromotionTier: PromotionTier }) => Promise<void>;
}) {
  const [events, setEvents] = useState<PromotionTier>(venueTier(venue, 'events'));
  const [specials, setSpecials] = useState<PromotionTier>(venueTier(venue, 'specials'));
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [onClose]);

  return (
    <div className="fixed inset-0 z-[60] flex items-start justify-center overflow-y-auto bg-navy/50 p-3 sm:items-center sm:p-6" onClick={onClose}>
      <div className="my-4 w-full max-w-3xl rounded-[22px] bg-white p-5 sm:p-7" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="eyebrow-sm">Promotion tier</p>
            <p className="mt-1 text-[22px] font-bold text-navy">{venue.name}</p>
          </div>
          <button onClick={onClose} className="flex h-9 w-9 items-center justify-center rounded-full text-navy hover:bg-sky-soft" aria-label="Close">
            <X size={18} />
          </button>
        </div>
        <div className="mt-5 grid grid-cols-1 gap-6 md:grid-cols-2">
          <div>
            <p className="field-label">Events</p>
            <TierPicker kind="events" value={events} onChange={setEvents} />
          </div>
          <div>
            <p className="field-label">Food &amp; drink specials</p>
            <TierPicker kind="specials" value={specials} onChange={setSpecials} />
          </div>
        </div>
        <div className="mt-6 flex justify-end gap-2">
          <button type="button" onClick={onClose} className="btn-ghost">
            Cancel
          </button>
          <button
            type="button"
            className="btn-navy"
            disabled={saving}
            onClick={async () => {
              setSaving(true);
              try {
                await onSave({ eventPromotionTier: events, specialPromotionTier: specials });
              } finally {
                setSaving(false);
              }
            }}
          >
            {saving && <Loader2 size={14} className="animate-spin" />} Save tiers
          </button>
        </div>
      </div>
    </div>
  );
}
