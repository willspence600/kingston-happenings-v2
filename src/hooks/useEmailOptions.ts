'use client';

import { useEffect, useState } from 'react';
import { DEFAULT_EMAIL_OPTIONS, optionsFor, type EmailOption } from '@/lib/siteContent';

/**
 * The email options an account of this role can opt into (set by admins), and a
 * preferences map pre-filled with each option's sign-up default.
 */
export function useSignupEmailOptions(role: 'user' | 'organizer') {
  const [options, setOptions] = useState<EmailOption[]>(() => optionsFor(DEFAULT_EMAIL_OPTIONS, role));
  const [prefs, setPrefs] = useState<Record<string, boolean>>(() =>
    Object.fromEntries(optionsFor(DEFAULT_EMAIL_OPTIONS, role).map((o) => [o.key, o.defaultOn]))
  );

  useEffect(() => {
    let cancelled = false;
    fetch('/api/site-settings/emailOptions')
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => {
        if (cancelled || !Array.isArray(data?.options)) return;
        const list = optionsFor(data.options as EmailOption[], role);
        setOptions(list);
        setPrefs(Object.fromEntries(list.map((o) => [o.key, o.defaultOn])));
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [role]);

  return { options, prefs, setPref: (key: string, on: boolean) => setPrefs((p) => ({ ...p, [key]: on })) };
}
