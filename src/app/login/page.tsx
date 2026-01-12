'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Mail, Lock, LogIn, Eye, EyeOff, AlertCircle } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';

export default function LoginPage() {
  const router = useRouter();
  const { login, user, isLoading: authLoading } = useAuth();
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    rememberMe: false,
  });

  // Redirect if already logged in
  useEffect(() => {
    if (!authLoading && user) {
      router.push('/');
    }
  }, [user, authLoading, router]);

  // Show login form even while auth is loading (after a short delay)
  // This prevents the page from being stuck if auth initialization hangs
  const [showForm, setShowForm] = useState(false);
  
  useEffect(() => {
    // Show form after 1 second, or immediately if auth is done loading
    if (!authLoading) {
      setShowForm(true);
    } else {
      const timer = setTimeout(() => {
        setShowForm(true);
      }, 1000);
      return () => clearTimeout(timer);
    }
  }, [authLoading]);

  // If user is logged in and we've confirmed, don't show form
  if (user && !authLoading) {
    return null;
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);

    try {
      const result = await login(formData.email, formData.password);
      
      if (result.success) {
        // Login successful - wait a moment for auth state to update, then redirect
        // Use a more reliable approach: check session directly and redirect
        let redirectAttempted = false;
        
        const checkAndRedirect = async () => {
          // Give the auth state change handler a moment to update
          await new Promise(resolve => setTimeout(resolve, 1000));
          
          if (!redirectAttempted) {
            redirectAttempted = true;
            setIsLoading(false);
            // Redirect regardless - if user is logged in, it will work
            router.push('/');
            router.refresh(); // Force a refresh to get fresh auth state
          }
        };
        
        checkAndRedirect();
        
        // Safety timeout - if redirect hasn't happened in 3 seconds, force it
        setTimeout(() => {
          if (!redirectAttempted) {
            redirectAttempted = true;
            setIsLoading(false);
            router.push('/');
            router.refresh();
          }
        }, 3000);
      } else {
        setError(result.error || 'Login failed');
        setIsLoading(false);
      }
    } catch (error) {
      console.error('Login error:', error);
      setError('An unexpected error occurred. Please try again.');
      setIsLoading(false);
    }
  };

  if (!showForm && authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-primary/30 border-t-primary rounded-full animate-spin mx-auto mb-4" />
          <p className="text-muted-foreground">Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex">
      {/* Left side - Form */}
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
            Welcome back
          </h1>
          <p className="text-muted-foreground mb-8">
            Sign in to your account to manage your events.
          </p>

          {/* Error Message */}
          {error && (
            <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-xl flex items-center gap-3 text-red-700">
              <AlertCircle size={20} />
              <p className="text-sm">{error}</p>
            </div>
          )}

          {/* Admin Account Info */}
          <div className="mb-6 p-4 bg-blue-50 border border-blue-200 rounded-xl">
            <p className="text-sm text-blue-700 font-medium mb-1">Admin Access</p>
            <p className="text-sm text-blue-600">
              Admin account: admin@kingstonhappenings.ca<br />
              <span className="text-xs">(Contact administrator for access)</span>
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6">
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
              <div className="relative">
                <Lock size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground" />
                <input
                  type={showPassword ? 'text' : 'password'}
                  id="password"
                  required
                  value={formData.password}
                  onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                  placeholder="••••••••"
                  className="w-full pl-11 pr-12 py-3 bg-card border border-border rounded-xl focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary"
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

            <div className="flex items-center justify-between">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={formData.rememberMe}
                  onChange={(e) => setFormData({ ...formData, rememberMe: e.target.checked })}
                  className="w-4 h-4 rounded border-border text-primary focus:ring-primary"
                />
                <span className="text-sm text-muted-foreground">Remember me</span>
              </label>
              <Link href="/forgot-password" className="text-sm text-primary hover:underline">
                Forgot password?
              </Link>
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className="w-full flex items-center justify-center gap-2 px-6 py-3 bg-primary text-primary-foreground rounded-xl font-medium hover:opacity-90 transition-opacity disabled:opacity-50"
            >
              {isLoading ? (
                <div className="w-5 h-5 border-2 border-primary-foreground/30 border-t-primary-foreground rounded-full animate-spin" />
              ) : (
                <>
                  <LogIn size={18} />
                  Sign In
                </>
              )}
            </button>
          </form>

          <p className="mt-8 text-center text-muted-foreground">
            Don&apos;t have an account?{' '}
            <Link href="/register" className="text-primary hover:underline font-medium">
              Sign up
            </Link>
          </p>
        </div>
      </div>

      {/* Right side - Decorative */}
      <div className="hidden lg:flex lg:flex-1 bg-gradient-to-br from-secondary via-secondary/95 to-primary/80 text-white p-12 items-center justify-center">
        <div className="max-w-md text-center">
          <h2 className="font-display text-4xl mb-4">
            Join Kingston&apos;s Event Community
          </h2>
          <p className="text-white/80 text-lg mb-8">
            Create an account to submit events, save your favorites, and stay 
            updated on what&apos;s happening in the Limestone City.
          </p>
          <div className="grid grid-cols-2 gap-4 text-left">
            <div className="bg-white/10 backdrop-blur-sm rounded-xl p-4">
              <p className="font-medium mb-1">For Venues</p>
              <p className="text-sm text-white/70">Post and manage your events easily</p>
            </div>
            <div className="bg-white/10 backdrop-blur-sm rounded-xl p-4">
              <p className="font-medium mb-1">For Event-Goers</p>
              <p className="text-sm text-white/70">Save events and get reminders</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
