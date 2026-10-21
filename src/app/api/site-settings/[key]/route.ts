import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import { getEmailOptions, getLegalDocument, setEmailOptions, setLegalDocument } from '@/lib/siteSettings';
import { cleanEmailOptions, isLegalKey } from '@/lib/siteContent';

// GET /api/site-settings/terms | privacy | emailOptions
export async function GET(_request: NextRequest, { params }: { params: Promise<{ key: string }> }) {
  const { key } = await params;
  try {
    if (isLegalKey(key)) return NextResponse.json({ document: await getLegalDocument(key) });
    if (key === 'emailOptions') return NextResponse.json({ options: await getEmailOptions() });
    return NextResponse.json({ error: 'Not found' }, { status: 404 });
  } catch (error) {
    console.error('[Site settings] Read error:', error);
    return NextResponse.json({ error: 'Failed to load setting' }, { status: 500 });
  }
}

// PUT /api/site-settings/terms | privacy  { content }   ·   /api/site-settings/emailOptions  { options }
export async function PUT(request: NextRequest, { params }: { params: Promise<{ key: string }> }) {
  const user = await getCurrentUser();
  if (!user || user.role !== 'admin') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }
  const { key } = await params;
  try {
    const body = await request.json();
    if (isLegalKey(key)) {
      const content = typeof body.content === 'string' ? body.content.trim().slice(0, 50000) : '';
      if (!content) return NextResponse.json({ error: 'Content can’t be empty' }, { status: 400 });
      return NextResponse.json({ document: await setLegalDocument(key, content) });
    }
    if (key === 'emailOptions') {
      const options = cleanEmailOptions(body.options);
      if (!options) return NextResponse.json({ error: 'Invalid options' }, { status: 400 });
      return NextResponse.json({ options: await setEmailOptions(options) });
    }
    return NextResponse.json({ error: 'Not found' }, { status: 404 });
  } catch (error) {
    console.error('[Site settings] Update error:', error);
    return NextResponse.json({ error: 'Failed to save setting' }, { status: 500 });
  }
}
