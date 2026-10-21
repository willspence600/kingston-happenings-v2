import type { Metadata } from 'next';
import LegalDocumentView from '@/components/legal/LegalDocumentView';
import { getLegalDocument } from '@/lib/siteSettings';

export const dynamic = 'force-dynamic';
export const metadata: Metadata = { title: 'Privacy Policy | Kingston Happenings' };

export default async function Page() {
  return <LegalDocumentView kind="privacy" document={await getLegalDocument('privacy')} />;
}
