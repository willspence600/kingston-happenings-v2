import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getCurrentUser } from '@/lib/auth';

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

// POST /api/newsletter - { email } from the footer Subscribe form
export async function POST(request: NextRequest) {
  try {
    const { email } = await request.json();
    const clean = typeof email === 'string' ? email.trim().toLowerCase().slice(0, 254) : '';
    if (!EMAIL.test(clean)) {
      return NextResponse.json({ error: 'Enter a valid email address' }, { status: 400 });
    }
    await prisma.newsletterSubscriber.upsert({ where: { email: clean }, create: { email: clean }, update: {} });
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('[Newsletter] Subscribe error:', error);
    return NextResponse.json({ error: 'Could not subscribe. Please try again.' }, { status: 500 });
  }
}

// GET /api/newsletter - Admin: every subscriber, newest first
export async function GET() {
  const user = await getCurrentUser();
  if (!user || user.role !== 'admin') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }
  const subscribers = await prisma.newsletterSubscriber.findMany({ orderBy: { createdAt: 'desc' } });
  return NextResponse.json({ subscribers });
}

// DELETE /api/newsletter?id= - Admin: remove a subscriber
export async function DELETE(request: NextRequest) {
  const user = await getCurrentUser();
  if (!user || user.role !== 'admin') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }
  const id = request.nextUrl.searchParams.get('id');
  if (!id) return NextResponse.json({ error: 'id is required' }, { status: 400 });
  await prisma.newsletterSubscriber.deleteMany({ where: { id } });
  return NextResponse.json({ success: true });
}
