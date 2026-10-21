'use client';

import { useEffect, useMemo } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { format, parseISO } from 'date-fns';
import { Bell, Calendar, Loader2, MapPin, Pencil, Repeat, Utensils, X } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { useEvents } from '@/contexts/EventsContext';
import { useOrganizerVerification } from '@/hooks/useOrganizerVerification';
import { useVenueNotices } from '@/hooks/useVenueNotices';
import { formatTime, isAllDayEvent, isDowntown } from '@/components/brand';
import AddVenueRequest from '@/components/venues/AddVenueRequest';
import type { Event } from '@/types/event';

export default function MyVenuePage() {
  const router = useRouter();
  const { user, isLoading: authLoading } = useAuth();
  const { venues, events, isLoading } = useEvents();
  const { organizerVenueIds, organizerApproved, isLoading: orgLoading } = useOrganizerVerification();
  const { notices, dismiss, refresh } = useVenueNotices();

  useEffect(() => {
    if (!authLoading && !user) router.push('/login?redirect=/my-venue');
  }, [authLoading, user, router]);

  // Pick up anything new each time the page opens
  useEffect(() => {
    refresh();
  }, [refresh]);

  const myVenues = useMemo(() => venues.filter((v) => organizerVenueIds.includes(v.id)), [venues, organizerVenueIds]);
  const today = format(new Date(), 'yyyy-MM-dd');

  const upcomingFor = (venueId: string) => {
    const seen = new Set<string>();
    return events
      .filter((e) => e.venue.id === venueId && e.date >= today)
      .sort((a, b) => a.date.localeCompare(b.date) || a.startTime.localeCompare(b.startTime))
      .filter((e) => {
        const key = e.seriesId || e.id;
        if (seen.has(key)) return false;
        seen.add(key);
        return true;
      });
  };

  if (authLoading || orgLoading || isLoading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <Loader2 size={32} className="animate-spin text-navy" />
      </div>
    );
  }

  return (
    <div className="page-container pb-24 pt-10">
      {notices.length > 0 && (
        <div className="mb-10 flex flex-col gap-3">
          {notices.map((n) => (
            <div key={n.id} className="relative rounded-[18px] bg-sun px-5 py-4 pr-12 text-navy">
              <p className="flex items-center gap-2 text-[15px] font-bold">
                <Bell size={15} /> {n.message} · {n.venueName}
              </p>
              {n.changes.length > 0 && (
                <ul className="mt-2 list-disc pl-9 text-[13px]">
                  {n.changes.map((c, i) => (
                    <li key={i}>{c}</li>
                  ))}
                </ul>
              )}
              <p className="mt-2 pl-6 text-[12px] opacity-80">{format(new Date(n.createdAt), 'MMM d, yyyy · h:mm a')}</p>
              <button
                type="button"
                onClick={() => dismiss(n.id)}
                className="absolute right-3 top-3 flex h-8 w-8 items-center justify-center rounded-full hover:bg-white/50"
                aria-label="Dismiss"
              >
                <X size={16} />
              </button>
            </div>
          ))}
          {notices.length > 1 && (
            <button type="button" onClick={() => dismiss()} className="link-arrow self-end">
              Dismiss all
            </button>
          )}
        </div>
      )}

      <p className="eyebrow mb-3.5">— My Venue</p>
      <h1 className="display-section">{myVenues.length === 1 ? myVenues[0].name : 'Your venues'}</h1>

      {myVenues.length === 0 ? (
        <div className="mt-10 rounded-[22px] bg-sky-soft px-6 py-14 text-center">
          <p className="text-[22px] font-bold text-navy">No venue linked yet</p>
          <p className="mt-2 text-[14px] text-ink-muted">Once your organizer account is approved, your venue shows up here.</p>
        </div>
      ) : (
        <div className="mt-10 flex flex-col gap-8">
          {myVenues.map((v) => {
            const upcoming = upcomingFor(v.id);
            return (
              <section key={v.id} className="card p-5 sm:p-7">
                <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                  <div className="flex items-start gap-4">
                    {v.imageUrl && (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={v.imageUrl} alt="" className="h-16 w-16 shrink-0 rounded-[14px] bg-sky-soft object-contain p-1" />
                    )}
                    <div>
                      <p className="text-[24px] font-bold text-navy">{v.name}</p>
                      <p className="mt-1 flex items-center gap-1.5 text-[14px] text-ink-muted">
                        <MapPin size={14} className="text-link" />
                        {v.address}
                      </p>
                      <div className="mt-2 flex flex-wrap gap-1.5">
                        {isDowntown(v) && <span className="tag bg-[#db3247] text-white">Downtown Kingston</span>}
                        {v.isMajor && <span className="tag bg-sky text-navy">Major Venue</span>}
                      </div>
                    </div>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <Link href={`/venues/${v.id}`} className="btn-outline btn-sm">
                      <Pencil size={13} /> View &amp; edit venue page
                    </Link>
                    <Link href="/submit" className="btn-sun btn-sm">
                      + Submit
                    </Link>
                  </div>
                </div>

                <p className="eyebrow-sm mt-8">Upcoming · {upcoming.length}</p>
                <div className="mt-2 border-t border-line">
                  {upcoming.length === 0 ? (
                    <p className="py-4 text-[14px] text-ink-muted">Nothing upcoming yet.</p>
                  ) : (
                    upcoming.slice(0, 12).map((e: Event) => {
                      const special = e.categories.includes('food-deal');
                      return (
                        <Link key={e.id} href={`/events/${e.id}`} className="group flex items-center gap-4 border-b border-line py-3">
                          <span className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-[10px] ${special ? 'bg-[#ffe8d6] text-[#a84a12]' : 'bg-sky text-link-deep'}`}>
                            {special ? <Utensils size={15} /> : <Calendar size={15} />}
                          </span>
                          <span className="min-w-0 flex-1">
                            <span className="block truncate text-[15px] font-bold text-navy group-hover:underline">{e.title}</span>
                            <span className="flex items-center gap-1 text-[12px] text-ink-muted">
                              {e.isRecurring && <Repeat size={11} />}
                              {format(parseISO(e.date), 'EEE, MMM d')} · {isAllDayEvent(e) ? 'All day' : formatTime(e.startTime)}
                            </span>
                          </span>
                        </Link>
                      );
                    })
                  )}
                </div>
              </section>
            );
          })}
        </div>
      )}

      {user?.role === 'organizer' && organizerApproved && (
        <div className="mt-8">
          <AddVenueRequest venues={venues} linkedVenueIds={organizerVenueIds} />
        </div>
      )}
    </div>
  );
}
