'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';
import { format, parseISO } from 'date-fns';
import { Calendar, Check, ChevronDown, ChevronUp, Loader2, Repeat, UserRound, Utensils } from 'lucide-react';
import type { Event } from '@/types/event';
import { formatTime, isAllDayEvent } from '@/components/brand';
import ListingEditor, { isSpecialListing } from './ListingEditor';
import { OrganizerPreview, VerifiedSwitch } from './OrganizersTab';
import type { AdminOrganizer, AdminVenue, AdminVenueRequest, OrganizerApplicationItem, ShowToast } from './types';

type ReviewItem = Event & { totalInstances: number; groupKey: string; isSeriesBatch: boolean };

export function groupPending(pendingEvents: Event[]): ReviewItem[] {
  const seriesMap = new Map<string, Event[]>();
  const items: ReviewItem[] = [];
  for (const event of pendingEvents) {
    if (event.seriesId) {
      const list = seriesMap.get(event.seriesId) || [];
      list.push(event);
      seriesMap.set(event.seriesId, list);
    } else {
      items.push({ ...event, totalInstances: 1, groupKey: event.id, isSeriesBatch: false });
    }
  }
  for (const [seriesId, instances] of seriesMap) {
    instances.sort((a, b) => a.date.localeCompare(b.date));
    items.push({
      ...instances[0],
      totalInstances: instances.length,
      groupKey: instances.length > 1 ? seriesId : instances[0].id,
      isSeriesBatch: instances.length > 1,
    });
  }
  // Newest submissions first
  return items.sort((a, b) => (b.createdAt || '').localeCompare(a.createdAt || ''));
}

function SubmitterTag({ event }: { event: Event }) {
  const role = event.submitterRole;
  const [label, cls] =
    role === 'admin'
      ? ['Admin', 'bg-navy text-white']
      : role === 'organizer'
      ? event.submitterVerified
        ? ['Verified Organizer', 'bg-success-tint text-success']
        : ['Organizer (Unverified)', 'bg-[#fff1d6] text-[#8a5a00]']
      : ['Event-Goer', 'bg-[#eef1f5] text-navy'];
  return <span className={`tag ${cls}`}>{label}</span>;
}

function ReviewRow({
  item,
  venues,
  showToast,
  onChanged,
}: {
  item: ReviewItem;
  venues: AdminVenue[];
  showToast: ShowToast;
  onChanged: () => Promise<void>;
}) {
  const [open, setOpen] = useState(false);
  const [rejecting, setRejecting] = useState(false);
  const [reason, setReason] = useState('');
  const [busy, setBusy] = useState<'approve' | 'reject' | null>(null);
  const special = isSpecialListing(item);
  const label = special ? 'special' : 'event';
  const pendingVenue = item.venue.status === 'pending';

  const approve = async () => {
    setBusy('approve');
    try {
      const res = await fetch(
        item.isSeriesBatch ? `/api/events/approve-recurring/${item.groupKey}` : `/api/events/${item.id}/approve`,
        { method: 'POST' }
      );
      if (!res.ok) throw new Error();
      showToast(item.isSeriesBatch ? `Approved all ${item.totalInstances} dates` : `${special ? 'Special' : 'Event'} approved`, 'success');
      await onChanged();
    } catch {
      showToast(`Couldn’t approve the ${label}`, 'error');
    } finally {
      setBusy(null);
    }
  };

  const reject = async () => {
    setBusy('reject');
    try {
      const res = await fetch(
        item.isSeriesBatch ? `/api/events/reject-recurring/${item.groupKey}` : `/api/events/${item.id}/reject`,
        { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ reason }) }
      );
      if (!res.ok) throw new Error();
      showToast(`Rejected — ${item.submitterName || 'the submitter'} will see your note`, 'info');
      setRejecting(false);
      await onChanged();
    } catch {
      showToast(`Couldn’t reject the ${label}`, 'error');
    } finally {
      setBusy(null);
    }
  };

  const when = isAllDayEvent(item) ? 'All day' : `${formatTime(item.startTime)}${item.endTime ? ` – ${formatTime(item.endTime)}` : ''}`;

  return (
    <div className="border-b border-line py-4 last:border-b-0">
      <div className="flex flex-col gap-3">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <span className={`tag ${special ? 'bg-coral text-navy' : 'bg-sky text-link-deep'}`}>
              {special ? <Utensils size={11} /> : <Calendar size={11} />}
              {special ? 'Special' : 'Event'}
            </span>
            <p className="min-w-0 truncate text-[16px] font-bold text-navy">{item.title}</p>
            {item.isRecurring && (
              <span className="flex items-center gap-1 text-[11px] font-medium text-link">
                <Repeat size={11} />
                {item.isSeriesBatch ? `${item.totalInstances} dates` : 'Recurring'}
              </span>
            )}
          </div>
          <p className="mt-1 text-[12px] text-ink-muted">
            {item.venue.name}
            {pendingVenue && <span className="font-bold text-[#8a5a00]"> (new venue)</span>} · {format(parseISO(item.date), 'EEE, MMM d')} · {when}
          </p>
          <div className="mt-1.5 flex flex-wrap items-center gap-x-2 gap-y-1 text-[12px] text-ink-muted">
            <SubmitterTag event={item} />
            <span>
              Submitted {item.createdAt ? format(new Date(item.createdAt), 'MMM d · h:mm a') : '—'}
              {item.submitterName && !item.submittedById ? ` by ${item.submitterName}` : ''}
            </span>
            {item.submittedById && (
              <Link href={`/admin/users/${item.submittedById}`} className="font-medium text-link hover:underline">
                {item.submitterName || 'Submitter'} · View profile
              </Link>
            )}
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          <button onClick={() => setOpen(!open)} className="btn-ghost btn-sm">
            {open ? <ChevronUp size={13} /> : <ChevronDown size={13} />} {open ? 'Hide' : 'Preview'}
          </button>
          <button
            onClick={() => setRejecting(!rejecting)}
            disabled={!!busy}
            className={`btn btn-sm border-[1.5px] font-medium ${rejecting ? 'border-danger text-danger' : 'border-line text-navy hover:border-danger hover:text-danger'}`}
          >
            Reject
          </button>
          <button onClick={approve} disabled={!!busy} className="btn-navy btn-sm">
            {busy === 'approve' ? <Loader2 size={13} className="animate-spin" /> : <Check size={13} />}
            {item.isSeriesBatch ? `Approve all (${item.totalInstances})` : 'Approve'}
          </button>
        </div>
      </div>

      {rejecting && (
        <div className="mt-3 rounded-[14px] border-[1.5px] border-danger/30 bg-danger-tint/40 p-4">
          <label htmlFor={`reason-${item.groupKey}`} className="field-label">
            Why isn&rsquo;t this being approved?
          </label>
          <textarea
            id={`reason-${item.groupKey}`}
            className="field bg-white"
            rows={3}
            maxLength={1000}
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            placeholder="e.g. This is already listed — see “Trivia Night” on Thursdays."
          />
          <p className="field-hint mt-1.5">The submitter sees this note under My Submissions and can edit and resubmit.</p>
          <div className="mt-3 flex gap-2">
            <button onClick={reject} disabled={!!busy} className="btn btn-sm bg-danger font-bold text-white">
              {busy === 'reject' && <Loader2 size={13} className="animate-spin" />}
              {item.isSeriesBatch ? `Reject all ${item.totalInstances}` : 'Reject'} &amp; send note
            </button>
            <button onClick={() => setRejecting(false)} className="btn-ghost btn-sm">
              Cancel
            </button>
          </div>
        </div>
      )}

      {open && (
        <div className={`mt-3 rounded-[16px] p-4 sm:p-5 ${special ? 'bg-white' : 'bg-sky-soft'}`}>
          {pendingVenue && (
            <p className="mb-3 rounded-[10px] bg-[#fff1d6] px-3 py-2 text-[12px] text-[#8a5a00]">
              {item.venue.name} is a new venue — approving this {label} adds the venue too.
            </p>
          )}
          <ListingEditor
            event={item}
            variant="review"
            venues={venues}
            forceScope={item.isRecurring ? 'future' : 'this'}
            onSaved={async () => {
              showToast(`Edits saved${item.isRecurring ? ' to every date' : ''} — approve to publish`, 'success');
              await onChanged();
            }}
            onError={(m) => showToast(m, 'error')}
          />
        </div>
      )}
    </div>
  );
}

function ApplicationRow({
  item,
  showToast,
  onChanged,
}: {
  item: OrganizerApplicationItem;
  showToast: ShowToast;
  onChanged: () => Promise<void>;
}) {
  const [expanded, setExpanded] = useState(false);
  const [busy, setBusy] = useState(false);
  const app = item.application;

  const act = async (action: 'approve' | 'decline') => {
    if (action === 'decline' && !window.confirm(`Decline ${item.name}’s organizer application?`)) return;
    setBusy(true);
    try {
      const res = await fetch('/api/admin/organizer-applications', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: item.id, action }),
      });
      if (!res.ok) throw new Error();
      showToast(action === 'approve' ? `${item.name}’s organizer account is approved` : 'Application declined', 'success');
      await onChanged();
    } catch {
      showToast('Failed to update organizer application', 'error');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="border-b border-line py-4 last:border-b-0">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="min-w-0">
          <p className="text-[16px] font-bold text-navy">
            {item.name}
            {app.role && <span className="font-normal text-ink-muted"> · {app.role}</span>}
          </p>
          <p className="truncate text-[13px] text-link">
            {item.email}
            {!item.emailConfirmed && <span className="ml-2 text-[12px] text-ink-muted">(email not verified yet)</span>}
          </p>
          <p className="mt-0.5 text-[12px] text-ink-muted">
            {app.venues.map((v) => (v.claimedVenueName ? `${v.claimedVenueName} (claimed)` : v.name)).join(', ') || 'No venue'} · Applied{' '}
            {format(new Date(item.createdAt), 'MMM d, yyyy')}
          </p>
        </div>
        <div className="flex shrink-0 gap-2">
          <button onClick={() => setExpanded(!expanded)} className="btn-ghost btn-sm">
            {expanded ? <ChevronUp size={13} /> : <ChevronDown size={13} />} Details
          </button>
          <button onClick={() => act('decline')} disabled={busy} className="btn-ghost btn-sm">
            Decline
          </button>
          <button onClick={() => act('approve')} disabled={busy} className="btn-navy btn-sm">
            {busy ? <Loader2 size={13} className="animate-spin" /> : <Check size={13} />} Approve
          </button>
        </div>
      </div>
      {expanded && (
        <div className="mt-4 grid grid-cols-1 gap-4 rounded-[14px] bg-sky-soft p-4 text-[13px] text-navy md:grid-cols-2">
          <div className="flex flex-col gap-1">
            <p className="eyebrow-sm">Contact</p>
            {app.phone && <p>Phone: {app.phone}</p>}
            <p>
              Confirm by: {app.confirmMethod === 'document' ? 'uploaded document' : 'work email'}
              {app.documentUrl && (
                <>
                  {' · '}
                  <a href={app.documentUrl} target="_blank" rel="noopener noreferrer" className="font-bold text-link hover:underline">
                    View document
                  </a>
                </>
              )}
            </p>
            {app.notes && <p className="mt-1 whitespace-pre-line">Notes: {app.notes}</p>}
            {app.accessibility.length > 0 && <p className="mt-1">Accessibility: {app.accessibility.join(', ')}</p>}
            {app.accessibilityNotes && <p>{app.accessibilityNotes}</p>}
          </div>
          {app.venues.map((v, i) => (
            <div key={i} className="flex flex-col gap-1">
              <p className="eyebrow-sm">{v.claimedVenueName ? `Claims ${v.claimedVenueName}` : `New venue: ${v.name}`}</p>
              {v.venueTypes.length > 0 && <p>{v.venueTypes.join(' · ')}</p>}
              {!v.claimedVenueId && v.address && <p>{v.address}</p>}
              {v.phone && <p>Phone: {v.phone}</p>}
              {v.website && <p>Website: {v.website}</p>}
              {v.instagram && <p>Instagram: @{v.instagram.replace(/^@/, '')}</p>}
              {v.about && <p className="text-ink-muted">{v.about}</p>}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function VenueRequestRow({
  item,
  showToast,
  onChanged,
}: {
  item: AdminVenueRequest;
  showToast: ShowToast;
  onChanged: () => Promise<void>;
}) {
  const [expanded, setExpanded] = useState(false);
  const [busy, setBusy] = useState(false);
  const v = item.venue;
  const venueLabel = v.claimedVenueName ? `${v.claimedVenueName} (claimed)` : `${v.name} (new venue)`;

  const act = async (action: 'approve' | 'decline') => {
    if (action === 'decline' && !window.confirm(`Decline ${item.userName}’s request to add ${v.claimedVenueName || v.name}?`)) return;
    setBusy(true);
    try {
      const res = await fetch('/api/admin/venue-requests', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: item.userId, requestId: item.id, action }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || 'Failed to update venue request');
      showToast(action === 'approve' ? `${v.claimedVenueName || v.name} added to ${item.userName}’s profile` : 'Venue request declined', 'success');
      await onChanged();
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Failed to update venue request', 'error');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="border-b border-line py-4 last:border-b-0">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="min-w-0">
          <p className="text-[16px] font-bold text-navy">
            {venueLabel}
          </p>
          <p className="truncate text-[13px]">
            <Link href={`/admin/users/${item.userId}`} className="font-medium text-link hover:underline">
              {item.userName}
            </Link>{' '}
            <span className="text-ink-muted">· {item.email}</span>
          </p>
          <p className="mt-0.5 text-[12px] text-ink-muted">
            Already on their profile: {item.currentVenues.join(', ') || 'none'} · Requested{' '}
            {item.requestedAt ? format(new Date(item.requestedAt), 'MMM d, yyyy') : '—'}
          </p>
        </div>
        <div className="flex shrink-0 gap-2">
          <button onClick={() => setExpanded(!expanded)} className="btn-ghost btn-sm">
            {expanded ? <ChevronUp size={13} /> : <ChevronDown size={13} />} Details
          </button>
          <button onClick={() => act('decline')} disabled={busy} className="btn-ghost btn-sm">
            Decline
          </button>
          <button onClick={() => act('approve')} disabled={busy} className="btn-navy btn-sm">
            {busy ? <Loader2 size={13} className="animate-spin" /> : <Check size={13} />} Approve
          </button>
        </div>
      </div>
      {expanded && (
        <div className="mt-4 flex flex-col gap-1 rounded-[14px] bg-sky-soft p-4 text-[13px] text-navy">
          {v.venueTypes.length > 0 && <p>{v.venueTypes.join(' · ')}</p>}
          {!v.claimedVenueId && v.address && <p>{v.address}</p>}
          {v.phone && <p>Phone: {v.phone}</p>}
          {v.website && <p>Website: {v.website}</p>}
          {v.instagram && <p>Instagram: @{v.instagram.replace(/^@/, '')}</p>}
          {v.about && <p className="text-ink-muted">{v.about}</p>}
          {v.logoUrl && (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={v.logoUrl} alt="" className="mt-2 h-16 w-16 rounded-[10px] bg-white object-contain p-1" />
          )}
        </div>
      )}
    </div>
  );
}

function VerificationRequestRow({
  organizer,
  onToggleVerified,
}: {
  organizer: AdminOrganizer;
  onToggleVerified: (o: AdminOrganizer, verified: boolean) => Promise<void>;
}) {
  const [open, setOpen] = useState(false);
  return (
    <div className="border-b border-line py-4 last:border-b-0">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="min-w-0">
          <p className="text-[16px] font-bold text-navy">
            {organizer.name}
            {organizer.venues.length > 0 && <span className="font-normal text-ink-muted"> · {organizer.venues.map((v) => v.name).join(', ')}</span>}
          </p>
          <p className="truncate text-[13px] text-link">{organizer.email}</p>
          <p className="mt-0.5 text-[12px] text-ink-muted">
            Requested {organizer.verificationRequestedAt ? format(new Date(organizer.verificationRequestedAt), 'MMM d, yyyy · h:mm a') : '—'} · Joined{' '}
            {format(new Date(organizer.createdAt), 'MMM d, yyyy')}
          </p>
        </div>
        <div className="flex shrink-0 flex-wrap items-center gap-2">
          <button onClick={() => setOpen(!open)} className="btn-ghost btn-sm">
            {open ? <ChevronUp size={13} /> : <ChevronDown size={13} />} Preview profile
          </button>
          <Link href={`/admin/users/${organizer.id}`} className="btn-outline btn-sm">
            <UserRound size={13} /> View profile
          </Link>
          <VerifiedSwitch organizer={organizer} onToggle={onToggleVerified} />
        </div>
      </div>
      {open && (
        <div className="mt-3">
          <OrganizerPreview organizer={organizer} />
        </div>
      )}
    </div>
  );
}

export default function ReviewQueueTab({
  pendingEvents,
  venues,
  organizers,
  applications,
  venueRequests,
  showToast,
  onListingsChanged,
  onOrganizersChanged,
  onToggleVerified,
}: {
  pendingEvents: Event[];
  venues: AdminVenue[];
  organizers: AdminOrganizer[];
  applications: OrganizerApplicationItem[];
  venueRequests: AdminVenueRequest[];
  showToast: ShowToast;
  onListingsChanged: () => Promise<void>;
  onOrganizersChanged: () => Promise<void>;
  onToggleVerified: (o: AdminOrganizer, verified: boolean) => Promise<void>;
}) {
  const items = useMemo(() => groupPending(pendingEvents), [pendingEvents]);
  const eventItems = items.filter((i) => !isSpecialListing(i));
  const specialItems = items.filter((i) => isSpecialListing(i));
  const requests = organizers
    .filter((o) => o.verificationRequestedAt && !o.isVerifiedOrganizer)
    .sort((a, b) => (b.verificationRequestedAt || '').localeCompare(a.verificationRequestedAt || ''));
  const approvedVenues = venues.filter((v) => v.status !== 'pending' || pendingEvents.some((e) => e.venue.id === v.id));

  const empty = (what: string) => (
    <div className="py-10 text-center">
      <div className="mx-auto flex h-10 w-10 items-center justify-center rounded-full bg-success-tint text-success">
        <Check size={18} />
      </div>
      <p className="mt-3 text-[16px] font-bold text-navy">All caught up</p>
      <p className="mt-0.5 text-[13px] text-ink-muted">No {what} waiting for review.</p>
    </div>
  );

  return (
    <div className="flex flex-col gap-14">
      <div className="grid grid-cols-1 gap-8 xl:grid-cols-2">
        <section className="min-w-0">
          <div className="flex items-baseline justify-between border-b-[1.5px] border-navy pb-2.5">
            <h2 className="flex items-center gap-2 text-[22px] font-bold text-navy">
              <Calendar size={20} className="text-link" /> Events
            </h2>
            <span className="text-[12px] text-ink-muted">{eventItems.length} waiting · newest first</span>
          </div>
          {eventItems.length === 0
            ? empty('events')
            : eventItems.map((item) => (
                <ReviewRow key={item.groupKey} item={item} venues={approvedVenues} showToast={showToast} onChanged={onListingsChanged} />
              ))}
        </section>

        <section className="min-w-0 self-start rounded-[25px] bg-[#fdf1ea] px-5 pb-2 pt-5 sm:px-7">
          <div className="flex items-baseline justify-between border-b-[1.5px] border-navy pb-2.5">
            <h2 className="flex items-center gap-2 text-[22px] font-bold text-navy">
              <Utensils size={20} className="text-[#a84a12]" /> Food &amp; drink specials
            </h2>
            <span className="text-[12px] text-ink-muted">{specialItems.length} waiting · newest first</span>
          </div>
          {specialItems.length === 0
            ? empty('specials')
            : specialItems.map((item) => (
                <ReviewRow key={item.groupKey} item={item} venues={approvedVenues} showToast={showToast} onChanged={onListingsChanged} />
              ))}
        </section>
      </div>

      <section>
        <div className="flex flex-wrap items-baseline justify-between gap-2 border-b-[1.5px] border-navy pb-2.5">
          <h2 className="text-[22px] font-bold text-navy">Requested to be a Verified Organizer</h2>
          <span className="text-[12px] text-ink-muted">Verified Organizers publish without review</span>
        </div>
        {requests.length === 0 ? (
          <p className="py-8 text-[14px] text-ink-muted">No organizers are waiting to be verified.</p>
        ) : (
          requests.map((o) => <VerificationRequestRow key={o.id} organizer={o} onToggleVerified={onToggleVerified} />)
        )}
      </section>

      <section>
        <div className="flex flex-wrap items-baseline justify-between gap-2 border-b-[1.5px] border-navy pb-2.5">
          <h2 className="text-[22px] font-bold text-navy">New organizer sign-ups</h2>
          <span className="text-[12px] text-ink-muted">Confirm they&rsquo;re connected to the venue before approving</span>
        </div>
        {applications.length === 0 ? (
          <p className="py-8 text-[14px] text-ink-muted">No new organizer applications.</p>
        ) : (
          applications.map((item) => <ApplicationRow key={item.id} item={item} showToast={showToast} onChanged={onOrganizersChanged} />)
        )}
      </section>

      <section>
        <div className="flex flex-wrap items-baseline justify-between gap-2 border-b-[1.5px] border-navy pb-2.5">
          <h2 className="text-[22px] font-bold text-navy">Venues organizers asked to add</h2>
          <span className="text-[12px] text-ink-muted">Confirm they&rsquo;re connected to the venue before approving</span>
        </div>
        {venueRequests.length === 0 ? (
          <p className="py-8 text-[14px] text-ink-muted">No venue requests.</p>
        ) : (
          venueRequests.map((item) => <VenueRequestRow key={item.id} item={item} showToast={showToast} onChanged={onOrganizersChanged} />)
        )}
      </section>
    </div>
  );
}
