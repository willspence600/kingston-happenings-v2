import { NextRequest, NextResponse } from 'next/server';
import { createSupabaseServerClient } from '@/lib/supabaseServer';
import { getCurrentUser } from '@/lib/auth';
import { getEmailOptions, readEmailPreferences } from '@/lib/siteSettings';
import { optionsFor } from '@/lib/siteContent';

// GET /api/user/email-preferences - The email options this account can choose, and their choices
export async function GET() {
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase.auth.getUser();
  const user = await getCurrentUser();
  if (error || !data.user || !user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  const options = optionsFor(await getEmailOptions(), user.role);
  const metadata = data.user.user_metadata || {};
  const application = (metadata.organizerApplication || {}) as { submittedAt?: string };
  return NextResponse.json({
    options,
    preferences: readEmailPreferences(metadata, options),
    // When they accepted the Terms of Service and Privacy Policy (on sign-up)
    agreedToTermsAt: metadata.agreedToTermsAt || application.submittedAt || data.user.created_at,
  });
}

// PUT /api/user/email-preferences - { [optionKey]: boolean }
export async function PUT(request: NextRequest) {
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase.auth.getUser();
  const user = await getCurrentUser();
  if (error || !data.user || !user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const body = await request.json();
  const options = optionsFor(await getEmailOptions(), user.role);
  const metadata = data.user.user_metadata || {};
  // Keep choices for options that aren't shown right now, in case they come back
  const preferences: Record<string, unknown> = { ...(metadata.emailPreferences || {}), ...readEmailPreferences(metadata, options) };
  for (const o of options) {
    if (typeof body[o.key] === 'boolean') preferences[o.key] = body[o.key];
  }

  const { error: updateError } = await supabase.auth.updateUser({ data: { emailPreferences: preferences } });
  if (updateError) {
    return NextResponse.json({ error: updateError.message }, { status: 400 });
  }
  return NextResponse.json({ options, preferences: readEmailPreferences({ ...metadata, emailPreferences: preferences }, options) });
}
