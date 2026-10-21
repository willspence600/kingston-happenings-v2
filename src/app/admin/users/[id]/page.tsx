'use client';

import { use, useCallback, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { format, parseISO } from 'date-fns';
import { ArrowLeft, Bookmark, Calendar, Check, Loader2, Mail, Repeat, Shield, Trash2, Utensils, X } from 'lucide-react';
import type { Event } from '@/types/event';
import { useAuth } from '@/contexts/AuthContext';
import { useEvents } from '@/contexts/EventsContext';
import { Toast } from '@/components';
import { formatTime, isAllDayEvent } from '@/components/brand';
import ListingModal from '@/components/admin/ListingModal';
import type { ToastType } from '@/components/admin/types';
import { getRecurrenceLabel } from '@/utils/recurrenceLabel';

interface ProfileUser {
  id: string;
  name: string;
  email: string;
  emailConfirmed: boolean;
  role: string;
  createdAt: string;
  lastSignInAt: string | null;
  agreedToTermsAt: string | null;
  organizerApproved: boolean;
  applicationDeclined: boolean;
  isVerifiedOrganizer: boolean;
  verificationRequestedAt: string | null;
  verifiedAt: string | null;
  venues: { id: string; name: string; address: string }[];
  pendingVenueNotices: number;
  emailPreferences: { key: string; label: string; on: boolean }[];
  application: {
    phone: string;
    role: string;
    confirmMethod: 'email' | 'document';
    documentUrl: string | null;
    notes: string;
    accessibility: string[];
    accessibilityNotes: string;
    submittedAt: string;
    venues: { name: string; claimedVenueId: string | null; venueTypes: string[]; address: string; phone: string; website: string; instagram: string; about: string }[];
  } | null;
}

type Listing = Event & { savedAt?: string };

const roleLabel = (role: string) => (role === 'user' ? 'Event-goer' : role.charAt(0).toUpperCase() + role.slice(1));
const statusStyles: Record<string, string> = {
  approved: 'bg-success-tint text-success',
  pending: 'bg-[#fff1d6] text-[#8a5a00]',
  rejected: 'bg-[#ffe1da] text-[#ad290c]',
  cancelled: 'bg-[#eef1f5] text-ink-muted',
};

function accountStatus(u: ProfileUser): { label: string; cls: string } {
  if (u.role === 'admin') return { label: 'Admin', cls: 'bg-navy text-white' };
  if (u.role !== 'organizer') return { label: 'Event-goer', cls: 'bg-[#eef1f5] text-navy' };
  if (u.isVerifiedOrganizer) return { label: 'Verified Organizer', cls: 'bg-success-tint text-success' };
  if (u.verificationRequestedAt) return { label: 'Requested verification', cls: 'bg-sun text-navy' };
  if (u.applicationDeclined) return { label: 'Application declined', cls: 'bg-danger-tint text-danger' };
  if (!u.organizerApproved) return { label: 'Application pending', cls: 'bg-[#fff1d6] text-[#8a5a00]' };
  return { label: 'Organizer (Unverified)', cls: 'bg-[#eef1f5] text-navy' };
}

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex items-start justify-between gap-4 border-b border-line py-3 text-[14px] last:border-b-0">
      <span className="shrink-0 text-ink-muted">{label}</span>
      <span className="min-w-0 text-right font-medium text-navy">{children}</span>
    </div>
  );
}

/** One row per recurring series */
function groupSeries(list: Listing[]): (Listing & { count: number })[] {
  const map = new Map<string, Listing[]>();
  list.forEach((e) => {
    const key = e.seriesId || e.id;
    if (!map.has(key)) map.set(key, []);
    map.get(key)!.push(e);
  });
  const today = format(new Date(), 'yyyy-MM-dd');
  return [...map.values()].map((items) => {
    const sorted = [...items].sort((a, b) => a.date.localeCompare(b.date));
    const rep = sorted.find((e) => e.date >= today) ?? sorted[sorted.length - 1];
    const status = items.some((e) => e.status === 'pending') ? 'pending' : rep.status;
    return { ...rep, status, count: items.length };
  });
}

function ListingRow({ e, onOpen, savedAt }: { e: Listing & { count?: number }; onOpen: () => void; savedAt?: string }) {
  const special = e.categories.includes('food-deal');
  return (
    <button type="button" onClick={onOpen} className="group flex w-full items-start gap-4 border-b border-line py-3 text-left hover:bg-sky-soft">
      <span className={`mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-[10px] ${special ? 'bg-[#ffe8d6] text-[#a84a12]' : 'bg-sky text-link-deep'}`}>
        {special ? <Utensils size={15} /> : <Calendar size={15} />}
      </span>
      <span className="min-w-0 flex-1">
        <span className="block truncate text-[15px] font-bold text-navy group-hover:underline">{e.title}</span>
        <span className="flex flex-wrap items-center gap-1 text-[12px] text-ink-muted">
          {e.isRecurring && <Repeat size={11} />}
          {e.isRecurring
            ? `${getRecurrenceLabel({ recurrencePattern: e.recurrencePattern, recurrenceDays: e.recurrenceDays, recurrenceDay: e.recurrenceDay })}${e.count && e.count > 1 ? ` · ${e.count} dates` : ''}`
            : format(parseISO(e.date), 'EEE, MMM d, yyyy')}
          {' · '}
          {isAllDayEvent(e) ? 'All day' : formatTime(e.startTime)} · {e.venue.name}
        </span>
        {e.status === 'rejected' && e.rejectionReason && <span className="mt-1 block text-[12px] text-[#ad290c]">Rejection note: {e.rejectionReason}</span>}
        {savedAt && <span className="mt-0.5 block text-[12px] text-ink-muted">Saved {format(new Date(savedAt), 'MMM d, yyyy')}</span>}
      </span>
      {e.status && <span className={`tag shrink-0 ${statusStyles[e.status] ?? 'bg-sky text-navy'}`}>{e.status}</span>}
    </button>
  );
}

export default function AdminUserProfilePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const router = useRouter();
  const { user: me, isAdmin, isLoading: authLoading } = useAuth();
  const { venues, refreshEvents } = useEvents();
  const [profile, setProfile] = useState<ProfileUser | null>(null);
  const [submitted, setSubmitted] = useState<Listing[]>([]);
  const [saved, setSaved] = useState<Listing[]>([]);
  const [error, setError] = useState('');
  const [kind, setKind] = useState<'events' | 'specials'>('events');
  const [openEvent, setOpenEvent] = useState<Event | null>(null);
  const [busy, setBusy] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [toast, setToast] = useState<{ isVisible: boolean; message: string; type: ToastType }>({ isVisible: false, message: '', type: 'success' });
  const showToast = (message: string, type: ToastType = 'success') => setToast({ isVisible: true, message, type });

  const load = useCallback(async () => {
    const res = await fetch(`/api/admin/users/${id}`, { cache: 'no-store' });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      setError(data.error || 'Account not found');
      return;
    }
    setProfile(data.user);
    setSubmitted(data.submitted || []);
    setSaved(data.saved || []);
  }, [id]);

  useEffect(() => {
    if (!authLoading && !isAdmin) router.push('/login');
  }, [authLoading, isAdmin, router]);

  useEffect(() => {
    if (isAdmin) load();
  }, [isAdmin, load]);

  const submittedRows = useMemo(
    () =>
      groupSeries(submitted.filter((e) => (kind === 'specials') === e.categories.includes('food-deal'))).sort((a, b) =>
        (b.createdAt || '').localeCompare(a.createdAt || '')
      ),
    [submitted, kind]
  );
  const counts = useMemo(() => {
    const rows = groupSeries(submitted);
    return {
      events: rows.filter((e) => !e.categories.includes('food-deal')).length,
      specials: rows.filter((e) => e.categories.includes('food-deal')).length,
      pending: rows.filter((e) => e.status === 'pending').length,
      approved: rows.filter((e) => e.status === 'approved').length,
      rejected: rows.filter((e) => e.status === 'rejected').length,
    };
  }, [submitted]);
  const today = format(new Date(), 'yyyy-MM-dd');
  const upcomingSaved = saved.filter((e) => e.date >= today).sort((a, b) => a.date.localeCompare(b.date));
  const pastSaved = saved.filter((e) => e.date < today).sort((a, b) => b.date.localeCompare(a.date));

  if (authLoading || (!profile && !error)) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <Loader2 size={32} className="animate-spin text-navy" />
      </div>
    );
  }
  if (!isAdmin) return null;
  if (!profile) {
    return (
      <div className="page-container py-24">
        <Link href="/admin?tab=organizers" className="inline-flex items-center gap-2 text-[13px] font-medium text-navy hover:underline">
          <ArrowLeft size={16} /> Admin
        </Link>
        <p className="mt-10 text-[18px] text-ink-muted">{error}</p>
      </div>
    );
  }

  const status = accountStatus(profile);
  const app = profile.application;

  const setVerified = async (verified: boolean) => {
    setBusy(true);
    try {
      const res = await fetch('/api/admin/organizers', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: profile.id, verified }),
      });
      if (!res.ok) throw new Error();
      showToast(verified ? `${profile.name} is now a Verified Organizer` : `${profile.name} is no longer verified`);
      await load();
    } catch {
      showToast('Failed to update verification', 'error');
    } finally {
      setBusy(false);
    }
  };

  const deleteAccount = async () => {
    setBusy(true);
    try {
      const res = await fetch(`/api/admin/organizers?userId=${encodeURIComponent(profile.id)}`, { method: 'DELETE' });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || 'Failed to delete account');
      router.push('/admin?tab=organizers');
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Failed to delete account', 'error');
      setBusy(false);
      setConfirmDelete(false);
    }
  };

  return (
    <div>
      <div className="bg-sun">
        <div className="page-container flex items-center gap-2 py-2.5 text-[12px] font-bold uppercase tracking-[0.12em] text-navy">
          <Shield size={14} /> Admin view profile — only admins can see this page
        </div>
      </div>

      <div className="page-container pb-24 pt-8">
        <button onClick={() => router.back()} className="inline-flex items-center gap-2 text-[13px] font-medium text-navy hover:underline">
          <ArrowLeft size={16} /> Back
        </button>

        <div className="mt-6 flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <div className="flex flex-wrap gap-2">
              <span className="tag bg-sky text-navy">{roleLabel(profile.role)}</span>
              <span className={`tag ${status.cls}`}>{status.label}</span>
            </div>
            <h1 className="display-section mt-4">{profile.name}</h1>
            <p className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1 text-[14px] text-ink-muted">
              <a href={`mailto:${profile.email}`} className="flex items-center gap-1.5 font-medium text-link hover:underline">
                <Mail size={14} /> {profile.email}
              </a>
              <span>Joined {format(new Date(profile.createdAt), 'MMM d, yyyy')}</span>
              {profile.lastSignInAt && <span>Last signed in {format(new Date(profile.lastSignInAt), 'MMM d, yyyy')}</span>}
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            {profile.role === 'organizer' && (
              <label className="flex items-center gap-2 text-[13px] font-bold text-navy">
                <button
                  type="button"
                  className="switch"
                  data-on={profile.isVerifiedOrganizer}
                  disabled={busy}
                  onClick={() => setVerified(!profile.isVerifiedOrganizer)}
                  aria-pressed={profile.isVerifiedOrganizer}
                >
                  <span />
                </button>
                Verified Organizer
              </label>
            )}
            {profile.id !== me?.id && (
              <button className="btn border-[1.5px] border-danger font-medium text-danger hover:bg-danger hover:text-white" onClick={() => setConfirmDelete(true)}>
                <Trash2 size={15} /> Delete account
              </button>
            )}
          </div>
        </div>

        <div className="mt-8 grid grid-cols-2 gap-3 sm:grid-cols-5">
          {(
            [
              ['Events submitted', counts.events],
              ['Specials submitted', counts.specials],
              ['Waiting for review', counts.pending],
              ['Rejected', counts.rejected],
              ['Saved', saved.length],
            ] as [string, number][]
          ).map(([label, value]) => (
            <div key={label} className="card p-4">
              <p className="text-[30px] font-bold leading-none text-navy">{value}</p>
              <p className="mt-2 text-[11px] font-bold uppercase tracking-[0.1em] text-ink-muted">{label}</p>
            </div>
          ))}
        </div>

        <div className="mt-10 grid grid-cols-1 gap-10 lg:grid-cols-[1fr_400px]">
          <div className="flex min-w-0 flex-col gap-10">
            <section>
              <div className="flex flex-wrap items-center justify-between gap-3 border-b-[1.5px] border-navy pb-2.5">
                <h2 className="text-[22px] font-bold text-navy">Submitted</h2>
                <div className="segmented">
                  <button className="segmented-item h-8" data-active={kind === 'events'} onClick={() => setKind('events')}>
                    Events · {counts.events}
                  </button>
                  <button className="segmented-item h-8" data-active={kind === 'specials'} onClick={() => setKind('specials')}>
                    Specials · {counts.specials}
                  </button>
                </div>
              </div>
              {submittedRows.length === 0 ? (
                <p className="py-8 text-[14px] text-ink-muted">No {kind} submitted.</p>
              ) : (
                submittedRows.map((e) => <ListingRow key={e.seriesId || e.id} e={e} onOpen={() => setOpenEvent(e)} />)
              )}
            </section>

            <section>
              <div className="flex items-center justify-between border-b-[1.5px] border-navy pb-2.5">
                <h2 className="flex items-center gap-2 text-[22px] font-bold text-navy">
                  <Bookmark size={18} /> Saved
                </h2>
                <span className="text-[12px] text-ink-muted">{upcomingSaved.length} upcoming · {pastSaved.length} past</span>
              </div>
              {saved.length === 0 ? (
                <p className="py-8 text-[14px] text-ink-muted">Nothing saved.</p>
              ) : (
                [...upcomingSaved, ...pastSaved].map((e) => <ListingRow key={e.id} e={e} savedAt={e.savedAt} onOpen={() => setOpenEvent(e)} />)
              )}
            </section>
          </div>

          <aside className="flex flex-col gap-6">
            <div className="card px-5 py-2">
              <p className="eyebrow-sm pt-3">Account</p>
              <Row label="Account role">{roleLabel(profile.role)}</Row>
              <Row label="Email verified">{profile.emailConfirmed ? <Check size={15} className="inline text-success" /> : <X size={15} className="inline text-danger" />}</Row>
              <Row label="Agreed to terms">{profile.agreedToTermsAt ? format(new Date(profile.agreedToTermsAt), 'MMM d, yyyy') : '—'}</Row>
              {profile.role === 'organizer' && (
                <>
                  <Row label="Organizer account">{profile.organizerApproved ? 'Approved' : profile.applicationDeclined ? 'Declined' : 'In review'}</Row>
                  {profile.verificationRequestedAt && <Row label="Requested verification">{format(new Date(profile.verificationRequestedAt), 'MMM d, yyyy')}</Row>}
                  {profile.verifiedAt && <Row label="Verified">{format(new Date(profile.verifiedAt), 'MMM d, yyyy')}</Row>}
                  <Row label="Unread venue updates">{profile.pendingVenueNotices}</Row>
                </>
              )}
            </div>

            <div className="card px-5 py-2">
              <p className="eyebrow-sm pt-3">Email preferences</p>
              {profile.emailPreferences.length === 0 ? (
                <p className="py-3 text-[13px] text-ink-muted">No email options.</p>
              ) : (
                profile.emailPreferences.map((p) => (
                  <Row key={p.key} label={p.label}>
                    {p.on ? 'Opted in' : 'Opted out'}
                  </Row>
                ))
              )}
            </div>

            {(profile.venues.length > 0 || app) && (
              <div className="card p-5">
                <p className="eyebrow-sm">Venues</p>
                <div className="mt-3 flex flex-col gap-4 text-[13px] text-navy">
                  {profile.venues.map((v) => (
                    <Link key={v.id} href={`/admin/venues/${v.id}`} className="group">
                      <span className="block text-[15px] font-bold text-link group-hover:underline">{v.name}</span>
                      <span className="text-ink-muted">{v.address}</span>
                    </Link>
                  ))}
                  {app?.venues
                    .filter((v) => !v.claimedVenueId || !profile.venues.some((pv) => pv.id === v.claimedVenueId))
                    .map((v, i) => (
                      <div key={i} className="flex flex-col gap-0.5">
                        <p className="font-bold">
                          {v.name} <span className="font-normal text-ink-muted">({v.claimedVenueId ? 'claimed on sign-up' : 'new on sign-up'})</span>
                        </p>
                        {v.venueTypes.length > 0 && <p>{v.venueTypes.join(' · ')}</p>}
                        {v.address && <p className="text-ink-muted">{v.address}</p>}
                        {v.website && <p>Website: {v.website}</p>}
                        {v.instagram && <p>Instagram: @{v.instagram.replace(/^@/, '')}</p>}
                        {v.about && <p className="text-ink-muted">{v.about}</p>}
                      </div>
                    ))}
                </div>
              </div>
            )}

            {app && (
              <div className="card px-5 py-2">
                <p className="eyebrow-sm pt-3">Organizer sign-up</p>
                <Row label="Applied">{app.submittedAt ? format(new Date(app.submittedAt), 'MMM d, yyyy') : '—'}</Row>
                {app.role && <Row label="Role at venue">{app.role}</Row>}
                {app.phone && <Row label="Phone">{app.phone}</Row>}
                <Row label="Confirm by">
                  {app.confirmMethod === 'document' ? (
                    app.documentUrl ? (
                      <a href={app.documentUrl} target="_blank" rel="noopener noreferrer" className="text-link hover:underline">
                        View document
                      </a>
                    ) : (
                      'Document'
                    )
                  ) : (
                    'Work email'
                  )}
                </Row>
                {app.accessibility.length > 0 && <Row label="Accessibility">{app.accessibility.join(', ')}</Row>}
                {app.notes && <p className="whitespace-pre-line border-t border-line py-3 text-[13px] text-navy">Notes: {app.notes}</p>}
              </div>
            )}
          </aside>
        </div>
      </div>

      {openEvent && (
        <ListingModal
          event={openEvent}
          venues={venues}
          onClose={() => setOpenEvent(null)}
          onMessage={showToast}
          onChanged={async () => {
            await load();
            refreshEvents();
          }}
        />
      )}

      {confirmDelete && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-navy/50 p-4" onClick={() => !busy && setConfirmDelete(false)}>
          <div className="w-full max-w-md rounded-[22px] bg-white p-6" onClick={(e) => e.stopPropagation()}>
            <p className="text-[20px] font-bold text-navy">Delete {profile.name}&rsquo;s account?</p>
            <p className="mt-2 text-[14px] text-ink-muted">
              This permanently deletes the account ({profile.email}), every event and special they submitted, and their saved listings. Venues stay.
              This can&rsquo;t be undone.
            </p>
            <div className="mt-6 flex justify-end gap-2">
              <button className="btn-ghost" onClick={() => setConfirmDelete(false)} disabled={busy}>
                Keep account
              </button>
              <button className="btn bg-danger font-bold text-white" onClick={deleteAccount} disabled={busy}>
                {busy && <Loader2 size={14} className="animate-spin" />} Delete account
              </button>
            </div>
          </div>
        </div>
      )}

      <Toast isOpen={toast.isVisible} message={toast.message} type={toast.type} onClose={() => setToast((t) => ({ ...t, isVisible: false }))} />
    </div>
  );
}
