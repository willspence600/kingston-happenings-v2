import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getCurrentUser } from '@/lib/auth';
import { uploadImage } from '@/lib/storage';

// POST /api/admin/migrate-images - Migrate base64 images to Supabase Storage (admin only)
export async function POST() {
  try {
    const user = await getCurrentUser();
    if (!user || user.role !== 'admin') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const events = await prisma.event.findMany({
      where: {
        imageUrl: { not: null },
      },
      select: { id: true, imageUrl: true },
    });

    let migrated = 0;
    let skipped = 0;
    const errors: string[] = [];

    for (const event of events) {
      if (!event.imageUrl || !event.imageUrl.startsWith('data:')) {
        skipped++;
        continue;
      }

      try {
        const publicUrl = await uploadImage(event.imageUrl, event.id);
        await prisma.event.update({
          where: { id: event.id },
          data: { imageUrl: publicUrl },
        });
        migrated++;
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        errors.push(`Event ${event.id}: ${msg}`);
      }
    }

    return NextResponse.json({
      total: events.length,
      migrated,
      skipped,
      errors,
    });
  } catch (error) {
    console.error('Migration error:', error);
    return NextResponse.json({ error: 'Migration failed' }, { status: 500 });
  }
}
