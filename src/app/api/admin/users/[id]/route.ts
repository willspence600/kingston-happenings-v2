import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getCurrentUser, isOrganizerApproved } from '@/lib/auth';
import { supabaseAdmin } from '@/lib/supabaseAdmin';
import { displayName, organizerVenueIds } from '@/lib/organizers';
import { composeAddress, normalizeApplication } from '@/lib/organizerApplication';
import { getDocumentSignedUrl } from '@/lib/storage';
import { getEmailOptions, readEmailPreferences } from '@/lib/siteSettings';
import { optionsFor } from '@/lib/siteContent';
import { readVenueNotices } from '@/lib/venueNotices';
import { transformEvent, eventListInclude } from '@/utils/eventTransform';

// GET /api/admin/users/[id] - Everything about one account, for the Admin View Profile page
export async function GET(_request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const admin = await getCurrentUser();
  if (!admin || admin.role !== 'admin') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const { id } = await params;
  try {
    const { data, error } = await supabaseAdmin.auth.admin.getUserById(id);
    if (error || !data.user) {
      return NextResponse.json({ error: 'Account not found' }, { status: 404 });
    }
    const u = data.user;
    const meta = u.user_metadata || {};
    const app = u.app_metadata || {};

    const { data: profile } = await supabaseAdmin.from('profiles').select('id, name, role, venue_name').eq('id', id).maybeSingle();
    const role: string = (profile as { role?: string } | null)?.role || 'user';
    const application = normalizeApplication(meta.organizerApplication, meta.venueName);

    const linkedIds = organizerVenueIds(u);
    const claimedIds = (application?.venues || []).map((v) => v.claimedVenueId).filter((x): x is string => !!x);
    const venueRows = await prisma.venue.findMany({
      where: { id: { in: [...new Set([...linkedIds, ...claimedIds])] } },
      select: { id: true, name: true, address: true },
    });
    const venueById = new Map(venueRows.map((v) => [v.id, v]));

    const [submitted, likes, options] = await Promise.all([
      prisma.event.findMany({ where: { submittedById: id }, include: eventListInclude, orderBy: [{ date: 'asc' }, { startTime: 'asc' }] }),
      prisma.like.findMany({ where: { userId: id }, include: { event: { include: eventListInclude } }, orderBy: { createdAt: 'desc' } }),
      getEmailOptions(),
    ]);
    const shownOptions = optionsFor(options, role);
    const prefs = readEmailPreferences(meta, shownOptions);

    return NextResponse.json({
      user: {
        id: u.id,
        name: (profile as { name?: string } | null)?.name || displayName(u),
        email: u.email || '',
        emailConfirmed: !!u.email_confirmed_at,
        role,
        createdAt: u.created_at,
        lastSignInAt: u.last_sign_in_at || null,
        agreedToTermsAt: meta.agreedToTermsAt || application?.submittedAt || u.created_at,
        organizerApproved: isOrganizerApproved(role, meta, app),
        applicationDeclined: !!app.organizerDeclinedAt,
        isVerifiedOrganizer: app.verifiedOrganizer === true,
        verificationRequestedAt: app.verificationRequestedAt || null,
        verifiedAt: app.verifiedAt || null,
        venues: linkedIds.map((vid) => venueById.get(vid) || { id: vid, name: 'Removed venue', address: '' }),
        pendingVenueNotices: readVenueNotices(u).length,
        emailPreferences: shownOptions.map((o) => ({ key: o.key, label: o.label, on: prefs[o.key] })),
        application: application
          ? {
              phone: application.phone,
              role: application.role,
              confirmMethod: application.confirmMethod,
              documentUrl: application.documentPath ? await getDocumentSignedUrl(application.documentPath) : null,
              notes: application.notes,
              accessibility: application.accessibility,
              accessibilityNotes: application.accessibilityNotes,
              submittedAt: application.submittedAt,
              venues: application.venues.map((v) => ({
                name: v.claimedVenueId ? venueById.get(v.claimedVenueId)?.name || v.name : v.name,
                claimedVenueId: v.claimedVenueId || null,
                venueTypes: v.venueTypes,
                address: composeAddress(v),
                phone: v.phone,
                website: v.website,
                instagram: v.instagram,
                about: v.about,
              })),
            }
          : null,
      },
      submitted: submitted.map((e) => ({ ...transformEvent(e, { stripDataUrls: true }), rejectionReason: e.rejectionReason || undefined })),
      saved: likes.map((l) => ({ ...transformEvent(l.event, { stripDataUrls: true }), savedAt: l.createdAt.toISOString() })),
    });
  } catch (error) {
    console.error('[Admin user] Load error:', error);
    return NextResponse.json({ error: 'Failed to load account' }, { status: 500 });
  }
}
