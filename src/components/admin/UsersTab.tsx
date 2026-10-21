'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';
import { format, parseISO } from 'date-fns';
import { Calendar, Check, ChevronDown, ChevronUp, Loader2, Repeat, Search, UserRound, Utensils, X } from 'lucide-react';
import type { AdminEventGoer, AdminListingSummary, AdminUserType } from '@/app/api/admin/users/route';

type View = 'all' | 'submitted' | 'saved';
type TypeFilter = 'all' | AdminUserType;
type Sort = 'newest' | 'oldest' | 'active';

const userTypes: Record<AdminUserType, { label: string; cls: string }> = {
  'event-goer': { label: 'Event-goer', cls: 'bg-sky text-navy' },
  organizer: { label: 'Organizer', cls: 'bg-[#fff1d6] text-[#8a5a00]' },
  'verified-organizer': { label: 'Verified Organizer', cls: 'bg-success-tint text-success' },
};
const statusStyles: Record<string, string> = {
  approved: 'bg-success-tint text-success',
  pending: 'bg-[#fff1d6] text-[#8a5a00]',
  rejected: 'bg-[#ffe1da] text-[#ad290c]',
  cancelled: 'bg-[#eef1f5] text-ink-muted',
};

function ListingList({ title, items, empty, showStatus }: { title: string; items: AdminListingSummary[]; empty: string; showStatus: boolean }) {
  const today = format(new Date(), 'yyyy-MM-dd');
  return (
    <div className="min-w-0">
      <p className="eyebrow-sm">
        {title} · {items.length}
      </p>
      {items.length === 0 ? (
        <p className="py-2 text-ink-muted">{empty}</p>
      ) : (
        <ul className="mt-1 max-h-72 overflow-y-auto">
          {items.map((e) => (
            <li key={e.id} className="flex items-center gap-3 border-b border-line/70 py-2 last:border-b-0">
              <span className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-[8px] ${e.isSpecial ? 'bg-[#ffe8d6] text-[#a84a12]' : 'bg-sky text-link-deep'}`}>
                {e.isSpecial ? <Utensils size={13} /> : <Calendar size={13} />}
              </span>
              <span className="min-w-0 flex-1">
                <Link href={`/events/${e.id}`} className="block truncate font-bold hover:underline">
                  {e.title}
                </Link>
                <span className="flex items-center gap-1 text-[12px] text-ink-muted">
                  {e.count > 1 && <Repeat size={11} />}
                  {format(parseISO(e.date), 'EEE, MMM d, yyyy')}
                  {e.count > 1 ? ` · ${e.count} dates` : ''} · {e.venueName}
                  {!showStatus && e.date < today ? ' · past' : ''}
                </span>
              </span>
              {showStatus && <span className={`tag shrink-0 ${statusStyles[e.status] ?? 'bg-sky text-navy'}`}>{e.status}</span>}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

export default function UsersTab({ users, loading }: { users: AdminEventGoer[]; loading: boolean }) {
  const [type, setType] = useState<TypeFilter>('all');
  const [view, setView] = useState<View>('all');
  const [sort, setSort] = useState<Sort>('newest');
  const [query, setQuery] = useState('');
  const [expanded, setExpanded] = useState<string | null>(null);

  const typeCounts = useMemo(
    () => ({
      all: users.length,
      'event-goer': users.filter((u) => u.userType === 'event-goer').length,
      organizer: users.filter((u) => u.userType === 'organizer').length,
      'verified-organizer': users.filter((u) => u.userType === 'verified-organizer').length,
    }),
    [users]
  );

  const rows = useMemo(() => {
    const q = query.trim().toLowerCase();
    const filtered = users
      .filter((u) => type === 'all' || u.userType === type)
      .filter((u) => (view === 'submitted' ? u.submitted.length > 0 : view === 'saved' ? u.saved.length > 0 : true))
      .filter((u) => !q || u.name.toLowerCase().includes(q) || u.email.toLowerCase().includes(q));
    return [...filtered].sort((a, b) =>
      sort === 'oldest'
        ? a.createdAt.localeCompare(b.createdAt)
        : sort === 'active'
        ? (b.lastSignInAt || '').localeCompare(a.lastSignInAt || '')
        : b.createdAt.localeCompare(a.createdAt)
    );
  }, [users, type, view, query, sort]);

  // Fixed widths outside the fr columns so every row's grid lines up with the header
  const gridCols = 'minmax(160px,1.3fr) minmax(180px,1.4fr) 170px 110px 110px 70px 80px 60px 130px';

  return (
    <div>
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div className="segmented flex-wrap">
          {(
            [
              ['all', 'All users'],
              ['event-goer', 'Event-goers'],
              ['organizer', 'Organizers'],
              ['verified-organizer', 'Verified Organizers'],
            ] as [TypeFilter, string][]
          ).map(([id, label]) => (
            <button key={id} className="segmented-item gap-2" data-active={type === id} onClick={() => setType(id)}>
              {label}
              <span className={`rounded-full px-1.5 py-0.5 text-[10px] font-bold leading-none ${type === id ? 'bg-sun text-navy' : 'bg-white text-navy'}`}>
                {typeCounts[id]}
              </span>
            </button>
          ))}
        </div>
        <p className="text-[12px] text-ink-muted">Admins aren’t listed. Manage organizer verification on the Organizers tab.</p>
      </div>

      <div className="mt-5 flex flex-col gap-3 lg:flex-row lg:flex-wrap lg:items-center">
        <div className="relative flex-1 lg:min-w-[260px]">
          <Search size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-navy" />
          <input
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search name or email…"
            className="h-11 w-full rounded-full border border-line bg-white pl-10 pr-4 text-[14px] text-navy outline-none focus:border-navy"
          />
        </div>
        <div className="segmented">
          {(
            [
              ['all', 'Any activity'],
              ['submitted', 'Have submitted'],
              ['saved', 'Have saved'],
            ] as [View, string][]
          ).map(([id, label]) => (
            <button key={id} className="segmented-item h-9" data-active={view === id} onClick={() => setView(id)}>
              {label}
            </button>
          ))}
        </div>
        <div className="segmented">
          {(
            [
              ['newest', 'Newest'],
              ['oldest', 'Oldest'],
              ['active', 'Recently active'],
            ] as [Sort, string][]
          ).map(([id, label]) => (
            <button key={id} className="segmented-item h-9" data-active={sort === id} onClick={() => setSort(id)}>
              {label}
            </button>
          ))}
        </div>
      </div>

      <div className="mt-6 overflow-x-auto">
        <div className="min-w-[1080px]">
          <div
            className="grid gap-4 border-b-[1.5px] border-navy px-2 pb-2.5 text-[11px] font-medium uppercase tracking-[0.14em] text-ink-muted"
            style={{ gridTemplateColumns: gridCols }}
          >
            <span>Name</span>
            <span>Email</span>
            <span>Type</span>
            <span>Joined</span>
            <span>Last sign-in</span>
            <span>Verified</span>
            <span>Submitted</span>
            <span>Saved</span>
            <span className="text-right">Actions</span>
          </div>

          {loading ? (
            <div className="flex justify-center py-12">
              <Loader2 size={24} className="animate-spin text-navy" />
            </div>
          ) : rows.length === 0 ? (
            <p className="px-2 py-10 text-[14px] text-ink-muted">No users match.</p>
          ) : (
            rows.map((u) => {
              const open = expanded === u.id;
              return (
                <div key={u.id} className="border-b border-line">
                  <div className="grid items-center gap-4 px-2 py-3 text-[13px] text-navy" style={{ gridTemplateColumns: gridCols }}>
                    <button type="button" onClick={() => setExpanded(open ? null : u.id)} className="flex min-w-0 items-center gap-1.5 text-left">
                      {open ? <ChevronUp size={13} className="shrink-0" /> : <ChevronDown size={13} className="shrink-0" />}
                      <span className="truncate text-[14px] font-bold">{u.name}</span>
                    </button>
                    <a href={`mailto:${u.email}`} className="truncate text-link hover:underline">
                      {u.email}
                    </a>
                    <span>
                      <span className={`tag whitespace-nowrap ${userTypes[u.userType].cls}`}>{userTypes[u.userType].label}</span>
                    </span>
                    <span>{format(new Date(u.createdAt), 'MMM d, yyyy')}</span>
                    <span>{u.lastSignInAt ? format(new Date(u.lastSignInAt), 'MMM d, yyyy') : '—'}</span>
                    <span aria-label={u.emailConfirmed ? 'Email verified' : 'Email not verified'}>
                      {u.emailConfirmed ? <Check size={15} className="text-success" /> : <X size={15} className="text-danger" />}
                    </span>
                    <span className="font-bold">{u.submitted.length}</span>
                    <span className="font-bold">{u.saved.length}</span>
                    <span className="flex justify-end">
                      <Link href={`/admin/users/${u.id}`} className="btn-outline btn-sm h-8 px-3" title="Admin View Profile">
                        <UserRound size={13} /> View profile
                      </Link>
                    </span>
                  </div>
                  {open && (
                    <div className="px-2 pb-4">
                      <div className="grid grid-cols-1 gap-6 rounded-[14px] bg-sky-soft p-4 text-[13px] text-navy md:grid-cols-2">
                        <ListingList title="Submitted" items={u.submitted} empty="Hasn’t submitted anything." showStatus />
                        <ListingList title="Saved" items={u.saved} empty="Hasn’t saved anything." showStatus={false} />
                      </div>
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
}
