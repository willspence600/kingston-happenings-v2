'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useState, useMemo } from 'react';
import { Menu, X, User, LogOut, Shield } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuth } from '@/contexts/AuthContext';
import { useEvents } from '@/contexts/EventsContext';
import { Wordmark } from '@/components/brand';
import { useOrganizerVerification } from '@/hooks/useOrganizerVerification';
import { useVenueNotices } from '@/hooks/useVenueNotices';

const navLinks = [
  { href: '/', label: 'Today' },
  { href: '/events', label: 'Browse' },
  { href: '/coming-up', label: 'Coming up' },
  { href: '/venues', label: 'Venues' },
  { href: '/my-events', label: 'My Events' },
];

function isActivePath(pathname: string, href: string) {
  if (href === '/') return pathname === '/';
  return pathname === href || pathname.startsWith(`${href}/`);
}

export default function Navigation() {
  const pathname = usePathname();
  const router = useRouter();
  const { user, logout, isAdmin, isLoading: authLoading } = useAuth();
  const { pendingEvents } = useEvents();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const { organizerApproved, organizerVenueIds } = useOrganizerVerification();
  const { notices } = useVenueNotices();
  // Approved organizers linked to a venue get a My Venue tab (with a badge for admin changes)
  const showMyVenue = user?.role === 'organizer' && organizerApproved && organizerVenueIds.length > 0;
  const links = showMyVenue ? [...navLinks, { href: '/my-venue', label: 'My Venue' }] : navLinks;
  const noticeBadge = (href: string) =>
    href === '/my-venue' && notices.length > 0 ? (
      <span className="ml-0.5 rounded-full bg-coral px-1.5 py-0.5 text-[10px] font-bold leading-none text-white" aria-label={`${notices.length} venue updates`}>
        {notices.length}
      </span>
    ) : null;

  const pendingCount = useMemo(() => {
    // Count unique series (or standalone events) — one badge per series, not per occurrence
    const seen = new Set<string>();
    let count = 0;
    for (const event of pendingEvents) {
      const key = event.seriesId || event.id;
      if (!seen.has(key)) {
        seen.add(key);
        count++;
      }
    }
    return count;
  }, [pendingEvents]);

  const handleLogout = () => {
    logout();
    setUserMenuOpen(false);
    router.push('/');
  };

  const linkHref = (href: string) => (href === '/my-events' && !user ? '/login?redirect=/my-events' : href);
  const initials = user?.name
    ?.split(' ')
    .map((p) => p[0])
    .slice(0, 2)
    .join('')
    .toUpperCase();

  return (
    <header className="sticky top-0 z-50 bg-white border-b border-line">
      <nav className="mx-auto flex h-16 max-w-[1440px] items-center justify-between gap-6 px-4 sm:px-8 lg:px-20">
        <Wordmark />

        {/* Desktop links */}
        <div className="hidden lg:flex items-center gap-7">
          {links.map((link) => {
            const active = isActivePath(pathname, link.href);
            return (
              <Link
                key={link.href}
                href={linkHref(link.href)}
                className={`flex items-center gap-1.5 whitespace-nowrap text-[12px] uppercase tracking-[0.1em] text-navy hover:opacity-70 ${
                  active ? 'font-bold' : 'font-normal'
                }`}
              >
                {active && <span className="h-1.5 w-1.5 rounded-full bg-coral" />}
                {link.label}
                {noticeBadge(link.href)}
              </Link>
            );
          })}
          {isAdmin && (
            <Link
              href="/admin"
              className={`flex items-center gap-1.5 whitespace-nowrap text-[12px] uppercase tracking-[0.1em] text-navy hover:opacity-70 ${
                isActivePath(pathname, '/admin') ? 'font-bold' : 'font-normal'
              }`}
            >
              {isActivePath(pathname, '/admin') && <span className="h-1.5 w-1.5 rounded-full bg-coral" />}
              Admin
              {pendingCount > 0 && (
                <span className="ml-0.5 rounded-full bg-sun px-1.5 py-0.5 text-[10px] font-bold leading-none text-navy">
                  {pendingCount}
                </span>
              )}
            </Link>
          )}
        </div>

        {/* Actions */}
        <div className="hidden lg:flex items-center gap-2.5">
          {authLoading ? (
            <div className="h-11 w-[89px] rounded-full bg-sky-soft animate-pulse" />
          ) : user ? (
            <div className="relative">
              <button
                onClick={() => setUserMenuOpen(!userMenuOpen)}
                className="flex h-11 items-center gap-2 rounded-full border-[1.5px] border-line pl-1.5 pr-4 text-sm font-medium text-navy hover:border-navy transition-colors"
              >
                <span className="flex h-8 w-8 items-center justify-center rounded-full bg-sun text-[12px] font-bold text-navy">
                  {initials || <User size={14} />}
                </span>
                <span className="max-w-[110px] truncate">{user.name}</span>
              </button>

              <AnimatePresence>
                {userMenuOpen && (
                  <>
                    <div className="fixed inset-0 z-10" onClick={() => setUserMenuOpen(false)} />
                    <motion.div
                      initial={{ opacity: 0, y: -8 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -8 }}
                      className="absolute right-0 top-full z-20 mt-2 w-60 overflow-hidden rounded-[18px] border border-line bg-white shadow-[0_18px_40px_-12px_rgba(27,42,65,0.25)]"
                    >
                      <div className="border-b border-line px-4 py-3">
                        <p className="truncate font-bold text-navy">{user.name}</p>
                        <p className="truncate text-[13px] text-ink-muted">{user.email}</p>
                        <span className="tag mt-2 bg-sun text-navy">
                          {user.role === 'user' ? 'Event-goer' : user.role}
                        </span>
                      </div>
                      <div className="py-2">
                        <Link
                          href="/account"
                          onClick={() => setUserMenuOpen(false)}
                          className="flex items-center gap-2 px-4 py-2 text-sm text-navy hover:bg-sky-soft"
                        >
                          <User size={16} />
                          Your account
                        </Link>
                        {isAdmin && (
                          <Link
                            href="/admin"
                            onClick={() => setUserMenuOpen(false)}
                            className="flex items-center gap-2 px-4 py-2 text-sm text-navy hover:bg-sky-soft"
                          >
                            <Shield size={16} />
                            Admin dashboard
                          </Link>
                        )}
                        <button
                          onClick={handleLogout}
                          className="flex w-full items-center gap-2 px-4 py-2 text-sm text-danger hover:bg-danger-tint"
                        >
                          <LogOut size={16} />
                          Sign out
                        </button>
                      </div>
                    </motion.div>
                  </>
                )}
              </AnimatePresence>
            </div>
          ) : (
            <Link href="/login" className="btn-ghost">
              Sign in
            </Link>
          )}
          <Link href="/submit" className="btn-sun">
            Submit event
          </Link>
        </div>

        {/* Mobile toggle */}
        <button
          onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          className="lg:hidden flex h-11 w-11 items-center justify-center rounded-full border-[1.5px] border-line text-navy"
          aria-label="Toggle menu"
        >
          {mobileMenuOpen ? <X size={20} /> : <Menu size={20} />}
        </button>
      </nav>

      {/* Mobile menu */}
      <AnimatePresence>
        {mobileMenuOpen && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="lg:hidden overflow-hidden border-t border-line bg-white"
          >
            <div className="flex flex-col gap-1 px-4 py-4">
              {links.map((link) => {
                const active = isActivePath(pathname, link.href);
                return (
                  <Link
                    key={link.href}
                    href={linkHref(link.href)}
                    onClick={() => setMobileMenuOpen(false)}
                    className={`flex items-center gap-2 rounded-[14px] px-4 py-3 text-[13px] uppercase tracking-[0.1em] text-navy ${
                      active ? 'bg-sky-soft font-bold' : ''
                    }`}
                  >
                    {active && <span className="h-1.5 w-1.5 rounded-full bg-coral" />}
                    {link.label}
                    {noticeBadge(link.href)}
                  </Link>
                );
              })}
              <Link
                href="/about"
                onClick={() => setMobileMenuOpen(false)}
                className="rounded-[14px] px-4 py-3 text-[13px] uppercase tracking-[0.1em] text-navy"
              >
                About
              </Link>
              {isAdmin && (
                <Link
                  href="/admin"
                  onClick={() => setMobileMenuOpen(false)}
                  className="flex items-center gap-2 rounded-[14px] px-4 py-3 text-[13px] uppercase tracking-[0.1em] text-navy"
                >
                  Admin
                  {pendingCount > 0 && (
                    <span className="rounded-full bg-sun px-1.5 py-0.5 text-[10px] font-bold leading-none">{pendingCount}</span>
                  )}
                </Link>
              )}
              <div className="mt-3 flex flex-col gap-2 border-t border-line pt-4">
                <Link href="/submit" onClick={() => setMobileMenuOpen(false)} className="btn-sun w-full">
                  Submit event
                </Link>
                {authLoading ? null : user ? (
                  <>
                    <Link href="/account" onClick={() => setMobileMenuOpen(false)} className="btn-ghost w-full">
                      Your account
                    </Link>
                    <button
                      onClick={() => {
                        handleLogout();
                        setMobileMenuOpen(false);
                      }}
                      className="btn w-full text-danger font-medium"
                    >
                      Sign out
                    </button>
                  </>
                ) : (
                  <Link href="/login" onClick={() => setMobileMenuOpen(false)} className="btn-ghost w-full">
                    Sign in
                  </Link>
                )}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </header>
  );
}
