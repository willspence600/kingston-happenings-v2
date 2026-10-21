import type { Prisma } from '@prisma/client';
import prisma from './prisma';
import {
  DEFAULT_EMAIL_OPTIONS,
  DEFAULT_LEGAL,
  cleanEmailOptions,
  type EmailOption,
  type LegalDocument,
  type LegalKey,
} from './siteContent';

export async function getLegalDocument(key: LegalKey): Promise<LegalDocument> {
  const row = await prisma.siteSetting.findUnique({ where: { key } });
  const value = (row?.value ?? null) as { content?: unknown } | null;
  if (row && value && typeof value.content === 'string') {
    return { content: value.content, updatedAt: row.updatedAt.toISOString() };
  }
  return { content: DEFAULT_LEGAL[key], updatedAt: null };
}

export async function setLegalDocument(key: LegalKey, content: string): Promise<LegalDocument> {
  const value = { content } as Prisma.InputJsonValue;
  const row = await prisma.siteSetting.upsert({ where: { key }, create: { key, value }, update: { value } });
  return { content, updatedAt: row.updatedAt.toISOString() };
}

export async function getEmailOptions(): Promise<EmailOption[]> {
  const row = await prisma.siteSetting.findUnique({ where: { key: 'emailOptions' } });
  return (row && cleanEmailOptions((row.value as { options?: unknown })?.options)) || DEFAULT_EMAIL_OPTIONS;
}

export async function setEmailOptions(options: EmailOption[]): Promise<EmailOption[]> {
  const value = { options } as unknown as Prisma.InputJsonValue;
  await prisma.siteSetting.upsert({ where: { key: 'emailOptions' }, create: { key: 'emailOptions', value }, update: { value } });
  return options;
}

/** A user's preferences for every current option (missing ones fall back to legacy fields or the default) */
export function readEmailPreferences(metadata: Record<string, unknown>, options: EmailOption[]): Record<string, boolean> {
  const saved = (metadata.emailPreferences || {}) as Record<string, unknown>;
  const application = (metadata.organizerApplication || {}) as { newsletter?: boolean };
  return Object.fromEntries(
    options.map((o) => {
      if (typeof saved[o.key] === 'boolean') return [o.key, saved[o.key] as boolean];
      if (o.key === 'venueTips' && typeof application.newsletter === 'boolean') return [o.key, application.newsletter];
      return [o.key, o.key === 'platformUpdates' ? true : o.defaultOn];
    })
  );
}
