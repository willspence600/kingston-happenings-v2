'use client';

import { useCallback, useEffect, useState } from 'react';
import { format } from 'date-fns';
import { AlertCircle, Clock, Loader2, Plus } from 'lucide-react';
import type { Venue } from '@/types/event';
import type { VenueRequest } from '@/lib/venueRequests';
import { VenueFields, draftToApplication, emptyVenue, type VenueDraft } from './VenueDraftFields';

/**
 * Lets an approved organizer ask to add another venue to their profile. An admin
 * approves it from the Review queue, the same way they approve sign-up venues.
 */
export default function AddVenueRequest({ venues, linkedVenueIds }: { venues: Venue[]; linkedVenueIds: string[] }) {
  const [requests, setRequests] = useState<VenueRequest[]>([]);
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState<VenueDraft>(() => emptyVenue());
  const [sending, setSending] = useState(false);
  const [error, setError] = useState('');
  const [sent, setSent] = useState('');

  const load = useCallback(async () => {
    const res = await fetch('/api/user/venue-requests', { cache: 'no-store' }).catch(() => null);
    if (res?.ok) setRequests((await res.json()).requests || []);
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const takenIds = [...linkedVenueIds, ...requests.map((r) => r.claimedVenueId).filter((id): id is string => !!id)];

  const submit = async () => {
    setError('');
    if (!draft.claimedVenueId && !draft.name.trim()) return setError('Pick your venue or add a new one.');
    if (!draft.claimedVenueId && !draft.street.trim()) return setError('Add a street address for the new venue.');
    if (draft.types.includes('Other') && !draft.otherType.trim()) return setError('Type your venue type under “Other”.');

    setSending(true);
    try {
      const res = await fetch('/api/user/venue-requests', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ venue: draftToApplication(draft), logo: draft.logo || undefined }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || 'We couldn’t send your request. Please try again.');
      setRequests((list) => [...list, data.request]);
      setSent(data.request.name);
      setDraft(emptyVenue());
      setOpen(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'We couldn’t send your request. Please try again.');
    } finally {
      setSending(false);
    }
  };

  const withdraw = async (r: VenueRequest) => {
    if (!window.confirm(`Withdraw your request to add ${r.name}?`)) return;
    const res = await fetch(`/api/user/venue-requests?id=${encodeURIComponent(r.id)}`, { method: 'DELETE' }).catch(() => null);
    if (res?.ok) setRequests((await res.json()).requests || []);
  };

  return (
    <section id="add-venue" className="flex flex-col gap-4">
      {requests.length > 0 && (
        <div className="card p-5 sm:p-7">
          <p className="eyebrow-sm">Waiting for approval</p>
          <div className="mt-2 border-t border-line">
            {requests.map((r) => (
              <div key={r.id} className="flex items-center gap-4 border-b border-line py-3 last:border-b-0">
                <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-[10px] bg-[#fff1d6] text-[#8a5a00]">
                  <Clock size={15} />
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-[15px] font-bold text-navy">{r.name}</span>
                  <span className="block text-[12px] text-ink-muted">
                    {r.claimedVenueId ? 'Existing venue' : 'New venue'}
                    {r.requestedAt ? ` · Requested ${format(new Date(r.requestedAt), 'MMM d, yyyy')}` : ''}
                  </span>
                </span>
                <button type="button" onClick={() => withdraw(r)} className="text-[13px] font-medium text-danger hover:underline">
                  Withdraw
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {sent && !open && (
        <p role="status" className="rounded-[14px] bg-success-tint px-4 py-3 text-[14px] text-success">
          Thanks! We&rsquo;ll check you&rsquo;re connected to {sent} and add it to your profile, usually within 1–2 business days.
        </p>
      )}

      {open ? (
        <div className="card flex flex-col gap-5 p-5 sm:p-7">
          <div>
            <p className="text-[20px] font-bold text-navy">Add another venue</p>
            <p className="mt-1 text-[13px] text-ink-muted">
              Our team checks you&rsquo;re connected to the venue before it&rsquo;s added to your profile, usually within 1–2 business days.
            </p>
          </div>
          <VenueFields draft={draft} index={0} venues={venues} takenIds={takenIds} onChange={setDraft} onLogoError={setError} />
          {error && (
            <div role="alert" className="flex items-start gap-3 rounded-[14px] bg-danger-tint p-4 text-[14px] text-danger">
              <AlertCircle size={18} className="mt-0.5 shrink-0" />
              <p>{error}</p>
            </div>
          )}
          <div className="flex flex-wrap justify-end gap-2">
            <button
              type="button"
              className="btn-ghost"
              onClick={() => {
                setOpen(false);
                setError('');
              }}
              disabled={sending}
            >
              Cancel
            </button>
            <button type="button" className="btn-sun" onClick={submit} disabled={sending}>
              {sending ? <Loader2 size={16} className="animate-spin" /> : 'Send for approval →'}
            </button>
          </div>
        </div>
      ) : (
        <button
          type="button"
          onClick={() => {
            setOpen(true);
            setSent('');
          }}
          className="btn-outline self-start"
        >
          <Plus size={15} /> Add another venue
        </button>
      )}
    </section>
  );
}
