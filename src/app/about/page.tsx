import Link from 'next/link';
import { Bell, Bookmark, Calendar, Heart, Mail, MapPin, Send, Users } from 'lucide-react';
import { Rings } from '@/components/brand';
import prisma from '@/lib/prisma';

const CONTACT_EMAIL = 'kingstonhappenings.ca@gmail.com';

// Counts are refreshed every 5 minutes
export const revalidate = 300;

async function getStats() {
  try {
    const [events, venues] = await Promise.all([
      // Every event ever listed; each date of a recurring event counts once
      prisma.event.count({
        where: { status: { in: ['approved', 'cancelled'] }, NOT: { categories: { some: { name: 'food-deal' } } } },
      }),
      // Same set as the Venues page
      prisma.venue.count({ where: { status: 'approved' } }),
    ]);
    return { events: events.toLocaleString('en-CA'), venues: venues.toLocaleString('en-CA') };
  } catch (error) {
    console.error('[About] Failed to load stats:', error);
    return { events: '—', venues: '—' };
  }
}

export default async function AboutPage() {
  const stats = await getStats();
  return (
    <div>
      {/* Hero */}
      <section className="relative overflow-hidden bg-navy text-white">
        <div className="page-container relative flex min-h-[440px] items-center py-16">
          <div className="relative z-10">
            <p className="eyebrow !text-sun">— About us</p>
            <h1 className="display-hero !text-white mt-4">
              About
              <br />
              Kingston
              <br />
              Happenings
            </h1>
            <p className="mt-5 text-[16px] text-on-dark-muted">made and grown by Queen&rsquo;s Alumni</p>
          </div>
          <Rings className="pointer-events-none absolute right-4 top-1/2 hidden w-[400px] -translate-y-1/2 md:block lg:right-20" />
        </div>
      </section>

      {/* Story */}
      <section className="page-container py-20">
        <div className="grid grid-cols-1 gap-12 lg:grid-cols-2 lg:items-center">
          <div>
            <p className="eyebrow-sm">— Our story</p>
            <h2 className="display-md mt-3">
              Connecting Kingston
              <br />
              through events
            </h2>
            <div className="mt-5 flex max-w-[520px] flex-col gap-4 text-[16px] leading-[1.55] text-navy">
              <p>
                What makes a city your home? We made Kingston Happenings to get people out and about, experiencing activities
                outside your radar, inside your city.
              </p>
              <p>This is the place to find local gems and broaden your community.</p>
              <p>
                Our mission is to support Kingston&rsquo;s venues, restaurants and artists by helping them reach the people who
                want to be there.
              </p>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            {[
              { icon: <Calendar size={18} />, value: stats.events, label: 'Events listed', tone: 'bg-sun text-navy' },
              { icon: <MapPin size={18} />, value: stats.venues, label: 'Local venues', tone: 'card text-navy' },
              { icon: <Users size={18} />, value: 'X', label: 'Monthly visitors', tone: 'card text-navy' },
              { icon: <Heart size={18} className="text-sun" />, value: '100%', label: 'Community driven', tone: 'bg-navy text-white' },
            ].map((s) => (
              <div key={s.label} className={`flex min-h-[150px] flex-col justify-between rounded-[22px] p-5 ${s.tone}`}>
                {s.icon}
                <div>
                  <p className="text-[36px] font-bold leading-none tracking-[-0.03em]">{s.value}</p>
                  <p className="mt-2 text-[11px] font-bold uppercase tracking-[0.12em] opacity-80">{s.label}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Why */}
      <section className="bg-sky py-20">
        <div className="page-container">
          <p className="eyebrow-sm">— Why use it</p>
          <h2 className="display-section mt-4">Made for you</h2>
          <div className="mt-10 grid grid-cols-1 gap-4 md:grid-cols-3">
            {[
              { icon: <Bookmark size={16} />, title: 'Save your favourites', body: 'Keep a personal list of events and specials in My Events.' },
              { icon: <Bell size={16} />, title: 'Get reminders', body: 'Get notified about the events you pick so you never forget.' },
              { icon: <Send size={16} />, title: 'Easy submissions', body: 'Venues and organizers can post events and specials in minutes.' },
            ].map((f) => (
              <div key={f.title} className="rounded-[22px] bg-white p-6">
                <span className="flex h-9 w-9 items-center justify-center rounded-full bg-sun text-navy">{f.icon}</span>
                <p className="mt-5 text-[18px] font-bold text-navy">{f.title}</p>
                <p className="mt-2 text-[14px] leading-[1.5] text-ink-muted">{f.body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="bg-sun py-16">
        <div className="page-container flex flex-col gap-8 md:flex-row md:items-center md:justify-between">
          <div>
            <h2 className="display-md">
              Have an event
              <br />
              to share?
            </h2>
            <p className="mt-4 text-[15px] text-navy">Venues, restaurants and organizers — we&rsquo;d love to help you reach Kingston.</p>
          </div>
          <div className="flex flex-col items-start gap-3 md:items-end">
            <Link href="/submit" className="btn-navy">
              Submit your event →
            </Link>
            <a href={`mailto:${CONTACT_EMAIL}`} className="flex items-center gap-1.5 text-[13px] font-medium text-navy hover:underline">
              <Mail size={14} />
              {CONTACT_EMAIL}
            </a>
          </div>
        </div>
      </section>
    </div>
  );
}
