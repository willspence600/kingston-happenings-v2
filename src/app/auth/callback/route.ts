import { NextRequest, NextResponse } from 'next/server';
import { createServerClient, type CookieOptions } from '@supabase/ssr';
import { cookies } from 'next/headers';
import type { EmailOtpType } from '@supabase/supabase-js';

export async function GET(request: NextRequest) {
  const requestUrl = new URL(request.url);
  const code = requestUrl.searchParams.get('code');
  const tokenHash = requestUrl.searchParams.get('token_hash');
  const type = requestUrl.searchParams.get('type') as EmailOtpType | null;
  const linkError = requestUrl.searchParams.get('error_description') || requestUrl.searchParams.get('error');

  const toLogin = (params: Record<string, string>) => {
    const url = new URL('/login', requestUrl.origin);
    Object.entries(params).forEach(([k, v]) => url.searchParams.set(k, v));
    return NextResponse.redirect(url);
  };

  // Supabase sends people back with ?error= when the link is expired or already used
  if (linkError) {
    return toLogin({ error: 'That confirmation link has expired or was already used. Try signing in, or sign up again to get a new link.' });
  }

  if (code || (tokenHash && type)) {
    const cookieStore = await cookies();
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          get(name: string) {
            return cookieStore.get(name)?.value;
          },
          set(name: string, value: string, options: CookieOptions) {
            try {
              cookieStore.set({ name, value, ...options });
            } catch (error) {
              // The `set` method was called from a Server Component.
              // This can be ignored if you have middleware refreshing
              // user sessions.
            }
          },
          remove(name: string, options: CookieOptions) {
            try {
              cookieStore.set({ name, value: '', ...options });
            } catch (error) {
              // The `delete` method was called from a Server Component.
              // This can be ignored if you have middleware refreshing
              // user sessions.
            }
          },
        },
      }
    );

    // token_hash links (custom email template) are verified here; ?code= links were already
    // verified by Supabase, and only need exchanging for a session
    const { error } = tokenHash && type
      ? await supabase.auth.verifyOtp({ token_hash: tokenHash, type })
      : await supabase.auth.exchangeCodeForSession(code!);

    if (!error) {
      // Email confirmed successfully - redirect to home
      return NextResponse.redirect(new URL('/', requestUrl.origin));
    }

    // A ?code= link means Supabase already confirmed the email. The exchange fails when the
    // link is opened in a different browser than the one used to sign up, so just ask them to sign in.
    if (code) {
      console.warn('[Auth callback] Code exchange failed after confirmation:', error.message);
      return toLogin({ confirmed: '1' });
    }
    console.error('[Auth callback] Email verification failed:', error.message);
  }

  return toLogin({ error: 'Email verification failed. Try signing in, or sign up again to get a new link.' });
}
