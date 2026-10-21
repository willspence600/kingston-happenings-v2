'use client';

import { Suspense, useCallback, useEffect, useMemo, useState } from 'react';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { Loader2 } from 'lucide-react';
import type { Event } from '@/types/event';
import { useAuth } from '@/contexts/AuthContext';
import { useEvents } from '@/contexts/EventsContext';
import { Toast } from '@/components';
import ReviewQueueTab, { groupPending } from '@/components/admin/ReviewQueueTab';
import PublishedTab from '@/components/admin/PublishedTab';
import VenuesTab, { type VenueUpdate } from '@/components/admin/VenuesTab';
import PromotionsTab from '@/components/admin/PromotionsTab';
import OrganizersTab from '@/components/admin/OrganizersTab';
import SiteTab from '@/components/admin/SiteTab';
import UsersTab from '@/components/admin/UsersTab';
import type { AdminEventGoer } from '@/app/api/admin/users/route';
import type { AdminOrganizer, AdminTab, AdminVenue, AdminVenueRequest, OrganizerApplicationItem, ToastType } from '@/components/admin/types';

const TABS: { id: AdminTab; label: string }[] = [
  { id: 'review', label: 'Review queue' },
  { id: 'published', label: 'Published' },
  { id: 'venues', label: 'Venues' },
  { id: 'promotions', label: 'Promotions' },
  { id: 'organizers', label: 'Organizers' },
  { id: 'users', label: 'Users' },
  { id: 'site', label: 'Site & emails' },
];

function AdminDashboard() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const { user, isAdmin, isLoading: authLoading } = useAuth();
  const { pendingEvents, refreshPendingEvents, refreshEvents, refreshVenues } = useEvents();

  const tabParam = searchParams.get('tab') as AdminTab | null;
  const tab: AdminTab = TABS.some((t) => t.id === tabParam) ? tabParam! : 'review';
  const setTab = (id: AdminTab) => router.replace(`${pathname}?tab=${id}`, { scroll: false });

  const [venues, setVenues] = useState<AdminVenue[]>([]);
  const [listings, setListings] = useState<Event[]>([]);
  const [loadingListings, setLoadingListings] = useState(true);
  const [organizers, setOrganizers] = useState<AdminOrganizer[]>([]);
  const [loadingOrganizers, setLoadingOrganizers] = useState(true);
  const [applications, setApplications] = useState<OrganizerApplicationItem[]>([]);
  const [venueRequests, setVenueRequests] = useState<AdminVenueRequest[]>([]);
  const [eventGoers, setEventGoers] = useState<AdminEventGoer[] | null>(null);
  const [toast, setToast] = useState<{ isVisible: boolean; message: string; type: ToastType }>({ isVisible: false, message: '', type: 'success' });

  const showToast = useCallback((message: string, type: ToastType = 'success') => setToast({ isVisible: true, message, type }), []);

  // Admin data skips the public CDN cache so edits show up right away
  const loadVenues = useCallback(async () => {
    try {
      const res = await fetch(`/api/venues?status=all&limit=500&t=${Date.now()}`, { cache: 'no-store' });
      if (res.ok) setVenues((await res.json()).venues || []);
    } catch (error) {
      console.error('Failed to load venues:', error);
    }
  }, []);

  const loadListings = useCallback(async () => {
    try {
      const res = await fetch('/api/events?status=all&limit=1000', { cache: 'no-store' });
      if (res.ok) setListings((await res.json()).events || []);
    } catch (error) {
      console.error('Failed to load listings:', error);
    } finally {
      setLoadingListings(false);
    }
  }, []);

  const loadOrganizers = useCallback(async () => {
    try {
      const [orgRes, appRes, venueReqRes] = await Promise.all([
        fetch('/api/admin/organizers'),
        fetch('/api/admin/organizer-applications'),
        fetch('/api/admin/venue-requests'),
      ]);
      if (orgRes.ok) setOrganizers((await orgRes.json()).organizers || []);
      if (appRes.ok) setApplications((await appRes.json()).applications || []);
      if (venueReqRes.ok) setVenueRequests((await venueReqRes.json()).requests || []);
    } catch (error) {
      console.error('Failed to load organizers:', error);
    } finally {
      setLoadingOrganizers(false);
    }
  }, []);

  const loadEventGoers = useCallback(async () => {
    try {
      const res = await fetch('/api/admin/users', { cache: 'no-store' });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || 'Failed to load users');
      setEventGoers(data.users || []);
    } catch (error) {
      console.error('Failed to load users:', error);
      setEventGoers([]);
      showToast(error instanceof Error ? error.message : 'Failed to load users', 'error');
    }
  }, [showToast]);

  // Event-goers are only loaded once the Users tab is opened
  useEffect(() => {
    if (isAdmin && tab === 'users' && eventGoers === null) loadEventGoers();
  }, [isAdmin, tab, eventGoers, loadEventGoers]);

  useEffect(() => {
    if (!authLoading && !isAdmin) router.push('/login');
  }, [isAdmin, authLoading, router]);

  useEffect(() => {
    if (!isAdmin) return;
    refreshPendingEvents();
    loadVenues();
    loadListings();
    loadOrganizers();
  }, [isAdmin, refreshPendingEvents, loadVenues, loadListings, loadOrganizers]);

  const onListingsChanged = useCallback(async () => {
    await Promise.all([refreshPendingEvents(), loadListings(), loadVenues()]);
    refreshEvents();
    refreshVenues();
  }, [refreshPendingEvents, loadListings, loadVenues, refreshEvents, refreshVenues]);

  const onUpdateVenue = useCallback(
    async (venue: AdminVenue, update: VenueUpdate, success?: string) => {
      try {
        const res = await fetch(`/api/venues/${venue.id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(update),
        });
        const data = await res.json().catch(() => ({}));
        if (!res.ok) throw new Error(data.error || 'Failed to update venue');
        setVenues((list) => list.map((v) => (v.id === venue.id ? { ...v, ...update } : v)));
        if (success) showToast(success, 'success');
        refreshVenues();
        refreshEvents();
        return true;
      } catch (err) {
        showToast(err instanceof Error ? err.message : 'Failed to update venue', 'error');
        return false;
      }
    },
    [showToast, refreshVenues, refreshEvents]
  );

  const onDeleteVenue = useCallback(
    async (venue: AdminVenue) => {
      const res = await fetch(`/api/venues/${venue.id}`, { method: 'DELETE' });
      if (res.ok) {
        showToast(`${venue.name} deleted`, 'success');
        await onListingsChanged();
      } else {
        showToast('Failed to delete venue', 'error');
      }
    },
    [showToast, onListingsChanged]
  );

  const onRejectVenue = useCallback(
    async (venue: AdminVenue) => {
      if (!window.confirm(`Reject ${venue.name}? The venue and its listings will be deleted.`)) return;
      const res = await fetch(`/api/venues/${venue.id}/reject`, { method: 'POST' });
      if (res.ok) {
        showToast(`${venue.name} rejected`, 'info');
        await onListingsChanged();
      } else {
        showToast('Failed to reject venue', 'error');
      }
    },
    [showToast, onListingsChanged]
  );

  const onToggleVerified = useCallback(
    async (organizer: AdminOrganizer, verified: boolean) => {
      try {
        const res = await fetch('/api/admin/organizers', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ userId: organizer.id, verified }),
        });
        if (!res.ok) throw new Error();
        setOrganizers((list) =>
          list.map((o) =>
            o.id === organizer.id
              ? { ...o, isVerifiedOrganizer: verified, verificationRequestedAt: null, organizerApproved: verified || o.organizerApproved }
              : o
          )
        );
        showToast(verified ? `${organizer.name} is now a Verified Organizer` : `${organizer.name} is no longer verified`, 'success');
      } catch {
        showToast('Failed to update organizer', 'error');
      }
    },
    [showToast]
  );

  const reviewCount = useMemo(
    () =>
      groupPending(pendingEvents).length +
      organizers.filter((o) => o.verificationRequestedAt && !o.isVerifiedOrganizer).length +
      applications.length +
      venueRequests.length,
    [pendingEvents, organizers, applications, venueRequests]
  );
  const pendingVenueCount = venues.filter((v) => v.status === 'pending').length;
  const counts: Partial<Record<AdminTab, number>> = { review: reviewCount, venues: pendingVenueCount };

  if (authLoading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <Loader2 size={32} className="animate-spin text-navy" />
      </div>
    );
  }
  if (!isAdmin) return null;

  return (
    <div className="page-container pb-24 pt-10">
      <p className="eyebrow mb-3.5">— Admin</p>
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <h1 className="display-section">Dashboard</h1>
        <p className="text-[12px] text-ink-muted sm:pb-2">Signed in as {user?.name}</p>
      </div>

      <div className="-mx-4 mt-8 overflow-x-auto px-4 no-scrollbar sm:mx-0 sm:px-0">
        <div className="segmented">
          {TABS.map(({ id, label }) => {
            const count = counts[id] ?? 0;
            return (
              <button key={id} className="segmented-item h-10 gap-2 px-4" data-active={tab === id} onClick={() => setTab(id)}>
                {label}
                {count > 0 && (
                  <span className={`rounded-full px-1.5 py-0.5 text-[10px] font-bold leading-none ${tab === id ? 'bg-sun text-navy' : 'bg-white text-navy'}`}>
                    {count}
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </div>

      <div className="mt-8">
        {tab === 'review' && (
          <ReviewQueueTab
            pendingEvents={pendingEvents}
            venues={venues}
            organizers={organizers}
            applications={applications}
            venueRequests={venueRequests}
            showToast={showToast}
            onListingsChanged={onListingsChanged}
            onOrganizersChanged={async () => {
              await Promise.all([loadOrganizers(), loadVenues()]);
              refreshVenues();
            }}
            onToggleVerified={onToggleVerified}
          />
        )}
        {tab === 'published' && (
          <PublishedTab listings={listings} venues={venues} loading={loadingListings} showToast={showToast} onChanged={onListingsChanged} />
        )}
        {tab === 'venues' && (
          <VenuesTab
            venues={venues}
            listings={listings}
            showToast={showToast}
            onUpdateVenue={onUpdateVenue}
            onDeleteVenue={onDeleteVenue}
            onRejectVenue={onRejectVenue}
          />
        )}
        {tab === 'promotions' && (
          <PromotionsTab venues={venues} listings={listings} showToast={showToast} onUpdateVenue={onUpdateVenue} onListingsChanged={onListingsChanged} />
        )}
        {tab === 'organizers' && (
          <OrganizersTab
            organizers={organizers}
            loading={loadingOrganizers}
            showToast={showToast}
            onToggleVerified={onToggleVerified}
            onChanged={loadOrganizers}
          />
        )}
        {tab === 'users' && <UsersTab users={eventGoers ?? []} loading={eventGoers === null} />}
        {tab === 'site' && <SiteTab showToast={showToast} />}
      </div>

      <Toast isOpen={toast.isVisible} message={toast.message} type={toast.type} onClose={() => setToast((t) => ({ ...t, isVisible: false }))} />
    </div>
  );
}

export default function AdminPage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-[60vh] items-center justify-center">
          <Loader2 size={32} className="animate-spin text-navy" />
        </div>
      }
    >
      <AdminDashboard />
    </Suspense>
  );
}
