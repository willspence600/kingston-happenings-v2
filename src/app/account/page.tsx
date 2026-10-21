'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { format, parseISO } from 'date-fns';
import { User, Mail, Trash2, Loader2, LogOut, Store, Shield, CheckCircle, AlertTriangle, FileText, ShieldCheck, Clock } from 'lucide-react';
import type { EmailOption } from '@/lib/siteContent';
import { useAuth } from '@/contexts/AuthContext';
import { useEvents } from '@/contexts/EventsContext';
import { useOrganizerVerification } from '@/hooks/useOrganizerVerification';
import { Modal } from '@/components';

const roleLabels = { user: 'Event-goer', organizer: 'Organizer', admin: 'Admin' } as const;

export default function AccountPage() {
  const router = useRouter();
  const { user, isLoading: authLoading, logout } = useAuth();
  const [name, setName] = useState('');
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const { venues } = useEvents();
  const { organizerApproved, organizerVenueIds, isVerifiedOrganizer, verificationRequestedAt, isLoading: verificationLoading } = useOrganizerVerification();
  const [emailOptions, setEmailOptions] = useState<EmailOption[]>([]);
  const [emailPrefs, setEmailPrefs] = useState<Record<string, boolean> | null>(null);
  const [agreedToTermsAt, setAgreedToTermsAt] = useState<string | null>(null);
  const [savingPref, setSavingPref] = useState<string | null>(null);

  useEffect(() => {
    if (!user) return;
    fetch('/api/user/email-preferences')
      .then((res) => (res.ok ? res.json() : null))
      .catch(() => null)
      .then((data) => {
        if (!data?.preferences) return;
        setEmailOptions(data.options || []);
        setEmailPrefs(data.preferences);
        setAgreedToTermsAt(data.agreedToTermsAt || null);
      });
  }, [user]);

  const updateEmailPref = async (key: string, value: boolean) => {
    if (!emailPrefs) return;
    const previous = emailPrefs;
    setEmailPrefs({ ...emailPrefs, [key]: value });
    setSavingPref(key);
    try {
      const res = await fetch('/api/user/email-preferences', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ [key]: value }),
      });
      if (!res.ok) throw new Error();
    } catch {
      setEmailPrefs(previous);
      setMessage({ type: 'error', text: 'Could not update your email preferences. Please try again.' });
    } finally {
      setSavingPref(null);
    }
  };

  const setAllEmailPrefs = async (value: boolean) => {
    if (!emailPrefs) return;
    const previous = emailPrefs;
    const next = Object.fromEntries(emailOptions.map((o) => [o.key, value]));
    setEmailPrefs({ ...emailPrefs, ...next });
    setSavingPref('all');
    try {
      const res = await fetch('/api/user/email-preferences', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(next),
      });
      if (!res.ok) throw new Error();
    } catch {
      setEmailPrefs(previous);
      setMessage({ type: 'error', text: 'Could not update your email preferences. Please try again.' });
    } finally {
      setSavingPref(null);
    }
  };

  useEffect(() => {
    if (!authLoading && !user) router.push('/login?redirect=/account');
  }, [user, authLoading, router]);

  useEffect(() => {
    if (user) setName(user.name);
  }, [user]);

  if (authLoading || !user) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <Loader2 size={32} className="animate-spin text-navy" />
      </div>
    );
  }

  const linkedVenues = venues.filter((v) => organizerVenueIds.includes(v.id));

  const initials = user.name
    .split(' ')
    .map((p) => p[0])
    .slice(0, 2)
    .join('')
    .toUpperCase();

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setMessage(null);
    try {
      const res = await fetch('/api/user/update', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name }),
      });
      if (res.ok) {
        setMessage({ type: 'success', text: 'Profile updated!' });
        window.location.reload();
      } else {
        const data = await res.json();
        setMessage({ type: 'error', text: data.error || 'Failed to update profile' });
      }
    } catch {
      setMessage({ type: 'error', text: 'An error occurred. Please try again.' });
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteAccount = async () => {
    setDeleting(true);
    setMessage(null);
    try {
      const res = await fetch('/api/user/delete', { method: 'DELETE' });
      const data = await res.json();
      if (res.ok && data.success) {
        await logout();
        window.location.href = '/';
      } else {
        const errorMsg = data.details
          ? `${data.error || 'Failed to delete account'}. ${data.details}`
          : data.error || 'Failed to delete account';
        setMessage({ type: 'error', text: errorMsg });
        setDeleting(false);
        setShowDeleteModal(false);
      }
    } catch (error) {
      console.error('Delete account error:', error);
      setMessage({ type: 'error', text: 'An error occurred. Please try again or contact support.' });
      setDeleting(false);
      setShowDeleteModal(false);
    }
  };

  const handleSignOut = async () => {
    await logout();
    router.push('/');
  };

  const organizerRequest = `mailto:kingstonhappenings.ca@gmail.com?subject=${encodeURIComponent(
    'Organizer access request'
  )}&body=${encodeURIComponent(`Hi! I'd like organizer access for my account (${user.email}).\n\nVenue / organization: `)}`;

  return (
    <div className="page-container pb-24 pt-10">
      <p className="eyebrow mb-3.5">— Account</p>
      <div className="flex flex-col gap-6 sm:flex-row sm:items-end sm:justify-between">
        <h1 className="display-section">
          Your
          <br />
          account
        </h1>
        <button onClick={handleSignOut} className="btn-outline self-start sm:self-auto sm:mb-2">
          <LogOut size={15} />
          Sign out
        </button>
      </div>

      {message && (
        <div
          className={`mt-8 flex items-center gap-3 rounded-[14px] p-4 text-[14px] ${
            message.type === 'success' ? 'bg-success-tint text-success' : 'bg-danger-tint text-danger'
          }`}
        >
          {message.type === 'success' ? <CheckCircle size={18} /> : <AlertTriangle size={18} />}
          {message.text}
        </div>
      )}

      {user.role === 'organizer' && !verificationLoading && !isVerifiedOrganizer && (
        <div className="mt-8 flex flex-col gap-4 rounded-[22px] bg-sun p-5 text-navy sm:flex-row sm:items-center sm:justify-between sm:p-6">
          <div className="flex items-start gap-3">
            {verificationRequestedAt ? <Clock size={20} className="mt-0.5 shrink-0" /> : <ShieldCheck size={20} className="mt-0.5 shrink-0" />}
            <div>
              <p className="text-[17px] font-bold">
                {!organizerApproved
                  ? 'Your organizer account is in review'
                  : verificationRequestedAt
                  ? 'Your Verified Organizer request is with our team'
                  : 'Skip the review queue — get verified'}
              </p>
              <p className="mt-1 text-[13px] leading-[1.5]">
                {!organizerApproved
                  ? 'Once it’s approved, you can request to be a Verified Organizer.'
                  : verificationRequestedAt
                  ? `Requested ${format(new Date(verificationRequestedAt), 'MMM d, yyyy')}. Make sure you’ve sent us the confirmation email.`
                  : 'Verified Organizers’ events and specials go live right away, without admin review.'}
              </p>
            </div>
          </div>
          {organizerApproved && (
            <Link href="/organizer-verification" className="btn-navy shrink-0">
              {verificationRequestedAt ? 'View request' : 'Request to be a Verified Organizer'}
            </Link>
          )}
        </div>
      )}

      <div className="mt-10 grid grid-cols-1 gap-4 lg:grid-cols-[1fr_440px] lg:items-start">
        <div className="flex flex-col gap-4">
          <form onSubmit={handleSave} className="card p-6 sm:p-7">
            <p className="eyebrow-sm">Profile information</p>
            <div className="mt-5 flex items-center gap-4">
              <span className="flex h-16 w-16 items-center justify-center rounded-full bg-sun text-[20px] font-bold text-navy">
                {initials || <User size={22} />}
              </span>
              <div>
                <p className="text-[20px] font-bold text-navy">{user.name}</p>
                {user.createdAt && (
                  <p className="text-[13px] text-ink-muted">Member since {format(parseISO(user.createdAt), 'MMMM yyyy')}</p>
                )}
              </div>
            </div>
            <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div>
                <label htmlFor="name" className="field-label">
                  Name
                </label>
                <div className="relative">
                  <User size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-link" />
                  <input
                    id="name"
                    required
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="field field-with-icon"
                  />
                </div>
              </div>
              <div>
                <label htmlFor="email" className="field-label">
                  Email
                </label>
                <div className="relative">
                  <Mail size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-link" />
                  <input id="email" value={user.email} readOnly className="field field-with-icon bg-sky-soft text-ink-muted" />
                </div>
              </div>
            </div>
            <div className="mt-5 flex justify-end">
              <button type="submit" disabled={saving || name.trim() === user.name || !name.trim()} className="btn-sun">
                {saving && <Loader2 size={15} className="animate-spin" />}
                Save changes
              </button>
            </div>
          </form>

          <div className="card p-6 sm:p-7">
            <p className="eyebrow-sm">Email preferences</p>
            {emailPrefs ? (
              <div className="mt-5 flex flex-col">
                {emailOptions.length === 0 && <p className="text-[13px] text-ink-muted">There are no optional emails right now.</p>}
                {emailOptions.map(({ key, label, description: hint }) => (
                  <div key={key} className="flex items-center justify-between gap-4 border-b border-line py-4 first:pt-0 last:border-b-0">
                    <div>
                      <p className="text-[15px] font-bold text-navy">{label}</p>
                      <p className="mt-0.5 text-[13px] text-ink-muted">{hint}</p>
                    </div>
                    <button
                      type="button"
                      className="switch shrink-0"
                      data-on={emailPrefs[key]}
                      disabled={savingPref === key}
                      onClick={() => updateEmailPref(key, !emailPrefs[key])}
                      aria-label={`${emailPrefs[key] ? 'Turn off' : 'Turn on'} ${label}`}
                    >
                      <span />
                    </button>
                  </div>
                ))}
                <div className="mt-3 flex flex-wrap gap-2">
                  {emailOptions.length > 0 && (
                    <>
                      <button type="button" className="btn-ghost btn-sm" disabled={!!savingPref} onClick={() => setAllEmailPrefs(true)}>
                        Opt in to all
                      </button>
                      <button type="button" className="btn-ghost btn-sm" disabled={!!savingPref} onClick={() => setAllEmailPrefs(false)}>
                        Unsubscribe from all
                      </button>
                    </>
                  )}
                </div>
                <p className="mt-3 text-[12px] text-ink-muted">Account and security emails, like password resets, are always sent.</p>
              </div>
            ) : (
              <div className="flex justify-center py-6">
                <Loader2 size={20} className="animate-spin text-navy" />
              </div>
            )}
          </div>

          <div className="card p-6 sm:p-7">
            <p className="eyebrow-sm">Terms &amp; privacy</p>
            <p className="mt-3 text-[14px] text-navy">
              {agreedToTermsAt
                ? `You agreed to the Terms of Service and Privacy Policy on ${format(new Date(agreedToTermsAt), 'MMMM d, yyyy')}.`
                : 'You agreed to these when you created your account.'}
            </p>
            <div className="mt-4 flex flex-wrap gap-2">
              <Link href="/terms" className="btn-outline btn-sm">
                <FileText size={14} /> Terms of Service
              </Link>
              <Link href="/privacy" className="btn-outline btn-sm">
                <ShieldCheck size={14} /> Privacy Policy
              </Link>
            </div>
          </div>

          <div className="rounded-[22px] bg-danger-tint p-6 sm:p-7">
            <p className="eyebrow-bold text-navy">Danger zone</p>
            <div className="mt-4 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <p className="text-[20px] font-bold text-navy">Delete account</p>
                <p className="mt-1 max-w-[420px] text-[13px] text-ink-muted">
                  Permanently remove your account, saved events and submissions. This can&rsquo;t be undone.
                </p>
              </div>
              <button
                onClick={() => setShowDeleteModal(true)}
                className="btn shrink-0 border-[1.5px] border-danger text-danger font-medium hover:bg-danger hover:text-white"
              >
                <Trash2 size={15} />
                Delete account
              </button>
            </div>
          </div>
        </div>

        <div className="rounded-[22px] bg-navy p-6 text-white sm:p-7">
          <p className="eyebrow-bold text-sun">Account status</p>
          <div className="mt-5 flex items-center justify-between border-b border-white/15 pb-4">
            <span className="text-[15px] text-on-dark-muted">Role</span>
            <span className="tag bg-sun text-navy gap-1.5">
              {user.role === 'admin' ? <Shield size={12} /> : user.role === 'organizer' ? <Store size={12} /> : <User size={12} />}
              {roleLabels[user.role]}
            </span>
          </div>
          {user.role === 'organizer' && (
            <div className="flex items-center justify-between border-b border-white/15 py-4">
              <span className="text-[15px] text-on-dark-muted">Status</span>
              {isVerifiedOrganizer ? (
                <span className="tag gap-1 bg-sun text-navy">
                  <ShieldCheck size={12} /> Verified Organizer
                </span>
              ) : (
                <span className="text-[14px] font-bold">
                  {!organizerApproved ? 'In review' : verificationRequestedAt ? 'Verification requested' : 'Approved · Unverified'}
                </span>
              )}
            </div>
          )}
          {user.role === 'organizer' && linkedVenues.length > 0 ? (
            <div className="flex items-start justify-between gap-4 border-b border-white/15 py-4">
              <span className="text-[15px] text-on-dark-muted">{linkedVenues.length === 1 ? 'Venue' : 'Venues'}</span>
              <span className="flex flex-col items-end gap-1 text-right">
                {linkedVenues.map((v) => (
                  <Link key={v.id} href={`/venues/${v.id}`} className="text-[14px] font-bold hover:underline">
                    {v.name}
                  </Link>
                ))}
                {organizerApproved && (
                  <Link href="/my-venue#add-venue" className="text-[12px] font-medium text-sun hover:underline">
                    + Add another venue
                  </Link>
                )}
              </span>
            </div>
          ) : (
            user.venueName && (
              <div className="flex items-center justify-between border-b border-white/15 py-4">
                <span className="text-[15px] text-on-dark-muted">Venue</span>
                <span className="text-[14px] font-bold">{user.venueName}</span>
              </div>
            )
          )}
          {user.role === 'user' ? (
            <>
              <p className="mt-5 text-[20px] font-bold">Want to become an organizer?</p>
              <p className="mt-2 text-[13px] leading-[1.5] text-on-dark-muted">
                Organizers can post events and specials for their venue. Request access and we&rsquo;ll get back to you within a
                day.
              </p>
              <a href={organizerRequest} className="btn-sun mt-5 w-full">
                <Store size={15} />
                Request organizer access
              </a>
            </>
          ) : (
            <>
              <p className="mt-5 text-[20px] font-bold">
                {user.role === 'admin'
                  ? 'You have admin access'
                  : isVerifiedOrganizer
                  ? 'You can auto-publish events & specials'
                  : 'You can post events & specials'}
              </p>
              <p className="mt-2 text-[13px] leading-[1.5] text-on-dark-muted">
                {user.role === 'organizer' && isVerifiedOrganizer
                  ? 'As a Verified Organizer, your events and specials go live as soon as you submit them — no admin review. Track them from My Events.'
                  : user.role === 'organizer'
                  ? 'Your events and specials are reviewed by our team before they go live. Track everything you’ve submitted from My Events.'
                  : 'Track everything you’ve submitted from My Events.'}
              </p>
              <div className="mt-5 flex flex-col gap-2.5">
                <Link href="/submit" className="btn-sun w-full">
                  Submit an event →
                </Link>
                {user.role === 'admin' ? (
                  <Link href="/admin" className="btn w-full border-[1.5px] border-white text-white font-medium hover:bg-white hover:text-navy">
                    Admin dashboard
                  </Link>
                ) : (
                  <Link
                    href="/my-events?tab=submitted"
                    className="btn w-full border-[1.5px] border-white text-white font-medium hover:bg-white hover:text-navy"
                  >
                    Your submissions
                  </Link>
                )}
              </div>
            </>
          )}
        </div>
      </div>

      <Modal
        isOpen={showDeleteModal}
        onClose={() => setShowDeleteModal(false)}
        title="Delete account"
        message="Are you sure you want to delete your account? This action cannot be undone and all your data will be permanently removed."
        type="warning"
        confirmText={deleting ? 'Deleting...' : 'Delete account'}
        onConfirm={handleDeleteAccount}
      />
    </div>
  );
}
