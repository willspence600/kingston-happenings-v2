import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import { getVenueAssociates } from '@/lib/organizers';

// GET /api/venues/[id]/organizers - How many organizers are associated with a venue.
// Admins, and approved organizers associated with the venue, also get the list of people.
export async function GET(_request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const [user, associates] = await Promise.all([getCurrentUser(), getVenueAssociates(id)]);

    const canSeeOrganizers =
      !!user && (user.role === 'admin' || (user.organizerApproved && user.organizerVenueIds.includes(id)));

    return NextResponse.json({
      count: associates.length,
      canSeeOrganizers,
      canEdit: canSeeOrganizers,
      organizers: canSeeOrganizers ? associates : undefined,
    });
  } catch (error) {
    console.error('[Venue organizers] Error:', error);
    return NextResponse.json({ error: 'Failed to load venue organizers' }, { status: 500 });
  }
}
