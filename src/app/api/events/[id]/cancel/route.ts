import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: eventId } = await params;
    
    // Verify admin
    const token = request.cookies.get('token')?.value;
    if (!token) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const decoded = jwt.verify(token, JWT_SECRET) as { userId: string };
    const user = await prisma.user.findUnique({ where: { id: decoded.userId } });

    if (!user || user.role !== 'admin') {
      return NextResponse.json({ error: 'Admin access required' }, { status: 403 });
    }

    // Update event status to cancelled
    await prisma.event.update({
      where: { id: eventId },
      data: { status: 'cancelled' },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Cancel event error:', error);
    return NextResponse.json({ error: 'Failed to cancel event' }, { status: 500 });
  }
}

