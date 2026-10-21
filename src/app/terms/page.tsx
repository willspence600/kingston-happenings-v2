import type { Metadata } from 'next';
import LegalDocumentView from '@/components/legal/LegalDocumentView';
import { getLegalDocument } from '@/lib/siteSettings';

export const dynamic = 'force-dynamic';
export const metadata: Metadata = { title: 'Terms of Service | Kingston Happenings' };

export default async function Page() {
  return <LegalDocumentView kind="terms" document={await getLegalDocument('terms')} />;
}
