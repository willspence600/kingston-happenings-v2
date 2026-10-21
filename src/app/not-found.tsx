'use client';

import Link from 'next/link';
import { format } from 'date-fns';
import { useEvents } from '@/contexts/EventsContext';
import { CategoryTag, formatTime, isAllDayEvent, primaryCategory } from '@/components/brand';

export default function NotFound() {
  const { getTodaysEvents } = useEvents();
  const nowTime = format(new Date(), 'HH:mm');
  const tonight = getTodaysEvents()
    .filter((e) => !e.categories.includes('food-deal'))
    .filter((e) => isAllDayEvent(e) || e.startTime >= nowTime || (e.endTime ?? '') > nowTime)
    .sort((a, b) => a.startTime.localeCompare(b.startTime))
    .slice(0, 3);

  return (
    <div className="page-container grid grid-cols-1 gap-12 py-16 lg:grid-cols-[1fr_340px] lg:items-center lg:gap-20">
      <div>
        <p className="eyebrow">— Error 404</p>
        <p
          className="mt-2 font-bold leading-[0.9] tracking-[-0.05em] text-navy"
          style={{ fontSize: 'clamp(7rem, 18vw, 240px)' }}
        >
          404<span className="text-coral">.</span>
        </p>
        <h1 className="mt-4 text-[32px] font-bold tracking-[-0.02em] text-navy sm:text-[36px]">This page has left the party.</h1>
        <p className="mt-4 max-w-[440px] text-[17px] leading-[1.5] text-ink-muted">
          The link might be old, or the event already wrapped up. Let&rsquo;s get you back to what&rsquo;s on in Kingston.
        </p>
        <div className="mt-8 flex flex-wrap gap-3">
          <Link href="/" className="btn-sun">
            See what&rsquo;s on today
          </Link>
          <Link href="/events" className="btn-outline">
            Browse everything
          </Link>
        </div>
      </div>

      {tonight.length > 0 && (
        <div className="card p-6">
          <div className="flex items-baseline justify-between">
            <p className="text-[20px] font-bold text-navy">Happening tonight</p>
            <span className="text-[12px] text-ink-muted">{format(new Date(), 'EEE, MMM d')}</span>
          </div>
          <div className="mt-3 border-t border-line">
            {tonight.map((e) => {
              const cat = primaryCategory(e);
              return (
                <Link key={e.id} href={`/events/${e.id}`} className="group flex items-start gap-4 border-b border-line py-3.5">
                  <span className="w-[60px] shrink-0 text-[13px] text-navy">
                    {isAllDayEvent(e) ? 'All day' : formatTime(e.startTime)}
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-[14px] font-bold text-navy group-hover:underline">{e.title}</span>
                    <span className="block truncate text-[12px] text-ink-muted">
                      {e.venue?.name}
                      {e.venue?.neighborhood ? ` · ${e.venue.neighborhood}` : ''}
                    </span>
                  </span>
                  {cat && <CategoryTag category={cat} className="!text-[10px]" />}
                </Link>
              );
            })}
          </div>
          <Link href="/events" className="link-arrow mt-4">
            See all tonight →
          </Link>
        </div>
      )}
    </div>
  );
}
