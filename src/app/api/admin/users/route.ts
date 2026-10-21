import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getCurrentUser } from '@/lib/auth';
import { supabaseAdmin } from '@/lib/supabaseAdmin';
import { listAllAuthUsers, displayName } from '@/lib/organizers';

export interface AdminListingSummary {
  id: string;
  title: string;
  date: string;
  status: string;
  venueName: string;
  isSpecial: boolean;
  /** Number of dates, for a recurring series */
  count: number;
}

export type AdminUserType = 'event-goer' | 'organizer' | 'verified-organizer';

export interface AdminEventGoer {
  id: string;
  userType: AdminUserType;
  name: string;
  email: string;
  emailConfirmed: boolean;
  createdAt: string;
  lastSignInAt: string | null;
  submitted: AdminListingSummary[];
  saved: AdminListingSummary[];
}

const listingSelect = {
  id: true,
  title: true,
  date: true,
  status: true,
  seriesId: true,
  submittedById: true,
  venue: { select: { name: true } },
  categories: { select: { name: true } },
} as const;

type ListingRow = {
  id: string;
  title: string;
  date: string;
  status: string;
  seriesId: string | null;
  venue: { name: string };
  categories: { name: string }[];
};

const isSpecialRow = (e: ListingRow) => e.categories.some((c) => c.name === 'food-deal' || c.name === 'food' || c.name === 'drink');

/** One summary per one-off listing or recurring series (shown by its next date) */
function summarize(rows: ListingRow[]): AdminListingSummary[] {
  const today = new Date().toISOString().slice(0, 10);
  const groups = new Map<string, ListingRow[]>();
  rows.forEach((e) => {
    const key = e.seriesId || e.id;
    groups.set(key, [...(groups.get(key) || []), e]);
  });
  return [...groups.values()].map((items) => {
    const sorted = [...items].sort((a, b) => a.date.localeCompare(b.date));
    const rep = sorted.find((e) => e.date >= today) ?? sorted[sorted.length - 1];
    return {
      id: rep.id,
      title: rep.title,
      date: rep.date,
      status: items.some((e) => e.status === 'pending') ? 'pending' : rep.status,
      venueName: rep.venue.name,
      isSpecial: isSpecialRow(rep),
      count: items.length,
    };
  });
}

// GET /api/admin/users - Every account except admins, with its type and what they submitted and saved
export async function GET() {
  const admin = await getCurrentUser();
  if (!admin || admin.role !== 'admin') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  try {
    const [users, profilesRes] = await Promise.all([listAllAuthUsers(), supabaseAdmin.from('profiles').select('id, name, role')]);
    const profiles = new Map(((profilesRes.data || []) as { id: string; name: string | null; role: string }[]).map((p) => [p.id, p]));

    const eventGoers = users.filter((u) => (profiles.get(u.id)?.role || 'user') !== 'admin');
    const userType = (u: (typeof users)[number]): AdminUserType => {
      if (u.app_metadata?.verifiedOrganizer === true) return 'verified-organizer';
      const role = profiles.get(u.id)?.role || 'user';
      return role === 'organizer' || u.user_metadata?.organizerApplication ? 'organizer' : 'event-goer';
    };
    const ids = eventGoers.map((u) => u.id);

    const [submittedRows, likes] = await Promise.all([
      prisma.event.findMany({ where: { submittedById: { in: ids } }, select: listingSelect }),
      prisma.like.findMany({ where: { userId: { in: ids } }, select: { userId: true, event: { select: listingSelect } } }),
    ]);

    const submittedBy = new Map<string, ListingRow[]>();
    submittedRows.forEach((e) => submittedBy.set(e.submittedById!, [...(submittedBy.get(e.submittedById!) || []), e]));
    const savedBy = new Map<string, ListingRow[]>();
    likes.forEach((l) => savedBy.set(l.userId, [...(savedBy.get(l.userId) || []), l.event]));

    const result: AdminEventGoer[] = eventGoers.map((u) => ({
      id: u.id,
      userType: userType(u),
      name: profiles.get(u.id)?.name || displayName(u),
      email: u.email || '',
      emailConfirmed: !!u.email_confirmed_at,
      createdAt: u.created_at,
      lastSignInAt: u.last_sign_in_at || null,
      submitted: summarize(submittedBy.get(u.id) || []).sort((a, b) => b.date.localeCompare(a.date)),
      // Each saved date is its own like, so these stay one row per date
      saved: (savedBy.get(u.id) || [])
        .map((e) => ({ id: e.id, title: e.title, date: e.date, status: e.status, venueName: e.venue.name, isSpecial: isSpecialRow(e), count: 1 }))
        .sort((a, b) => b.date.localeCompare(a.date)),
    }));

    result.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
    return NextResponse.json({ users: result });
  } catch (error) {
    console.error('[Admin users] List error:', error);
    return NextResponse.json({ error: 'Failed to load users' }, { status: 500 });
  }
}
