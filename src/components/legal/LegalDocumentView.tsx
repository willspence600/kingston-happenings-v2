import Link from 'next/link';
import { format } from 'date-fns';
import { legalBlocks, legalTitles, type LegalDocument, type LegalKey } from '@/lib/siteContent';

export default function LegalDocumentView({ kind, document }: { kind: LegalKey; document: LegalDocument }) {
  const other: LegalKey = kind === 'terms' ? 'privacy' : 'terms';
  return (
    <div className="page-container pb-24 pt-10">
      <p className="eyebrow mb-3.5">— Legal</p>
      <h1 className="display-section">{legalTitles[kind]}</h1>
      {document.updatedAt && (
        <p className="mt-4 text-[14px] text-ink-muted">Last updated {format(new Date(document.updatedAt), 'MMMM d, yyyy')}</p>
      )}
      <div className="mt-10 max-w-[720px]">
        {legalBlocks(document.content).map((b, i) =>
          b.type === 'h' ? (
            <h2 key={i} className="mt-8 text-[22px] font-bold text-navy first:mt-0">
              {b.text}
            </h2>
          ) : (
            <p key={i} className="mt-3 whitespace-pre-line text-[16px] leading-[1.6] text-navy">
              {b.text}
            </p>
          )
        )}
      </div>
      <Link href={`/${other}`} className="link-arrow mt-12 text-[14px]">
        Read the {legalTitles[other]} →
      </Link>
    </div>
  );
}
