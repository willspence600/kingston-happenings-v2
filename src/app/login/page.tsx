'use client';

import { useState, useEffect, Suspense } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { Mail, Lock, Eye, EyeOff, AlertCircle, Bookmark, Store, Check } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { Rings } from '@/components/brand';

function safeRedirect(path: string | null) {
  return path && path.startsWith('/') && !path.startsWith('//') ? path : '/';
}

function LoginContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const redirectTo = safeRedirect(searchParams.get('redirect'));
  const { login, user, isLoading: authLoading } = useAuth();
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  // The email confirmation callback sends people here with ?confirmed=1 or ?error=
  const [error, setError] = useState(() => searchParams.get('error') || '');
  const justConfirmed = searchParams.get('confirmed') === '1';
  const [formData, setFormData] = useState({ email: '', password: '', rememberMe: true });

  useEffect(() => {
    if (!authLoading && user) router.push(redirectTo);
  }, [user, authLoading, router, redirectTo]);

  // Show the form even while auth is loading (after a short delay) so the page can't hang
  const [showForm, setShowForm] = useState(false);
  useEffect(() => {
    if (!authLoading) {
      setShowForm(true);
    } else {
      const timer = setTimeout(() => setShowForm(true), 1000);
      return () => clearTimeout(timer);
    }
  }, [authLoading]);

  if (user && !authLoading) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);
    try {
      const result = await login(formData.email, formData.password);
      if (result.success) {
        let redirectAttempted = false;
        const go = () => {
          if (redirectAttempted) return;
          redirectAttempted = true;
          setIsLoading(false);
          router.push(redirectTo);
          router.refresh();
        };
        // Give the auth state change handler a moment to update, with a safety timeout
        setTimeout(go, 1000);
        setTimeout(go, 3000);
      } else {
        setError(result.error || 'Login failed');
        setIsLoading(false);
      }
    } catch (err) {
      console.error('Login error:', err);
      setError('An unexpected error occurred. Please try again.');
      setIsLoading(false);
    }
  };

  if (!showForm && authLoading) {
    return (
      <div className="flex min-h-[70vh] items-center justify-center">
        <div className="h-10 w-10 animate-spin rounded-full border-4 border-sky border-t-navy" />
      </div>
    );
  }

  return (
    <div className="grid min-h-[calc(100vh-64px)] grid-cols-1 lg:grid-cols-[57%_43%]">
      {/* Form */}
      <div className="flex items-center justify-center px-4 py-16 sm:px-8">
        <div className="w-full max-w-[440px]">
          <p className="eyebrow mb-3.5">— Sign in</p>
          <h1 className="display-section">
            Welcome
            <br />
            back
          </h1>
          <p className="mt-5 text-[15px] leading-[1.5] text-ink-muted">
            Sign in to see your saved events and manage your submissions.
          </p>

          {justConfirmed && !error && (
            <div className="mt-6 flex items-start gap-3 rounded-[14px] bg-success-tint p-4 text-[14px] text-success">
              <Check size={18} className="mt-0.5 shrink-0" />
              <p>Your email is confirmed. Sign in to continue.</p>
            </div>
          )}
          {error && (
            <div className="mt-6 flex items-start gap-3 rounded-[14px] bg-danger-tint p-4 text-[14px] text-danger">
              <AlertCircle size={18} className="mt-0.5 shrink-0" />
              <p>{error}</p>
            </div>
          )}

          <form onSubmit={handleSubmit} className="mt-6 flex flex-col gap-4">
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
              <label htmlFor="password" className="field-label">
                Password
              </label>
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

            <div className="flex items-center justify-between">
              <label className="flex cursor-pointer items-center gap-2.5 text-[13px] text-navy">
                <button
                  type="button"
                  role="checkbox"
                  aria-checked={formData.rememberMe}
                  onClick={() => setFormData({ ...formData, rememberMe: !formData.rememberMe })}
                  className={`flex h-[18px] w-[18px] items-center justify-center rounded-[5px] border-[1.5px] ${
                    formData.rememberMe ? 'border-navy bg-navy text-white' : 'border-line bg-white'
                  }`}
                >
                  {formData.rememberMe && <Check size={12} strokeWidth={3} />}
                </button>
                Remember me
              </label>
              <Link href="/forgot-password" className="text-[13px] font-medium text-link hover:underline">
                Forgot password?
              </Link>
            </div>

            <button type="submit" disabled={isLoading} className="btn-sun mt-2 h-12 w-full text-[15px]">
              {isLoading ? (
                <span className="h-5 w-5 animate-spin rounded-full border-2 border-navy/30 border-t-navy" />
              ) : (
                'Sign in →'
              )}
            </button>
          </form>

          <p className="mt-6 text-center text-[13px] text-ink-muted">
            New to Kingston Happenings?{' '}
            <Link href="/register" className="font-bold text-link hover:underline">
              Create an account
            </Link>
          </p>
        </div>
      </div>

      {/* Panel */}
      <div className="relative hidden overflow-hidden bg-navy lg:flex lg:flex-col lg:justify-center lg:px-14">
        <Rings className="pointer-events-none absolute -right-40 -top-56 w-[620px] opacity-90" />
        <div className="relative max-w-[460px]">
          <h2 className="display-md !text-white">
            See what makes
            <br />
            your city a home
          </h2>
          <div className="mt-8 flex flex-col gap-4">
            {[
              { icon: <Store size={15} />, title: 'For venues', body: 'Post and manage your events and specials easily.' },
              { icon: <Bookmark size={15} />, title: 'For event-goers', body: 'Save events and get reminders before they start.' },
            ].map((f) => (
              <div key={f.title} className="flex items-start gap-4 rounded-[18px] border border-white/10 bg-white/[0.06] p-5">
                <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-sun text-navy">{f.icon}</span>
                <div>
                  <p className="text-[16px] font-bold text-white">{f.title}</p>
                  <p className="mt-1 text-[13px] text-on-dark-muted">{f.body}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={null}>
      <LoginContent />
    </Suspense>
  );
}
