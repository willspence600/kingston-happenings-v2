'use client';

import { useState } from 'react';
import Link from 'next/link';
import { AlertCircle, AlertTriangle, Check, Loader2, Mail, ShieldCheck } from 'lucide-react';
import { format } from 'date-fns';
import { useAuth } from '@/contexts/AuthContext';
import { useOrganizerVerification } from '@/hooks/useOrganizerVerification';

const VERIFICATION_EMAIL = 'kingstonhappenings.ca@gmail.com';

export default function OrganizerVerificationPage() {
  const { user, isLoading: authLoading } = useAuth();
  const { isVerifiedOrganizer, verificationRequestedAt, organizerApproved, isLoading, requestVerification } = useOrganizerVerification();
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  if (authLoading || (user && isLoading)) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <Loader2 size={32} className="animate-spin text-navy" />
      </div>
    );
  }

  if (!user) {
    return (
      <div className="page-container flex min-h-[60vh] flex-col items-start justify-center gap-4 py-24">
        <p className="eyebrow">— Verification</p>
        <h1 className="display-section">Sign in first</h1>
        <p className="text-ink-muted">Sign in to your organizer account to request verification.</p>
        <Link href="/login?redirect=/organizer-verification" className="btn-sun mt-2">
          Sign in
        </Link>
      </div>
    );
  }

  const mailto = `mailto:${VERIFICATION_EMAIL}?subject=${encodeURIComponent('Verified organizer request')}&body=${encodeURIComponent(
    `Hi Kingston Happenings,\n\nThe Kingston Happenings account ${user.email}${
      user.venueName ? ` (${user.venueName})` : ''
    } is associated with me, and I'd like it to be a verified organizer.\n\nName:\nRole:\n`
  )}`;

  const handleRequest = async () => {
    setError('');
    setSubmitting(true);
    try {
      await requestVerification();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to send your request. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="page-container pb-24 pt-10">
      <p className="eyebrow mb-3.5">— Verification</p>
      <h1 className="display-section">
        Become a verified
        <br />
        organizer
      </h1>
      <p className="mt-4 max-w-[640px] text-[18px] text-ink-muted">
        Verified organizers&rsquo; events and specials go live right away, with no admin review.
      </p>

      <div className="mt-10 grid grid-cols-1 gap-10 lg:grid-cols-[1fr_360px]">
        <div className="flex min-w-0 flex-col gap-5">
          {isVerifiedOrganizer ? (
            <div className="card flex flex-col items-start gap-4 p-7">
              <span className="tag bg-sun text-navy gap-1">
                <Check size={12} strokeWidth={3} /> Verified Organizer
              </span>
              <p className="text-[16px] text-navy">Your account is already verified. Your listings go live right away.</p>
              <Link href="/submit" className="btn-sun">
                Submit an event or special
              </Link>
            </div>
          ) : user.role !== 'organizer' ? (
            <div className="card flex flex-col items-start gap-4 p-7">
              <p className="text-[16px] text-navy">
                Verification is for organizer accounts. If you&rsquo;re associated with a restaurant or venue in Kingston, request
                organizer access first.
              </p>
              <Link href="/account" className="btn-sun">
                Go to my account
              </Link>
            </div>
          ) : !organizerApproved ? (
            <div className="card flex flex-col items-start gap-4 p-7">
              <span className="tag bg-[#fff1d6] text-[#8a5a00] gap-1">
                <span className="h-1.5 w-1.5 rounded-full bg-sun" /> Account in review
              </span>
              <p className="text-[16px] text-navy">
                Our admin team is still reviewing your organizer account, usually within 1–2 business days. You can request to become a
                Verified Organizer once it&rsquo;s approved.
              </p>
            </div>
          ) : (
            <>
              <section className="card p-5 sm:p-7">
                <h3 className="flex items-center gap-3 text-[20px] font-bold text-navy">
                  <span className="flex h-7 w-7 items-center justify-center rounded-full bg-navy text-[13px] font-bold text-white">1</span>
                  Email us from your company email
                </h3>
                <p className="mt-4 text-[15px] leading-[1.6] text-navy">
                  Please email{' '}
                  <a href={`mailto:${VERIFICATION_EMAIL}`} className="font-bold text-link hover:underline">
                    {VERIFICATION_EMAIL}
                  </a>{' '}
                  from a company email address saying that this account (<span className="font-medium">{user.email}</span>) is
                  associated with you.
                </p>
                <a href={mailto} className="btn-outline mt-5">
                  <Mail size={15} /> Open email
                </a>
              </section>

              <section className="card p-5 sm:p-7">
                <h3 className="flex items-center gap-3 text-[20px] font-bold text-navy">
                  <span className="flex h-7 w-7 items-center justify-center rounded-full bg-navy text-[13px] font-bold text-white">2</span>
                  Send your request
                </h3>
                {verificationRequestedAt ? (
                  <div className="mt-4 flex flex-col items-start gap-3">
                    <span className="tag bg-[#fff1d6] text-[#8a5a00] gap-1">
                      <span className="h-1.5 w-1.5 rounded-full bg-sun" /> Request sent {format(new Date(verificationRequestedAt), 'MMM d, yyyy')}
                    </span>
                    <p className="text-[15px] leading-[1.6] text-navy">
                      Thanks! Our team will verify your account once we receive your email. Until then, your listings are reviewed before
                      they go live.
                    </p>
                  </div>
                ) : (
                  <>
                    <p className="mt-4 text-[15px] leading-[1.6] text-navy">
                      Once you&rsquo;ve sent the email, let us know here so our team can match it to your account.
                    </p>
                    {error && (
                      <div className="mt-4 flex items-start gap-3 rounded-[14px] bg-danger-tint p-4 text-[14px] text-danger">
                        <AlertCircle size={18} className="mt-0.5 shrink-0" />
                        <p>{error}</p>
                      </div>
                    )}
                    <button type="button" onClick={handleRequest} disabled={submitting} className="btn-sun mt-5">
                      {submitting ? <Loader2 size={18} className="animate-spin" /> : <ShieldCheck size={16} />}
                      Request to be a Verified Organizer
                    </button>
                  </>
                )}
              </section>

              <div className="flex items-start gap-3 rounded-[14px] bg-[#fff1d6] p-4 text-[14px] leading-[1.5] text-navy">
                <AlertTriangle size={18} className="mt-0.5 shrink-0 text-[#8a5a00]" />
                <p>
                  <span className="font-bold">Please note:</span> verified accounts publish without review. If an account is purposely
                  misused (for example, posting false, misleading or spam listings), it will be deleted.
                </p>
              </div>
            </>
          )}
        </div>

        <aside className="flex flex-col gap-4 self-start lg:sticky lg:top-24">
          <div className="rounded-[22px] bg-navy p-7 text-white">
            <p className="eyebrow-bold text-sun">How verification works</p>
            <ol className="mt-4 flex flex-col gap-[18px]">
              {[
                ['Email us', 'From your company email address.'],
                ['Send your request', 'It shows up for our team to review.'],
                ['Get verified', 'Your listings go live right away.'],
              ].map(([t, d], i) => (
                <li key={t} className="flex gap-3.5">
                  <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-sun text-[12px] font-bold text-navy">
                    {i + 1}
                  </span>
                  <span>
                    <span className="block text-[15px] font-bold">{t}</span>
                    <span className="block text-[13px] text-on-dark-muted">{d}</span>
                  </span>
                </li>
              ))}
            </ol>
          </div>
        </aside>
      </div>
    </div>
  );
}
