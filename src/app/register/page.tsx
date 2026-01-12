'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Mail, Lock, User, Building2, Eye, EyeOff, UserPlus, Check, AlertCircle, Loader2 } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';

export default function RegisterPage() {
  const router = useRouter();
  const { register, user, resendVerificationEmail } = useAuth();
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [passwordError, setPasswordError] = useState(false);
  const [accountType, setAccountType] = useState<'user' | 'organizer'>('user');
  const [needsVerification, setNeedsVerification] = useState(false);
  const [registeredEmail, setRegisteredEmail] = useState('');
  const [resendingEmail, setResendingEmail] = useState(false);
  const [emailResent, setEmailResent] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
    venueName: '',
    agreeToTerms: false,
  });

  // Redirect if already logged in
  if (user) {
    router.push('/');
    return null;
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setPasswordError(false);

    // Validate password requirements
    const passwordValid = 
      formData.password.length >= 8 && 
      /\d/.test(formData.password) && 
      /[A-Z]/.test(formData.password);

    if (!passwordValid) {
      setPasswordError(true);
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
      role: accountType,
      venueName: accountType === 'organizer' ? formData.venueName : undefined,
    });
    
    if (result.success) {
      if (result.needsVerification) {
        // Email verification required
        setNeedsVerification(true);
        setRegisteredEmail(formData.email);
      } else {
        // Email already verified (shouldn't happen in normal flow, but handle it)
        router.push('/');
      }
    } else {
      setError(result.error || 'Registration failed');
    }
    
    setIsLoading(false);
  };

  const passwordRequirements = [
    { label: 'At least 8 characters', met: formData.password.length >= 8 },
    { label: 'Contains a number', met: /\d/.test(formData.password) },
    { label: 'Contains uppercase letter', met: /[A-Z]/.test(formData.password) },
  ];

  return (
    <div className="min-h-screen flex">
      {/* Left side - Decorative */}
      <div className="hidden lg:flex lg:flex-1 bg-gradient-to-br from-primary via-primary/90 to-accent/80 text-white p-12 items-center justify-center">
        <div className="max-w-md text-center">
          <h2 className="font-display text-4xl mb-4">
            Welcome to Kingston Happenings
          </h2>
          <p className="text-white/80 text-lg mb-8">
            Join hundreds of venues and thousands of event-goers in Kingston&apos;s 
            premier event discovery platform.
          </p>
          <div className="space-y-4 text-left">
            <div className="flex items-start gap-3 bg-white/10 backdrop-blur-sm rounded-xl p-4">
              <Check className="text-white mt-0.5 flex-shrink-0" size={20} />
              <div>
                <p className="font-medium mb-0.5">Free for Everyone</p>
                <p className="text-sm text-white/70">No cost to browse or submit events</p>
              </div>
            </div>
            <div className="flex items-start gap-3 bg-white/10 backdrop-blur-sm rounded-xl p-4">
              <Check className="text-white mt-0.5 flex-shrink-0" size={20} />
              <div>
                <p className="font-medium mb-0.5">Easy Event Submission</p>
                <p className="text-sm text-white/70">Get your events live after admin approval</p>
              </div>
            </div>
            <div className="flex items-start gap-3 bg-white/10 backdrop-blur-sm rounded-xl p-4">
              <Check className="text-white mt-0.5 flex-shrink-0" size={20} />
              <div>
                <p className="font-medium mb-0.5">Reach Local Audiences</p>
                <p className="text-sm text-white/70">Connect with Kingston&apos;s event community</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Right side - Form */}
      <div className="flex-1 flex items-center justify-center px-4 sm:px-6 lg:px-8 py-12">
        <div className="w-full max-w-md">
          {/* Logo */}
          <Link href="/" className="flex items-center gap-2 mb-8">
            <div className="w-10 h-10 rounded-xl bg-primary flex items-center justify-center">
              <span className="text-primary-foreground font-display text-xl">K</span>
            </div>
            <div>
              <span className="font-display text-xl text-foreground">Kingston</span>
              <span className="font-display text-xl text-primary ml-1">Happenings</span>
            </div>
          </Link>

          <h1 className="font-display text-3xl text-foreground mb-2">
            Create an account
          </h1>
          <p className="text-muted-foreground mb-8">
            Join Kingston&apos;s event community today.
          </p>

          {/* Email Verification Message */}
          {needsVerification && (
            <div className="mb-6 p-6 bg-blue-50 border border-blue-200 rounded-xl">
              <div className="flex items-start gap-3 mb-4">
                <Mail size={24} className="text-blue-600 flex-shrink-0 mt-0.5" />
                <div className="flex-1">
                  <h3 className="font-semibold text-blue-900 mb-2">Verify Your Email</h3>
                  <p className="text-sm text-blue-700 mb-4">
                    We&apos;ve sent a verification email to <strong>{registeredEmail}</strong>. 
                    Please check your inbox and click the verification link to activate your account.
                  </p>
                  <p className="text-xs text-blue-600 mb-4">
                    Once you verify your email, you&apos;ll be able to sign in and use the webapp.
                  </p>
                  <div className="flex gap-3">
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
                      className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                    >
                      {resendingEmail ? (
                        <>
                          <Loader2 size={16} className="animate-spin" />
                          Sending...
                        </>
                      ) : (
                        'Resend Verification Email'
                      )}
                    </button>
                    <Link
                      href="/login"
                      className="px-4 py-2 border border-blue-300 text-blue-700 rounded-lg text-sm font-medium hover:bg-blue-100 transition-colors"
                    >
                      Go to Login
                    </Link>
                  </div>
                  {emailResent && (
                    <p className="text-xs text-green-600 mt-3">
                      Verification email sent! Please check your inbox.
                    </p>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Error Message */}
          {error && !needsVerification && (
            <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-xl flex items-center gap-3 text-red-700">
              <AlertCircle size={20} />
              <p className="text-sm">{error}</p>
            </div>
          )}

          {/* Hide form if verification is needed */}
          {!needsVerification && (
            <>
          {/* Account Type Selector */}
          <div className="flex gap-4 mb-8">
            <button
              type="button"
              onClick={() => setAccountType('user')}
              className={`flex-1 p-4 rounded-xl border-2 transition-all ${
                accountType === 'user'
                  ? 'border-primary bg-primary/5'
                  : 'border-border hover:border-primary/50'
              }`}
            >
              <User size={24} className={accountType === 'user' ? 'text-primary' : 'text-muted-foreground'} />
              <p className={`font-medium mt-2 ${accountType === 'user' ? 'text-foreground' : 'text-muted-foreground'}`}>
                Event-Goer
              </p>
              <p className="text-xs text-muted-foreground mt-1">
                Discover and save events
              </p>
            </button>
            <button
              type="button"
              onClick={() => setAccountType('organizer')}
              className={`flex-1 p-4 rounded-xl border-2 transition-all ${
                accountType === 'organizer'
                  ? 'border-primary bg-primary/5'
                  : 'border-border hover:border-primary/50'
              }`}
            >
              <Building2 size={24} className={accountType === 'organizer' ? 'text-primary' : 'text-muted-foreground'} />
              <p className={`font-medium mt-2 ${accountType === 'organizer' ? 'text-foreground' : 'text-muted-foreground'}`}>
                Organizer
              </p>
              <p className="text-xs text-muted-foreground mt-1">
                Post and manage events
              </p>
            </button>
          </div>

          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label htmlFor="name" className="block text-sm font-medium text-foreground mb-2">
                Full Name
              </label>
              <div className="relative">
                <User size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground" />
                <input
                  type="text"
                  id="name"
                  required
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="John Doe"
                  className="w-full pl-11 pr-4 py-3 bg-card border border-border rounded-xl focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary"
                />
              </div>
            </div>

            {accountType === 'organizer' && (
              <div>
                <label htmlFor="venueName" className="block text-sm font-medium text-foreground mb-2">
                  Venue / Organization Name
                </label>
                <div className="relative">
                  <Building2 size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground" />
                  <input
                    type="text"
                    id="venueName"
                    required={accountType === 'organizer'}
                    value={formData.venueName}
                    onChange={(e) => setFormData({ ...formData, venueName: e.target.value })}
                    placeholder="The Ale House"
                    className="w-full pl-11 pr-4 py-3 bg-card border border-border rounded-xl focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary"
                  />
                </div>
              </div>
            )}

            <div>
              <label htmlFor="email" className="block text-sm font-medium text-foreground mb-2">
                Email Address
              </label>
              <div className="relative">
                <Mail size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground" />
                <input
                  type="email"
                  id="email"
                  required
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  placeholder="you@example.com"
                  className="w-full pl-11 pr-4 py-3 bg-card border border-border rounded-xl focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary"
                />
              </div>
            </div>

            <div>
              <label htmlFor="password" className="block text-sm font-medium text-foreground mb-2">
                Password
              </label>
              
              {/* Password requirements - always visible above input */}
              <div className={`mb-3 p-3 rounded-lg ${passwordError ? 'bg-red-50 border border-red-200' : 'bg-muted'}`}>
                <p className={`text-xs font-medium mb-2 ${passwordError ? 'text-red-700' : 'text-muted-foreground'}`}>
                  Password must contain:
                </p>
                <div className="space-y-1">
                  {passwordRequirements.map((req) => (
                    <p
                      key={req.label}
                      className={`text-xs flex items-center gap-1.5 ${
                        req.met 
                          ? 'text-green-600' 
                          : passwordError 
                            ? 'text-red-600' 
                            : 'text-muted-foreground'
                      }`}
                    >
                      <span className={`w-4 h-4 rounded-full flex items-center justify-center ${
                        req.met 
                          ? 'bg-green-100' 
                          : passwordError 
                            ? 'bg-red-100' 
                            : 'bg-muted-foreground/20'
                      }`}>
                        {req.met ? (
                          <Check size={10} className="text-green-600" />
                        ) : (
                          <span className={`w-1.5 h-1.5 rounded-full ${passwordError ? 'bg-red-400' : 'bg-muted-foreground/50'}`} />
                        )}
                      </span>
                      {req.label}
                    </p>
                  ))}
                </div>
              </div>

              <div className="relative">
                <Lock size={18} className={`absolute left-4 top-1/2 -translate-y-1/2 ${passwordError ? 'text-red-400' : 'text-muted-foreground'}`} />
                <input
                  type={showPassword ? 'text' : 'password'}
                  id="password"
                  required
                  value={formData.password}
                  onChange={(e) => {
                    setFormData({ ...formData, password: e.target.value });
                    setPasswordError(false); // Clear error when user types
                  }}
                  placeholder="••••••••"
                  className={`w-full pl-11 pr-12 py-3 bg-card border rounded-xl focus:outline-none focus:ring-2 transition-colors ${
                    passwordError 
                      ? 'border-red-500 focus:ring-red-200 focus:border-red-500' 
                      : 'border-border focus:ring-primary/50 focus:border-primary'
                  }`}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                >
                  {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
            </div>

            <label className="flex items-start gap-3 cursor-pointer">
              <input
                type="checkbox"
                checked={formData.agreeToTerms}
                onChange={(e) => setFormData({ ...formData, agreeToTerms: e.target.checked })}
                required
                className="w-4 h-4 mt-0.5 rounded border-border text-primary focus:ring-primary"
              />
              <span className="text-sm text-muted-foreground">
                I agree to the{' '}
                <Link href="/terms" className="text-primary hover:underline">Terms of Service</Link>
                {' '}and{' '}
                <Link href="/privacy" className="text-primary hover:underline">Privacy Policy</Link>
              </span>
            </label>

            <button
              type="submit"
              disabled={isLoading}
              className="w-full flex items-center justify-center gap-2 px-6 py-3 bg-primary text-primary-foreground rounded-xl font-medium hover:opacity-90 transition-opacity disabled:opacity-50"
            >
              {isLoading ? (
                <div className="w-5 h-5 border-2 border-primary-foreground/30 border-t-primary-foreground rounded-full animate-spin" />
              ) : (
                <>
                  <UserPlus size={18} />
                  Create Account
                </>
              )}
            </button>
          </form>
          </>
          )}

          <p className="mt-8 text-center text-muted-foreground">
            Already have an account?{' '}
            <Link href="/login" className="text-primary hover:underline font-medium">
              Sign in
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
