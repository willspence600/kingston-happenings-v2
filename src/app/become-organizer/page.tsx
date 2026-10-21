'use client';

import { useEffect, useState, type ReactNode } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { AlertCircle, Check, Eye, EyeOff, Loader2, Pencil, Store } from 'lucide-react';
import { format } from 'date-fns';
import { useAuth } from '@/contexts/AuthContext';
import { useEvents } from '@/contexts/EventsContext';
import { ACCESSIBILITY_OPTIONS } from '@/constants/venueDetails';
import { Dropzone, Field, VenueFields, draftToApplication, emptyVenue, type VenueDraft } from '@/components/venues/VenueDraftFields';
import { useSignupEmailOptions } from '@/hooks/useEmailOptions';
import type { OrganizerApplication, OrganizerVenueApplication } from '@/lib/organizerApplication';

const roles = ['Owner', 'Manager', 'Marketing / social media', 'Promoter / booker', 'Event Coordinator / Artist'];
const accessibilityOptions = ACCESSIBILITY_OPTIONS;
// Requests go through a serverless function, which caps the body size
const MAX_DOCUMENT_BYTES = 3 * 1024 * 1024;

function Section({ number, title, hint, children }: { number: number; title: string; hint?: string; children: ReactNode }) {
  return (
    <section className="card p-5 sm:p-7">
      <h3 className="flex items-center gap-3 text-[20px] font-bold text-navy">
        <span className="flex h-7 w-7 items-center justify-center rounded-full bg-navy text-[13px] font-bold text-white">{number}</span>
        {title}
      </h3>
      {hint && <p className="mt-4 text-[13px] text-ink-muted">{hint}</p>}
      <div className="mt-5 flex flex-col gap-5">{children}</div>
    </section>
  );
}

function PasswordInput({
  id,
  value,
  onChange,
  placeholder,
  minLength,
  shown,
  onToggle,
}: {
  id: string;
  value: string;
  onChange: (v: string) => void;
  placeholder: string;
  minLength?: number;
  shown: boolean;
  onToggle: () => void;
}) {
  return (
    <div className="relative">
      <input
        id={id}
        type={shown ? 'text' : 'password'}
        required
        minLength={minLength}
        autoComplete="new-password"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="field pr-12"
      />
      <button
        type="button"
        onClick={onToggle}
        className="absolute right-4 top-1/2 -translate-y-1/2 text-ink-muted hover:text-navy"
        aria-label={shown ? 'Hide password' : 'Show password'}
      >
        {shown ? <EyeOff size={18} /> : <Eye size={18} />}
      </button>
    </div>
  );
}

function ErrorBanner({ message, className = '' }: { message: string; className?: string }) {
  return (
    <div role="alert" className={`flex items-start gap-3 rounded-[14px] bg-danger-tint p-4 text-[14px] text-danger ${className}`}>
      <AlertCircle size={18} className="mt-0.5 shrink-0" />
      <p>{message}</p>
    </div>
  );
}

function Checkbox({ checked, onChange, label }: { checked: boolean; onChange: (v: boolean) => void; label: ReactNode }) {
  return (
    <button type="button" role="checkbox" aria-checked={checked} onClick={() => onChange(!checked)} className="flex items-center gap-3 text-left text-[14px] text-navy">
      <span
        className={`flex h-[22px] w-[22px] shrink-0 items-center justify-center rounded-[6px] border-[1.5px] ${
          checked ? 'border-navy bg-navy text-white' : 'border-line bg-white'
        }`}
      >
        {checked && <Check size={13} strokeWidth={3} />}
      </span>
      {label}
    </button>
  );
}

function ApplicationReceived({ email, venueNames, uploadFailed }: { email: string; venueNames: string[]; uploadFailed: boolean }) {
  const venueLabel =
    venueNames.length === 0
      ? 'your venue'
      : venueNames.length === 1
        ? venueNames[0]
        : `${venueNames.slice(0, -1).join(', ')} and ${venueNames[venueNames.length - 1]}`;
  return (
    <div className="page-container pb-24 pt-12">
      <div className="flex h-16 w-16 items-center justify-center rounded-full bg-sun text-navy">
        <Check size={26} strokeWidth={2.5} />
      </div>
      <p className="eyebrow mt-6">— For venues &amp; organizers</p>
      <h1 className="display-section mt-3">
        Application
        <br />
        received
      </h1>
      <p className="mt-4 max-w-[520px] text-[17px] leading-[1.5] text-ink-muted">
        Thanks! We&rsquo;ll confirm you within 1–2 business days. Check your inbox at {email} to verify your email address.
      </p>
      {uploadFailed && (
        <div role="alert" className="mt-6 flex max-w-[620px] items-start gap-3 rounded-[14px] bg-[#fff1d6] p-4 text-[14px] text-[#8a5a00]">
          <AlertCircle size={18} className="mt-0.5 shrink-0" />
          <p>
            Your account was created, but your logo or verification document didn&rsquo;t upload. Reply to the confirmation email with the
            file attached and we&rsquo;ll add it for you.
          </p>
        </div>
      )}

      <div className="card mt-10 grid grid-cols-1 gap-8 p-6 sm:p-8 md:grid-cols-3">
        {[
          { state: 'done', title: 'Application received', body: `Today at ${format(new Date(), 'h:mm a')}. Nothing else you need to do.` },
          { state: 'progress', title: 'We verify you', body: `We check you’re connected to ${venueLabel}, usually by email.` },
          { state: 'next', title: 'Start posting', body: 'Once you’re approved, you can post events and specials for your venues.' },
        ].map((s, i) => (
          <div key={s.title}>
            <div className="flex items-center gap-3">
              <span
                className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-[14px] font-bold ${
                  s.state === 'done' ? 'bg-success-tint text-success' : s.state === 'progress' ? 'bg-sun text-navy' : 'border border-line text-navy'
                }`}
              >
                {s.state === 'done' ? <Check size={16} /> : i + 1}
              </span>
              {i < 2 && <span className={`hidden h-px flex-1 md:block ${s.state === 'done' ? 'bg-navy' : 'bg-line'}`} />}
            </div>
            <span
              className={`tag mt-4 gap-1 ${
                s.state === 'done' ? 'bg-success-tint text-success' : s.state === 'progress' ? 'bg-[#fff1d6] text-[#8a5a00]' : 'bg-sky text-navy'
              }`}
            >
              {s.state !== 'next' && <span className={`h-1.5 w-1.5 rounded-full ${s.state === 'done' ? 'bg-success' : 'bg-sun'}`} />}
              {s.state === 'done' ? 'Done' : s.state === 'progress' ? 'In progress' : 'Up next'}
            </span>
            <p className="mt-3 text-[18px] font-bold text-navy">{s.title}</p>
            <p className="mt-1 text-[13px] leading-[1.5] text-ink-muted">{s.body}</p>
          </div>
        ))}
      </div>

      <p className="eyebrow-sm mt-12">While you wait</p>
      <div className="mt-3 grid grid-cols-1 gap-3 md:grid-cols-3">
        {[
          { icon: <Store size={15} />, title: 'Polish your venue page', body: 'See how venues show up on Kingston Happenings.', href: '/venues', cta: 'Browse venues →' },
          { icon: <Pencil size={15} />, title: 'Draft your first listing', body: 'Once you’re verified and signed in, submit an event or special.', href: '/submit', cta: 'Start a draft →' },
          { icon: <Eye size={15} />, title: 'See how others do it', body: 'Browse tonight’s listings to get a feel for what works in Kingston.', href: '/', cta: 'Browse Today →' },
        ].map((c) => (
          <div key={c.title} className="card p-5">
            <span className="flex h-8 w-8 items-center justify-center rounded-full bg-sky text-link">{c.icon}</span>
            <p className="mt-4 text-[16px] font-bold text-navy">{c.title}</p>
            <p className="mt-1 text-[13px] leading-[1.5] text-ink-muted">{c.body}</p>
            <Link href={c.href} className="link-arrow mt-3">
              {c.cta}
            </Link>
          </div>
        ))}
      </div>

      <div className="mt-10 flex flex-wrap gap-3">
        <Link href="/login" className="btn-sun">
          Go to sign in
        </Link>
        <Link href="/" className="btn-outline">
          Back to Today
        </Link>
      </div>
      <p className="mt-4 text-[12px] text-ink-muted">Questions? Reply to the confirmation email and a real person will get back to you.</p>
    </div>
  );
}

function readFileAsDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => resolve(e.target?.result as string);
    reader.onerror = () => reject(new Error('Failed to read file'));
    reader.readAsDataURL(file);
  });
}

async function uploadSignupFile(body: { userId: string; kind: 'logo' | 'document'; venueIndex?: number; dataUrl: string }) {
  const res = await fetch('/api/organizer-signup/files', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  return res.ok;
}

export default function BecomeOrganizerPage() {
  const router = useRouter();
  const { register, user } = useAuth();
  const { venues } = useEvents();
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState<{ email: string; venueNames: string[]; uploadFailed: boolean } | null>(null);

  const [account, setAccount] = useState({ name: '', phone: '', email: '', password: '', confirm: '', role: 'Owner' });
  const [showPassword, setShowPassword] = useState(false);
  const [venueDrafts, setVenueDrafts] = useState<VenueDraft[]>(() => [emptyVenue()]);
  const [accessibility, setAccessibility] = useState<string[]>([]);
  const [accessibilityNotes, setAccessibilityNotes] = useState('');
  const [confirmMethod, setConfirmMethod] = useState<'email' | 'document'>('email');
  const [verificationDoc, setVerificationDoc] = useState<{ name: string; dataUrl: string } | null>(null);
  const [notes, setNotes] = useState('');
  const [agree, setAgree] = useState(false);
  const { options: emailOptions, prefs: emailPrefs, setPref: setEmailPref } = useSignupEmailOptions('organizer');

  useEffect(() => {
    if (user && !done) router.push('/account');
  }, [user, done, router]);

  if (done) return <ApplicationReceived email={done.email} venueNames={done.venueNames} uploadFailed={done.uploadFailed} />;

  const showError = (msg: string) => {
    setError(msg);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const updateDraft = (key: number, d: VenueDraft) => setVenueDrafts((prev) => prev.map((v) => (v.key === key ? d : v)));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    const pw = account.password;
    if (pw.length < 10) {
      showError('Your password needs at least 10 characters.');
      return;
    }
    if (pw !== account.confirm) {
      showError('Passwords don’t match.');
      return;
    }
    const filled = venueDrafts.filter((v) => v.claimedVenueId || v.name.trim());
    if (filled.length === 0) {
      showError('Pick your venue or add a new one.');
      return;
    }
    if (filled.some((v) => !v.claimedVenueId && !v.street.trim())) {
      showError('Add a street address for each new venue.');
      return;
    }
    if (filled.some((v) => v.types.includes('Other') && !v.otherType.trim())) {
      showError('Type your venue type under “Other”.');
      return;
    }
    if (confirmMethod === 'document' && !verificationDoc) {
      showError('Upload a document that shows you’re connected to the venue.');
      return;
    }
    if (!agree) {
      showError('Please agree to the Terms of Service and Privacy Policy to continue.');
      return;
    }

    const applicationVenues: OrganizerVenueApplication[] = filled.map(draftToApplication);
    const application: OrganizerApplication = {
      phone: account.phone,
      role: account.role,
      venues: applicationVenues,
      accessibility,
      accessibilityNotes,
      confirmMethod,
      notes,
      agreedToTerms: true,
      newsletter: emailPrefs.venueTips ?? false,
      submittedAt: new Date().toISOString(),
    };
    const venueNames = applicationVenues.map((v) => v.name);

    setSubmitting(true);
    let result: Awaited<ReturnType<typeof register>>;
    try {
      result = await register({
        name: account.name,
        email: account.email,
        password: pw,
        role: 'organizer',
        venueName: venueNames[0],
        organizerApplication: application as unknown as Record<string, unknown>,
        emailPreferences: emailPrefs,
      });
    } catch (err) {
      console.error('[Organizer sign-up] Register threw:', err);
      result = { success: false, error: err instanceof Error ? err.message : undefined };
    }

    if (!result.success) {
      setSubmitting(false);
      showError(result.error || 'We couldn’t create your account. Please check your details and try again.');
      return;
    }

    // Attach files one at a time (each upload updates the same application)
    let uploadFailed = false;
    if (result.userId) {
      const userId = result.userId;
      try {
        for (let i = 0; i < filled.length; i++) {
          if (filled[i].logo && !(await uploadSignupFile({ userId, kind: 'logo', venueIndex: i, dataUrl: filled[i].logo }))) uploadFailed = true;
        }
        if (confirmMethod === 'document' && verificationDoc && !(await uploadSignupFile({ userId, kind: 'document', dataUrl: verificationDoc.dataUrl }))) {
          uploadFailed = true;
        }
      } catch {
        uploadFailed = true;
      }
      if (uploadFailed) console.error('[Organizer sign-up] Some files could not be uploaded');
    }

    setSubmitting(false);
    setDone({ email: account.email, venueNames, uploadFailed });
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const takenIds = venueDrafts.map((v) => v.claimedVenueId).filter(Boolean);

  return (
    <div className="page-container pb-24 pt-10">
      <p className="eyebrow mb-3.5">— For organizers &amp; artists</p>
      <h1 className="display-section">
        Become an
        <br />
        organizer
      </h1>

      {error && <ErrorBanner message={error} className="mt-8" />}

      <form onSubmit={handleSubmit} className="mt-10 grid grid-cols-1 gap-8 lg:grid-cols-[1fr_360px]">
        <div className="flex min-w-0 flex-col gap-4">
          <Section number={1} title="Your account" hint="You’ll use this to sign in and post listings.">
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <Field label="Full name" id="org-name">
                <input id="org-name" required value={account.name} onChange={(e) => setAccount({ ...account, name: e.target.value })} placeholder="John Doe" className="field" />
              </Field>
              <Field label="Phone" id="org-phone">
                <input id="org-phone" type="tel" value={account.phone} onChange={(e) => setAccount({ ...account, phone: e.target.value })} placeholder="123-456-7890" className="field" />
              </Field>
            </div>
            <Field label="Work email" id="org-email">
              <input id="org-email" type="email" required value={account.email} onChange={(e) => setAccount({ ...account, email: e.target.value })} placeholder="you@example.com" className="field" />
            </Field>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <Field label="Password" id="org-password">
                <PasswordInput
                  id="org-password"
                  minLength={10}
                  value={account.password}
                  onChange={(password) => setAccount({ ...account, password })}
                  placeholder="At least 10 characters"
                  shown={showPassword}
                  onToggle={() => setShowPassword(!showPassword)}
                />
              </Field>
              <Field label="Confirm password" id="org-confirm">
                <PasswordInput
                  id="org-confirm"
                  value={account.confirm}
                  onChange={(confirm) => setAccount({ ...account, confirm })}
                  placeholder="Type it again"
                  shown={showPassword}
                  onToggle={() => setShowPassword(!showPassword)}
                />
              </Field>
            </div>
            <div>
              <p className="field-label">Your role</p>
              <div className="flex flex-wrap gap-2">
                {roles.map((r) => (
                  <button key={r} type="button" className="chip h-10" data-active={account.role === r} onClick={() => setAccount({ ...account, role: r })}>
                    {r}
                  </button>
                ))}
              </div>
            </div>
          </Section>

          <Section number={2} title="Your venue" hint="Add the places you post for. You’ll only type this once and it fills in automatically when you submit events or specials.">
            {venueDrafts.map((draft, i) => (
              <VenueFields
                key={draft.key}
                draft={draft}
                index={i}
                venues={venues}
                takenIds={takenIds.filter((id) => id !== draft.claimedVenueId)}
                onChange={(d) => updateDraft(draft.key, d)}
                onRemove={i > 0 ? () => setVenueDrafts((prev) => prev.filter((v) => v.key !== draft.key)) : undefined}
                onLogoError={showError}
              />
            ))}
            <button type="button" onClick={() => setVenueDrafts((prev) => [...prev, emptyVenue()])} className="self-start text-[14px] font-medium text-link hover:underline">
              + Add another venue
            </button>
          </Section>

          <Section number={3} title="Accessibility" hint="Help people know what to expect before they arrive. This shows on your venue page and on every listing you post.">
            <div className="grid grid-cols-1 gap-3.5 sm:grid-cols-2">
              {accessibilityOptions.map((o) => (
                <Checkbox
                  key={o}
                  label={o}
                  checked={accessibility.includes(o)}
                  onChange={(v) => setAccessibility(v ? [...accessibility, o] : accessibility.filter((x) => x !== o))}
                />
              ))}
            </div>
            <Field label="Accessibility notes (optional)" id="a11y-notes">
              <textarea
                id="a11y-notes"
                rows={3}
                value={accessibilityNotes}
                onChange={(e) => setAccessibilityNotes(e.target.value)}
                placeholder="e.g., Ramp at the side door on Ontario St. Washroom is on the main floor."
                className="field"
              />
            </Field>
          </Section>

          <Section number={4} title="Confirm you’re connected to the venue" hint="We check every new organizer before their first listing goes up. Usually within 1–2 business days.">
            <div>
              <p className="field-label mb-1">How can we confirm?</p>
              <p className="field-hint mb-3">An email at the venue&rsquo;s website domain or an email listed on the website is fastest.</p>
              <div className="flex flex-wrap gap-2">
                <button type="button" className="chip h-10" data-active={confirmMethod === 'email'} onClick={() => setConfirmMethod('email')}>
                  Use my work email
                </button>
                <button type="button" className="chip h-10" data-active={confirmMethod === 'document'} onClick={() => setConfirmMethod('document')}>
                  Upload a document
                </button>
              </div>
              {confirmMethod === 'document' && (
                <div className="mt-4">
                  <Dropzone
                    accept="application/pdf,image/png,image/jpeg"
                    title="Drag a document here, or click to upload"
                    hint="A business licence, utility bill or letterhead with your name · PDF, JPG or PNG · max 3 MB"
                    fileLabel={verificationDoc?.name}
                    onSelect={async (file) => {
                      if (!['application/pdf', 'image/png', 'image/jpeg'].includes(file.type)) return showError('Your document needs to be a PDF, JPG or PNG.');
                      if (file.size > MAX_DOCUMENT_BYTES) return showError('Your document needs to be 3 MB or smaller.');
                      setVerificationDoc({ name: file.name, dataUrl: await readFileAsDataUrl(file) });
                    }}
                    onRemove={() => setVerificationDoc(null)}
                  />
                </div>
              )}
            </div>
            <Field label="Anything else we should know? (optional)" id="org-notes">
              <textarea id="org-notes" rows={3} value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="e.g., I book the bands for both of our locations." className="field" />
            </Field>
            <div className="flex flex-col gap-3">
              <Checkbox
                checked={agree}
                onChange={setAgree}
                label={
                  <span>
                    I agree to the{' '}
                    <Link href="/terms" target="_blank" className="font-bold text-link hover:underline" onClick={(e) => e.stopPropagation()}>
                      Terms of Service
                    </Link>{' '}
                    and{' '}
                    <Link href="/privacy" target="_blank" className="font-bold text-link hover:underline" onClick={(e) => e.stopPropagation()}>
                      Privacy Policy
                    </Link>
                    .
                  </span>
                }
              />
              {emailOptions.map((o) => (
                <Checkbox key={o.key} checked={!!emailPrefs[o.key]} onChange={(v) => setEmailPref(o.key, v)} label={`Email me: ${o.label}`} />
              ))}
            </div>
          </Section>

          {/* Repeated by the button, since that's where people are looking when they submit */}
          {error && <ErrorBanner message={error} className="mt-2" />}
          <div className="mt-2 flex flex-wrap items-center justify-between gap-4">
            <p className="text-[14px] text-ink-muted">
              Already have an account?{' '}
              <Link href="/login" className="font-bold text-link hover:underline">
                Sign in
              </Link>
            </p>
            <button type="submit" disabled={submitting || !agree} className="btn-sun h-[52px] px-7 text-[15px] disabled:cursor-not-allowed disabled:opacity-50">
              {submitting ? <Loader2 size={18} className="animate-spin" /> : 'Create organizer account →'}
            </button>
          </div>
        </div>

        <aside className="flex flex-col gap-4 lg:sticky lg:top-24 self-start w-full">
          <div className="card p-6">
            <p className="text-[18px] font-bold text-navy">How organizer accounts work</p>
            <ol className="mt-4 flex flex-col gap-4">
              {[
                ['Create your account', 'Add yourself and your venues once.'],
                ['We confirm you', 'Every new organizer is checked by our admin team, usually 1–2 business days.'],
                ['Post events & specials', 'Pick your venue and its details fill in automatically. Listings are reviewed before they go live.'],
              ].map(([t, d], i) => (
                <li key={t} className="flex gap-3">
                  <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-sky text-[13px] font-bold text-navy">{i + 1}</span>
                  <span>
                    <span className="block text-[14px] font-bold text-navy">{t}</span>
                    <span className="block text-[13px] leading-[1.45] text-ink-muted">{d}</span>
                  </span>
                </li>
              ))}
            </ol>
          </div>
          <div className="rounded-[22px] bg-navy p-6 text-white">
            <span className="tag bg-sun text-navy gap-1">
              <Check size={12} strokeWidth={3} /> Verified organizer
            </span>
            <p className="mt-4 text-[18px] font-bold">Skip the wait</p>
            <p className="mt-2 text-[13px] leading-[1.5] text-on-dark-muted">
              Request to become a Verified Organizer once your account is approved. Auto-publish your events and specials, without
              admin approval.
            </p>
          </div>
          <div className="rounded-[22px] bg-sky p-6">
            <p className="text-[18px] font-bold text-navy">Run more than one place?</p>
            <p className="mt-2 text-[13px] leading-[1.5] text-ink-muted">
              Add every venue you manage. When you post, just pick which one, and keep an eye on all your listings from My Events.
            </p>
          </div>
        </aside>
      </form>
    </div>
  );
}
