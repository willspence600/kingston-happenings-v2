/**
 * Admin-editable site content. Shared by client and server (no server imports here).
 */

export interface LegalDocument {
  /** Plain text. Lines starting with "## " become headings; blank lines split paragraphs. */
  content: string;
  updatedAt: string | null;
}

export type EmailAudience = 'everyone' | 'organizers';

export interface EmailOption {
  key: string;
  label: string;
  description: string;
  /** Who sees the option (on sign-up and on the account page) */
  audience: EmailAudience;
  /** Pre-checked on the sign-up forms */
  defaultOn: boolean;
}

export type LegalKey = 'terms' | 'privacy';

export const legalTitles: Record<LegalKey, string> = {
  terms: 'Terms of Service',
  privacy: 'Privacy Policy',
};

export const DEFAULT_EMAIL_OPTIONS: EmailOption[] = [
  {
    key: 'platformUpdates',
    label: 'Platform updates',
    description: 'New features and changes to Kingston Happenings.',
    audience: 'everyone',
    defaultOn: true,
  },
  {
    key: 'venueTips',
    label: 'Tips to promote my venue and upcoming news',
    description: 'Ideas for getting more people to your events and specials.',
    audience: 'organizers',
    defaultOn: true,
  },
];

export const DEFAULT_LEGAL: Record<LegalKey, string> = {
  terms: `Welcome to Kingston Happenings. By creating an account or using the site you agree to these terms.

## Using Kingston Happenings
Kingston Happenings lists events and food & drink specials in Kingston, Ontario. You can browse without an account; an account lets you save listings and submit your own.

## Submitting listings
Only submit events and specials that are real, accurate and that you have the right to share. We review submissions and may edit, decline or remove any listing. Organizer accounts must be connected to the venue they post for. Accounts that post false, misleading or spam listings will be deleted.

## Your account
Keep your login details private. You can delete your account at any time from Your account.

## Changes
We may update these terms. We'll show the date of the latest update on this page.

## Contact
Questions? Email kingstonhappenings.ca@gmail.com.`,
  privacy: `This policy explains what Kingston Happenings collects and how we use it.

## What we collect
Your name and email when you create an account, the listings you submit and save, and — for organizers — the venue details and verification information you give us.

## How we use it
To run your account, show your listings, review organizer applications, and send the emails you've opted into. Account and security emails (like password resets) are always sent.

## Sharing
We don't sell your information. Venue details and listings you submit are shown publicly on the site.

## Your choices
You can change your email preferences or delete your account at any time from Your account.

## Contact
Questions? Email kingstonhappenings.ca@gmail.com.`,
};

export function isLegalKey(value: string): value is LegalKey {
  return value === 'terms' || value === 'privacy';
}

/** Validate an admin-submitted options list */
export function cleanEmailOptions(value: unknown): EmailOption[] | null {
  if (!Array.isArray(value)) return null;
  const seen = new Set<string>();
  const options: EmailOption[] = [];
  for (const raw of value) {
    if (!raw || typeof raw !== 'object') continue;
    const o = raw as Record<string, unknown>;
    const label = typeof o.label === 'string' ? o.label.trim().slice(0, 120) : '';
    if (!label) continue;
    let key = typeof o.key === 'string' && o.key.trim() ? o.key.trim() : label.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
    key = key.slice(0, 60) || `option-${options.length + 1}`;
    if (seen.has(key)) continue;
    seen.add(key);
    options.push({
      key,
      label,
      description: typeof o.description === 'string' ? o.description.trim().slice(0, 300) : '',
      audience: o.audience === 'organizers' ? 'organizers' : 'everyone',
      defaultOn: o.defaultOn === true,
    });
  }
  return options;
}

export function optionsFor(options: EmailOption[], role: string): EmailOption[] {
  return options.filter((o) => o.audience === 'everyone' || role === 'organizer' || role === 'admin');
}

/** Sign-up defaults for the options a new account sees */
export function defaultPreferences(options: EmailOption[], role: string): Record<string, boolean> {
  return Object.fromEntries(optionsFor(options, role).map((o) => [o.key, o.defaultOn]));
}

/** Split legal text into headings and paragraphs for display */
export function legalBlocks(content: string): { type: 'h' | 'p'; text: string }[] {
  return content
    .split(/\n{2,}|\n(?=## )/)
    .flatMap((chunk) => {
      const lines = chunk.split('\n');
      const out: { type: 'h' | 'p'; text: string }[] = [];
      let para: string[] = [];
      for (const line of lines) {
        if (line.startsWith('## ')) {
          if (para.length) out.push({ type: 'p', text: para.join('\n') });
          para = [];
          out.push({ type: 'h', text: line.slice(3).trim() });
        } else if (line.trim()) {
          para.push(line);
        }
      }
      if (para.length) out.push({ type: 'p', text: para.join('\n') });
      return out;
    });
}
