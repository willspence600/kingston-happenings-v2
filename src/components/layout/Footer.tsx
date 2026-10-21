'use client';

import { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';

const CONTACT_EMAIL = 'kingstonhappenings.ca@gmail.com';

const footerLinks = [
  { href: '/', label: 'Today' },
  { href: '/events', label: 'Browse' },
  { href: '/coming-up', label: 'Coming up' },
  { href: '/venues', label: 'Venues' },
  { href: '/submit', label: 'Submit an event' },
  { href: '/about', label: 'About' },
];

export default function Footer() {
  const pathname = usePathname();
  const [email, setEmail] = useState('');
  const [subscribeState, setSubscribeState] = useState<'idle' | 'sending' | 'done' | 'error'>('idle');
  const [subscribeError, setSubscribeError] = useState('');
  const currentYear = new Date().getFullYear();

  // Auth screens are full-bleed split layouts without the footer
  if (pathname === '/login' || pathname === '/register') return null;

  const handleSubscribe = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim()) return;
    setSubscribeState('sending');
    setSubscribeError('');
    try {
      const res = await fetch('/api/newsletter', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: email.trim() }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || 'Could not subscribe. Please try again.');
      setSubscribeState('done');
      setEmail('');
    } catch (err) {
      setSubscribeState('error');
      setSubscribeError(err instanceof Error ? err.message : 'Could not subscribe. Please try again.');
    }
  };

  return (
    <footer className="mt-auto bg-navy text-white">
      <div className="mx-auto flex max-w-[1440px] flex-col gap-14 px-4 pb-8 pt-24 sm:px-8 lg:px-20">
        <h2 className="display-section !text-white">
          Never miss
          <br />
          what&rsquo;s on<span className="text-coral">.</span>
        </h2>

        <div className="flex flex-col gap-12 md:flex-row md:items-start md:justify-between">
          <div className="flex flex-col gap-5">
            <p className="max-w-[360px] text-[16px] leading-[1.5] text-on-dark-muted">
              Subscribe to always keep up to date with Kingston&rsquo;s Happenings!
            </p>
            <form
              onSubmit={handleSubscribe}
              className="flex w-full max-w-[440px] items-center gap-2 rounded-full border border-white p-1.5"
            >
              <label htmlFor="footer-email" className="sr-only">
                Your email
              </label>
              <input
                id="footer-email"
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="Your email"
                className="h-11 min-w-0 flex-1 bg-transparent pl-4 text-[16px] text-white placeholder:text-on-dark-muted outline-none"
              />
              <button type="submit" className="btn-sun px-[22px]" disabled={subscribeState === 'sending'}>
                {subscribeState === 'sending' ? 'Subscribing…' : 'Subscribe'}
              </button>
            </form>
            {subscribeState === 'done' && <p className="text-[14px] font-medium text-sun">You&rsquo;re subscribed — thanks!</p>}
            {subscribeState === 'error' && <p className="text-[14px] text-coral">{subscribeError}</p>}
            <a
              href={`mailto:${CONTACT_EMAIL}?subject=${encodeURIComponent('Website issue / suggestion')}`}
              className="mt-2 inline-flex w-fit items-center gap-2 rounded-full border border-white/40 px-4 py-2.5 text-[13px] text-white transition-colors hover:border-sun hover:text-sun"
            >
              Issues with the website or suggestions? Contact {CONTACT_EMAIL}
            </a>
          </div>

          <ul className="flex flex-col gap-[18px] md:items-end">
            {footerLinks.map((link) => (
              <li key={link.href}>
                <Link
                  href={link.href}
                  className="text-[12px] uppercase tracking-[0.1em] text-white hover:text-sun transition-colors"
                >
                  {link.label}
                </Link>
              </li>
            ))}
          </ul>
        </div>

        <div className="flex flex-col gap-2 border-t border-white pt-6 text-[12px] font-medium uppercase tracking-[0.14em] text-on-dark-muted sm:flex-row sm:justify-between">
          <p>© {currentYear} Kingston Happenings</p>
          <p>Made in Kingston, ON</p>
        </div>
      </div>
    </footer>
  );
}
