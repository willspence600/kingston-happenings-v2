'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Ban, ExternalLink, Loader2, Trash2, X } from 'lucide-react';
import type { Event, Venue } from '@/types/event';
import ListingEditor, { isSpecialListing } from './ListingEditor';
import { listingTier, promotionTierLabels, venueTier } from '@/lib/promotion';

/**
 * Admin view of a published listing: the same layout a visitor sees, with every
 * field editable, plus promotion / cancel / delete controls.
 */
export default function ListingModal({
  event,
  venues,
  onClose,
  onMessage,
  onChanged,
}: {
  event: Event;
  venues: Pick<Venue, 'id' | 'name' | 'address'>[];
  onClose: () => void;
  onMessage: (message: string, type: 'success' | 'error' | 'info') => void;
  /** Reload listings after a change */
  onChanged: () => Promise<void> | void;
}) {
  const [current, setCurrent] = useState<Event>(event);
  const [busy, setBusy] = useState<string | null>(null);
  const [confirmDelete, setConfirmDelete] = useState(false);

  useEffect(() => setCurrent(event), [event]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    document.addEventListener('keydown', onKey);
    const overflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = overflow;
    };
  }, [onClose]);

  const special = isSpecialListing(current);
  const label = special ? 'special' : 'event';
  const isSeries = Boolean(current.seriesId && current.isRecurring);
  const kind = special ? 'specials' : 'events';
  const venueTierNow = venueTier(current.venue, kind);

  const run = async (key: string, fn: () => Promise<Response>, success: string, close = false) => {
    setBusy(key);
    try {
      const res = await fn();
      if (!res.ok) throw new Error();
      onMessage(success, 'success');
      await onChanged();
      if (close) onClose();
    } catch {
      onMessage(`Something went wrong — the ${label} wasn’t updated`, 'error');
    } finally {
      setBusy(null);
    }
  };

  const togglePromotion = () =>
    run(
      'promo',
      async () => {
        const res = await fetch('/api/admin/listing-promotion', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ eventId: current.id, hidden: !current.hiddenFromPromotion }),
        });
        if (res.ok) setCurrent((c) => ({ ...c, hiddenFromPromotion: !c.hiddenFromPromotion }));
        return res;
      },
      current.hiddenFromPromotion ? 'Back in its venue’s promotion tier' : `Hidden from promotion${isSeries ? ' (all dates)' : ''}`
    );

  return (
    <div className="fixed inset-0 z-[60] flex items-start justify-center overflow-y-auto bg-navy/50 p-3 sm:p-6" onClick={onClose}>
      <div className="relative my-4 w-full max-w-5xl rounded-[24px] bg-white" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between gap-3 rounded-t-[24px] bg-sun px-5 py-3 sm:px-7">
          <p className="eyebrow-bold text-navy">Admin view · {special ? 'Food & drink special' : 'Event'}</p>
          <div className="flex items-center gap-2">
            <Link href={`/events/${current.id}`} target="_blank" className="hidden items-center gap-1 text-[12px] font-bold text-navy hover:underline sm:inline-flex">
              Public page <ExternalLink size={12} />
            </Link>
            <button onClick={onClose} className="flex h-9 w-9 items-center justify-center rounded-full text-navy hover:bg-white/60" aria-label="Close">
              <X size={18} />
            </button>
          </div>
        </div>

        <div className="p-5 sm:p-7">
          <ListingEditor
            event={current}
            variant="detail"
            venues={venues}
            onSaved={async (saved, { scope }) => {
              if (saved) setCurrent(saved);
              onMessage(scope === 'future' ? 'Saved for this and all upcoming dates' : 'Changes saved', 'success');
              await onChanged();
            }}
            onError={(m) => onMessage(m, 'error')}
          />

          <div className="mt-8 grid grid-cols-1 gap-3 border-t border-line pt-6 md:grid-cols-[1fr_auto]">
            <div className="flex items-start gap-3">
              <button
                type="button"
                className="switch mt-0.5"
                data-on={!current.hiddenFromPromotion}
                onClick={togglePromotion}
                disabled={busy === 'promo'}
                aria-pressed={!current.hiddenFromPromotion}
                aria-label="Use venue promotion tier"
              >
                <span />
              </button>
              <div>
                <p className="text-[14px] font-bold text-navy">
                  Promotion: {promotionTierLabels[listingTier(current)]}
                  {current.hiddenFromPromotion && <span className="font-normal text-ink-muted"> (hidden — venue is {promotionTierLabels[venueTierNow]})</span>}
                </p>
                <p className="field-hint">
                  {current.venue.name}&rsquo;s {kind} tier is {promotionTierLabels[venueTierNow]}. Turn off to list this {label}
                  {isSeries ? ' (every date)' : ''} at Standard.
                </p>
              </div>
            </div>
            <div className="flex flex-wrap gap-2 md:justify-end">
              {current.status !== 'cancelled' && (
                <button
                  type="button"
                  className="btn-ghost btn-sm"
                  disabled={!!busy}
                  onClick={() => run('cancel', () => fetch(`/api/events/${current.id}/cancel`, { method: 'POST' }), `${special ? 'Special' : 'Event'} marked as cancelled`, true)}
                >
                  {busy === 'cancel' ? <Loader2 size={13} className="animate-spin" /> : <Ban size={13} />} Cancel {label}
                </button>
              )}
              {confirmDelete ? (
                <>
                  <button
                    type="button"
                    className="btn btn-sm bg-danger font-bold text-white"
                    disabled={!!busy}
                    onClick={() => run('delete', () => fetch(`/api/events/${current.id}?scope=this`, { method: 'DELETE' }), 'Deleted', true)}
                  >
                    {busy === 'delete' && <Loader2 size={13} className="animate-spin" />} {isSeries ? 'Delete this date' : 'Delete for good'}
                  </button>
                  {isSeries && (
                    <button
                      type="button"
                      className="btn btn-sm border-[1.5px] border-danger font-bold text-danger"
                      disabled={!!busy}
                      onClick={() => run('delete', () => fetch(`/api/events/${current.id}?scope=future`, { method: 'DELETE' }), 'Deleted this and all future dates', true)}
                    >
                      This &amp; all future
                    </button>
                  )}
                  <button type="button" className="btn-ghost btn-sm" onClick={() => setConfirmDelete(false)}>
                    Keep
                  </button>
                </>
              ) : (
                <button type="button" className="btn btn-sm border-[1.5px] border-transparent font-medium text-danger hover:bg-danger-tint" onClick={() => setConfirmDelete(true)}>
                  <Trash2 size={13} /> Delete
                </button>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
