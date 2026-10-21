'use client';

import { useEffect, useState, type ReactNode } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  Mail,
  Lock,
  User,
  Store,
  Eye,
  EyeOff,
  Check,
  AlertCircle,
  Loader2,
  Gift,
  Send,
  Users,
  Bookmark,
  Circle,
} from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { useSignupEmailOptions } from '@/hooks/useEmailOptions';
import { Rings } from '@/components/brand';

function FeatureTile({ icon, title, body }: { icon: ReactNode; title: string; body: string }) {
  return (
    <div className="flex items-start gap-4 rounded-[18px] border border-white/10 bg-white/[0.06] p-5">
      <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-sun text-navy">{icon}</span>
      <div>
        <p className="text-[16px] font-bold text-white">{title}</p>
        <p className="mt-1 text-[13px] text-on-dark-muted">{body}</p>
      </div>
    </div>
  );
}

function RoleCard({
  selected,
  onClick,
  icon,
  title,
  body,
}: {
  selected: boolean;
  onClick: () => void;
  icon: ReactNode;
  title: string;
  body: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={selected}
      className={`relative flex flex-col items-start gap-2 rounded-[18px] p-4 text-left transition-colors ${
        selected ? 'border-2 border-navy bg-sky' : 'border border-line bg-white hover:border-navy/40'
      }`}
    >
      <span className="text-navy">{icon}</span>
      <span className="text-[17px] font-bold text-navy">{title}</span>
      <span className="text-[12px] text-ink-muted">{body}</span>
      <span
        className={`absolute right-4 top-4 flex h-[18px] w-[18px] items-center justify-center rounded-full ${
          selected ? 'bg-navy text-white' : 'border border-line'
        }`}
      >
        {selected && <Check size={11} strokeWidth={3} />}
      </span>
    </button>
  );
}

export default function RegisterPage() {
  const router = useRouter();
  const { register, user, resendVerificationEmail } = useAuth();
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [accountType, setAccountType] = useState<'user' | 'organizer'>('user');
  const [needsVerification, setNeedsVerification] = useState(false);
  const [registeredEmail, setRegisteredEmail] = useState('');
  const [resendingEmail, setResendingEmail] = useState(false);
  const [emailResent, setEmailResent] = useState(false);
  const [formData, setFormData] = useState({ name: '', email: '', password: '', agreeToTerms: false });
  const { options: emailOptions, prefs: emailPrefs, setPref: setEmailPref } = useSignupEmailOptions('user');

  useEffect(() => {
    if (user) router.push('/');
  }, [user, router]);

  if (user) return null;

  const passwordRequirements = [
    { label: 'At least 8 characters', met: formData.password.length >= 8 },
    { label: 'Contains a number', met: /\d/.test(formData.password) },
    { label: 'Contains an uppercase letter', met: /[A-Z]/.test(formData.password) },
  ];

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (accountType === 'organizer') {
      router.push('/become-organizer');
      return;
    }

    if (!passwordRequirements.every((r) => r.met)) {
      setError('Please meet all password requirements');
      return;
    }
    if (!formData.agreeToTerms) {
      setError('You must agree to the terms and conditions');
      return;
    }

    setIsLoading(true);
    const result = await register({
      name: formData.name,
      email: formData.email,
      password: formData.password,
      role: 'user',
      emailPreferences: emailPrefs,
    });
    if (result.success) {
      if (result.needsVerification) {
        setNeedsVerification(true);
        setRegisteredEmail(formData.email);
      } else {
        router.push('/');
      }
    } else {
      setError(result.error || 'Registration failed');
    }
    setIsLoading(false);
  };

  return (
    <div className="grid min-h-[calc(100vh-64px)] grid-cols-1 lg:grid-cols-[39%_61%]">
      {/* Panel */}
      <div className="relative hidden overflow-hidden bg-navy px-12 py-16 lg:block">
        <p className="eyebrow !text-sun">— Join us</p>
        <h2 className="display-md !text-white mt-5">
          Be part of
          <br />
          what&rsquo;s
          <br />
          happening
        </h2>
        <div className="relative z-10 mt-8 flex max-w-[400px] flex-col gap-4">
          <FeatureTile icon={<Gift size={15} />} title="Free for everyone" body="No cost to browse, save or submit events." />
          {accountType === 'organizer' ? (
            <>
              <FeatureTile icon={<Send size={15} />} title="Easy event submission" body="Get your events live after a quick review." />
              <FeatureTile icon={<Users size={15} />} title="Reach local audiences" body="Put your venue in front of Kingston every day." />
            </>
          ) : (
            <FeatureTile icon={<Bookmark size={15} />} title="Browse and save events" body="Get notified of events you’ve saved." />
          )}
        </div>
        <Rings className="pointer-events-none absolute -bottom-48 -left-56 w-[440px]" />
      </div>

      {/* Form */}
      <div className="flex items-start justify-center px-4 py-14 sm:px-8 lg:items-center">
        <div className="w-full max-w-[460px]">
          <p className="eyebrow mb-3.5">— Create account</p>
          <h1 className="display-section">
            Get
            <br />
            started
          </h1>

          {needsVerification ? (
            <div className="mt-8 rounded-[22px] bg-sky p-6">
              <div className="flex items-start gap-3">
                <Mail size={22} className="mt-0.5 shrink-0 text-link" />
                <div>
                  <p className="text-[18px] font-bold text-navy">Verify your email</p>
                  <p className="mt-2 text-[14px] text-ink-muted">
                    We&rsquo;ve sent a verification email to <strong className="text-navy">{registeredEmail}</strong>. Click
                    the link inside to activate your account, then sign in.
                  </p>
                  <div className="mt-5 flex flex-wrap gap-2.5">
                    <button
                      type="button"
                      onClick={async () => {
                        setResendingEmail(true);
                        setEmailResent(false);
                        const result = await resendVerificationEmail(registeredEmail);
                        if (result.success) {
                          setEmailResent(true);
                          setError('');
                        } else {
                          setError(result.error || 'Failed to resend email');
                        }
                        setResendingEmail(false);
                      }}
                      disabled={resendingEmail}
                      className="btn-navy btn-sm"
                    >
                      {resendingEmail ? <Loader2 size={14} className="animate-spin" /> : null}
                      Resend email
                    </button>
                    <Link href="/login" className="btn-outline btn-sm">
                      Go to sign in
                    </Link>
                  </div>
                  {emailResent && <p className="mt-3 text-[12px] font-medium text-success">Verification email sent!</p>}
                  {error && <p className="mt-3 text-[12px] font-medium text-danger">{error}</p>}
                </div>
              </div>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="mt-6 flex flex-col gap-4">
              <div>
                <p className="field-label">I am...</p>
                <div className="grid grid-cols-2 gap-2.5">
                  <RoleCard
                    selected={accountType === 'user'}
                    onClick={() => setAccountType('user')}
                    icon={<User size={18} />}
                    title="Event-goer"
                    body="Browse and save events"
                  />
                  <RoleCard
                    selected={accountType === 'organizer'}
                    onClick={() => setAccountType('organizer')}
                    icon={<Store size={18} />}
                    title="Organizer"
                    body="Post events & specials"
                  />
                </div>
              </div>

              {error && (
                <div className="flex items-start gap-3 rounded-[14px] bg-danger-tint p-4 text-[14px] text-danger">
                  <AlertCircle size={18} className="mt-0.5 shrink-0" />
                  <p>{error}</p>
                </div>
              )}

              {accountType === 'organizer' ? (
                <p className="text-[13px] leading-[1.5] text-navy">
                  To own an Organizer account, you must be associated with a restaurant/venue or be an event coordinator.
                  You can create an account to be approved by the Admin (1–2 business days).
                </p>
              ) : (
                <>
                  <div>
                    <label htmlFor="name" className="field-label">
                      Your name
                    </label>
                    <div className="relative">
                      <User size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-link" />
                      <input
                        id="name"
                        required
                        value={formData.name}
                        onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                        placeholder="John Doe"
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
                      <input
                        id="email"
                        type="email"
                        required
                        value={formData.email}
                        onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                        placeholder="you@example.com"
                        className="field field-with-icon"
                      />
                    </div>
                  </div>
                  <div>
                    <div className="mb-2 flex flex-wrap items-center justify-between gap-x-4 gap-y-1">
                      <label htmlFor="password" className="text-[13px] font-bold text-navy">
                        Password
                      </label>
                      <div className="flex flex-wrap gap-x-3 gap-y-1">
                        {passwordRequirements.map((r) => (
                          <span
                            key={r.label}
                            className={`flex items-center gap-1 text-[11px] ${r.met ? 'text-navy' : 'text-ink-muted'}`}
                          >
                            {r.met ? <Check size={11} className="text-success" strokeWidth={3} /> : <Circle size={8} />}
                            {r.label}
                          </span>
                        ))}
                      </div>
                    </div>
                    <div className="relative">
                      <Lock size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-link" />
                      <input
                        id="password"
                        type={showPassword ? 'text' : 'password'}
                        required
                        value={formData.password}
                        onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                        placeholder="••••••••"
                        className="field field-with-icon pr-12"
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute right-4 top-1/2 -translate-y-1/2 text-ink-muted hover:text-navy"
                        aria-label={showPassword ? 'Hide password' : 'Show password'}
                      >
                        {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                      </button>
                    </div>
                  </div>
                  <label className="flex cursor-pointer items-center gap-2.5 text-[13px] text-navy">
                    <button
                      type="button"
                      role="checkbox"
                      aria-checked={formData.agreeToTerms}
                      onClick={() => setFormData({ ...formData, agreeToTerms: !formData.agreeToTerms })}
                      className={`flex h-[18px] w-[18px] shrink-0 items-center justify-center rounded-[5px] border-[1.5px] ${
                        formData.agreeToTerms ? 'border-navy bg-navy text-white' : 'border-line bg-white'
                      }`}
                    >
                      {formData.agreeToTerms && <Check size={12} strokeWidth={3} />}
                    </button>
                    <span>
                      I agree to the{' '}
                      <Link href="/terms" className="hover:underline">
                        Terms of Service
                      </Link>{' '}
                      and{' '}
                      <Link href="/privacy" className="hover:underline">
                        Privacy Policy
                      </Link>
                    </span>
                  </label>
                  {emailOptions.map((o) => (
                    <label key={o.key} className="flex cursor-pointer items-center gap-2.5 text-[13px] text-navy">
                      <button
                        type="button"
                        role="checkbox"
                        aria-checked={!!emailPrefs[o.key]}
                        onClick={() => setEmailPref(o.key, !emailPrefs[o.key])}
                        className={`flex h-[18px] w-[18px] shrink-0 items-center justify-center rounded-[5px] border-[1.5px] ${
                          emailPrefs[o.key] ? 'border-navy bg-navy text-white' : 'border-line bg-white'
                        }`}
                      >
                        {emailPrefs[o.key] && <Check size={12} strokeWidth={3} />}
                      </button>
                      <span>Email me: {o.label}</span>
                    </label>
                  ))}
                </>
              )}

              <button type="submit" disabled={isLoading} className="btn-sun mt-1 h-12 w-full text-[15px]">
                {isLoading ? <Loader2 size={18} className="animate-spin" /> : 'Create account →'}
              </button>
            </form>
          )}

          <p className="mt-6 text-center text-[13px] text-ink-muted">
            Already have an account?{' '}
            <Link href="/login" className="font-bold text-link hover:underline">
              Sign in
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
