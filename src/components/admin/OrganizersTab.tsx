'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';
import { format } from 'date-fns';
import { ChevronDown, ChevronUp, Loader2, Search, SlidersHorizontal, Trash2, UserRound, X } from 'lucide-react';
import { DatePicker } from '@/components';
import type { AdminOrganizer, ShowToast } from './types';

type View = 'requested' | 'unverified' | 'verified' | 'all';
type Column = 'email' | 'accountRole' | 'venue' | 'venueRole' | 'created' | 'status';

const COLUMNS: { id: Column; label: string }[] = [
  { id: 'email', label: 'Email' },
  { id: 'accountRole', label: 'Account role' },
  { id: 'venue', label: 'Venue' },
  { id: 'venueRole', label: 'Role at venue' },
  { id: 'created', label: 'Account created' },
  { id: 'status', label: 'Status' },
];

export function organizerStatus(o: AdminOrganizer): { label: string; cls: string } {
  if (o.isVerifiedOrganizer) return { label: 'Verified Organizer', cls: 'bg-success-tint text-success' };
  if (o.verificationRequestedAt) return { label: 'Requested verification', cls: 'bg-sun text-navy' };
  if (o.applicationDeclined) return { label: 'Application declined', cls: 'bg-danger-tint text-danger' };
  if (!o.organizerApproved) return { label: 'Application pending', cls: 'bg-[#fff1d6] text-[#8a5a00]' };
  return { label: 'Unverified', cls: 'bg-[#eef1f5] text-navy' };
}

const roleLabel = (role: string) => (role === 'user' ? 'Event-goer' : role.charAt(0).toUpperCase() + role.slice(1));

export function VerifiedSwitch({
  organizer,
  onToggle,
}: {
  organizer: AdminOrganizer;
  onToggle: (o: AdminOrganizer, verified: boolean) => Promise<void>;
}) {
  const [busy, setBusy] = useState(false);
  const on = organizer.isVerifiedOrganizer;
  return (
    <label className="flex shrink-0 items-center gap-2 text-[12px] font-bold text-navy">
      <button
        type="button"
        className="switch"
        data-on={on}
        disabled={busy}
        aria-pressed={on}
        aria-label={`Verified Organizer: ${organizer.name}`}
        onClick={async () => {
          setBusy(true);
          try {
            await onToggle(organizer, !on);
          } finally {
            setBusy(false);
          }
        }}
      >
        <span />
      </button>
      {busy ? <Loader2 size={12} className="animate-spin" /> : 'Verified'}
    </label>
  );
}

/** Profile details an organizer gave on sign-up */
export function OrganizerPreview({ organizer: o }: { organizer: AdminOrganizer }) {
  const app = o.application;
  const status = organizerStatus(o);
  return (
    <div className="grid grid-cols-1 gap-4 rounded-[14px] bg-sky-soft p-4 text-[13px] text-navy md:grid-cols-2">
      <div className="flex flex-col gap-1">
        <p className="eyebrow-sm">Account</p>
        <p className="font-bold">{o.name}</p>
        <p>
          <a href={`mailto:${o.email}`} className="text-link hover:underline">
            {o.email}
          </a>
          {!o.emailConfirmed && <span className="text-ink-muted"> (email not verified)</span>}
        </p>
        <p>
          {roleLabel(o.accountRole)} · <span className={`tag ${status.cls}`}>{status.label}</span>
        </p>
        <p className="text-ink-muted">
          Joined {format(new Date(o.createdAt), 'MMM d, yyyy')}
          {o.lastSignInAt ? ` · Last signed in ${format(new Date(o.lastSignInAt), 'MMM d, yyyy')}` : ''}
        </p>
        {o.verifiedAt && <p className="text-ink-muted">Verified {format(new Date(o.verifiedAt), 'MMM d, yyyy')}</p>}
        {app && (
          <>
            {app.phone && <p className="mt-2">Phone: {app.phone}</p>}
            {o.venueRole && <p>Role at venue: {o.venueRole}</p>}
            <p>
              Confirm by: {app.confirmMethod === 'document' ? 'uploaded document' : 'work email'}
              {app.hasDocument ? ' (document on file)' : ''}
            </p>
            {app.notes && <p className="whitespace-pre-line">Notes: {app.notes}</p>}
            {app.accessibility.length > 0 && <p>Accessibility: {app.accessibility.join(', ')}</p>}
            <p className="text-ink-muted">Newsletter: {app.newsletter ? 'Yes' : 'No'}</p>
          </>
        )}
      </div>
      <div className="flex flex-col gap-3">
        <p className="eyebrow-sm">Venues</p>
        {o.venues.length === 0 && <p className="text-ink-muted">No venue on file.</p>}
        {o.venues.map((v, i) => {
          const detail = app?.venues.find((av) => av.name === v.name);
          return (
            <div key={`${v.id}-${i}`} className="flex flex-col gap-0.5">
              {v.id ? (
                <Link href={`/admin/venues/${v.id}`} className="font-bold text-link hover:underline">
                  {v.name}
                </Link>
              ) : (
                <p className="font-bold">{v.name}</p>
              )}
              {detail?.venueTypes.length ? <p>{detail.venueTypes.join(' · ')}</p> : null}
              {detail?.address && <p className="text-ink-muted">{detail.address}</p>}
              {detail?.website && <p>Website: {detail.website}</p>}
              {detail?.instagram && <p>Instagram: @{detail.instagram.replace(/^@/, '')}</p>}
              {detail?.about && <p className="text-ink-muted">{detail.about}</p>}
            </div>
          );
        })}
      </div>
    </div>
  );
}

export default function OrganizersTab({
  organizers,
  loading,
  showToast,
  onToggleVerified,
  onChanged,
}: {
  organizers: AdminOrganizer[];
  loading: boolean;
  showToast: ShowToast;
  onToggleVerified: (o: AdminOrganizer, verified: boolean) => Promise<void>;
  onChanged: () => Promise<void>;
}) {
  const [view, setView] = useState<View>('requested');
  const [query, setQuery] = useState('');
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');
  const [columns, setColumns] = useState<Record<Column, boolean>>({
    email: true,
    accountRole: true,
    venue: true,
    venueRole: false,
    created: true,
    status: true,
  });
  const [showColumns, setShowColumns] = useState(false);
  const [expanded, setExpanded] = useState<string | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<AdminOrganizer | null>(null);
  const [deleting, setDeleting] = useState(false);

  const counts = useMemo(
    () => ({
      requested: organizers.filter((o) => o.verificationRequestedAt && !o.isVerifiedOrganizer).length,
      unverified: organizers.filter((o) => !o.isVerifiedOrganizer).length,
      verified: organizers.filter((o) => o.isVerifiedOrganizer).length,
      all: organizers.length,
    }),
    [organizers]
  );

  const rows = useMemo(() => {
    const q = query.trim().toLowerCase();
    return organizers
      .filter((o) =>
        view === 'requested'
          ? o.verificationRequestedAt && !o.isVerifiedOrganizer
          : view === 'unverified'
          ? !o.isVerifiedOrganizer
          : view === 'verified'
          ? o.isVerifiedOrganizer
          : true
      )
      .filter(
        (o) =>
          !q ||
          o.name.toLowerCase().includes(q) ||
          o.email.toLowerCase().includes(q) ||
          o.venues.some((v) => v.name.toLowerCase().includes(q))
      )
      .filter((o) => {
        const day = o.createdAt.slice(0, 10);
        return (!from || day >= from) && (!to || day <= to);
      });
  }, [organizers, view, query, from, to]);

  const handleDelete = async () => {
    if (!confirmDelete) return;
    setDeleting(true);
    try {
      const res = await fetch(`/api/admin/organizers?userId=${encodeURIComponent(confirmDelete.id)}`, { method: 'DELETE' });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || 'Failed to delete account');
      showToast(`${confirmDelete.name}’s account was deleted`, 'success');
      setConfirmDelete(null);
      await onChanged();
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Failed to delete account', 'error');
    } finally {
      setDeleting(false);
    }
  };

  // Fixed widths outside the fr columns (no `auto`) so every row's grid lines up with the header
  const columnWidth: Record<Column, string> = {
    email: 'minmax(160px,1.3fr)',
    accountRole: '110px',
    venue: 'minmax(120px,1.2fr)',
    venueRole: 'minmax(100px,0.8fr)',
    created: '120px',
    status: '200px',
  };
  const gridCols = ['minmax(160px,1.4fr)', ...COLUMNS.filter((c) => columns[c.id]).map((c) => columnWidth[c.id]), '280px'].join(' ');

  return (
    <div>
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div className="segmented flex-wrap">
          {(
            [
              ['requested', 'Requested verification'],
              ['unverified', 'Unverified'],
              ['verified', 'Verified'],
              ['all', 'All organizers'],
            ] as [View, string][]
          ).map(([id, label]) => (
            <button key={id} className="segmented-item gap-2" data-active={view === id} onClick={() => setView(id)}>
              {label}
              <span className={`rounded-full px-1.5 py-0.5 text-[10px] font-bold leading-none ${view === id ? 'bg-sun text-navy' : 'bg-white text-navy'}`}>
                {counts[id]}
              </span>
            </button>
          ))}
        </div>
      </div>

      <div className="mt-5 flex flex-col gap-3 lg:flex-row lg:items-center">
        <div className="relative flex-1">
          <Search size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-navy" />
          <input
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search name, email or venue…"
            className="h-11 w-full rounded-full border border-line bg-white pl-10 pr-4 text-[14px] text-navy outline-none focus:border-navy"
          />
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-[12px] text-ink-muted">Joined</span>
          <div className="w-[150px]">
            <DatePicker value={from} onChange={setFrom} placeholder="From" className="text-sm" />
          </div>
          <div className="w-[150px]">
            <DatePicker value={to} onChange={setTo} placeholder="To" className="text-sm" />
          </div>
          {(from || to) && (
            <button className="btn-ghost btn-sm" onClick={() => { setFrom(''); setTo(''); }}>
              <X size={13} /> Clear
            </button>
          )}
          <div className="relative">
            <button className="chip h-11 gap-2" onClick={() => setShowColumns(!showColumns)} data-active={showColumns}>
              <SlidersHorizontal size={14} /> Columns
            </button>
            {showColumns && (
              <>
                <div className="fixed inset-0 z-10" onClick={() => setShowColumns(false)} />
                <div className="absolute right-0 top-full z-20 mt-2 w-56 rounded-[14px] border border-line bg-white p-3 shadow-lg">
                  {COLUMNS.map((c) => (
                    <label key={c.id} className="flex items-center gap-2.5 py-1.5 text-[13px] text-navy">
                      <input
                        type="checkbox"
                        checked={columns[c.id]}
                        onChange={(e) => setColumns({ ...columns, [c.id]: e.target.checked })}
                        className="h-4 w-4 accent-navy"
                      />
                      {c.label}
                    </label>
                  ))}
                </div>
              </>
            )}
          </div>
        </div>
      </div>

      <div className="mt-6 overflow-x-auto">
        <div className="min-w-[1040px]">
          <div
            className="grid gap-4 border-b-[1.5px] border-navy px-2 pb-2.5 text-[11px] font-medium uppercase tracking-[0.14em] text-ink-muted"
            style={{ gridTemplateColumns: gridCols }}
          >
            <span>Name</span>
            {COLUMNS.filter((c) => columns[c.id]).map((c) => (
              <span key={c.id}>{c.label}</span>
            ))}
            <span className="text-right">Verified · Actions</span>
          </div>

          {loading ? (
            <div className="flex justify-center py-12">
              <Loader2 size={24} className="animate-spin text-navy" />
            </div>
          ) : rows.length === 0 ? (
            <p className="px-2 py-10 text-[14px] text-ink-muted">No organizers match.</p>
          ) : (
            rows.map((o) => {
              const status = organizerStatus(o);
              const open = expanded === o.id;
              return (
                <div key={o.id} className="border-b border-line">
                  <div className="grid items-center gap-4 px-2 py-3 text-[13px] text-navy" style={{ gridTemplateColumns: gridCols }}>
                    <button type="button" onClick={() => setExpanded(open ? null : o.id)} className="flex min-w-0 items-center gap-1.5 text-left">
                      {open ? <ChevronUp size={13} className="shrink-0" /> : <ChevronDown size={13} className="shrink-0" />}
                      <span className="truncate text-[14px] font-bold">{o.name}</span>
                    </button>
                    {columns.email && <span className="truncate text-link">{o.email}</span>}
                    {columns.accountRole && <span>{roleLabel(o.accountRole)}</span>}
                    {columns.venue && <span className="truncate">{o.venues.map((v) => v.name).join(', ') || '—'}</span>}
                    {columns.venueRole && <span className="truncate">{o.venueRole || '—'}</span>}
                    {columns.created && <span>{format(new Date(o.createdAt), 'MMM d, yyyy')}</span>}
                    {columns.status && (
                      <span>
                        <span className={`tag whitespace-nowrap ${status.cls}`}>{status.label}</span>
                      </span>
                    )}
                    <span className="flex items-center justify-end gap-2">
                      <VerifiedSwitch organizer={o} onToggle={onToggleVerified} />
                      <Link href={`/admin/users/${o.id}`} className="btn-outline btn-sm h-8 px-3" title="Admin View Profile">
                        <UserRound size={13} /> View profile
                      </Link>
                      <button
                        type="button"
                        onClick={() => setConfirmDelete(o)}
                        className="flex h-8 w-8 items-center justify-center rounded-full text-danger hover:bg-danger-tint"
                        aria-label={`Delete ${o.name}’s account`}
                      >
                        <Trash2 size={14} />
                      </button>
                    </span>
                  </div>
                  {open && (
                    <div className="px-2 pb-4">
                      <OrganizerPreview organizer={o} />
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>
      </div>

      {confirmDelete && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-navy/50 p-4" onClick={() => !deleting && setConfirmDelete(null)}>
          <div className="w-full max-w-md rounded-[22px] bg-white p-6" onClick={(e) => e.stopPropagation()}>
            <p className="text-[20px] font-bold text-navy">Delete {confirmDelete.name}&rsquo;s account?</p>
            <p className="mt-2 text-[14px] text-ink-muted">
              This permanently deletes the account ({confirmDelete.email}), every event and special they submitted, and their saved listings.
              Venues stay. This can&rsquo;t be undone.
            </p>
            <div className="mt-6 flex justify-end gap-2">
              <button className="btn-ghost" onClick={() => setConfirmDelete(null)} disabled={deleting}>
                Keep account
              </button>
              <button className="btn bg-danger font-bold text-white" onClick={handleDelete} disabled={deleting}>
                {deleting && <Loader2 size={14} className="animate-spin" />} Delete account
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
