'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { format } from 'date-fns';
import { ArrowDown, ArrowUp, Copy, Download, ExternalLink, Loader2, Plus, Trash2 } from 'lucide-react';
import { legalTitles, type EmailOption, type LegalDocument, type LegalKey } from '@/lib/siteContent';
import type { ShowToast } from './types';

interface Subscriber {
  id: string;
  email: string;
  createdAt: string;
}

function LegalEditor({ kind, showToast }: { kind: LegalKey; showToast: ShowToast }) {
  const [doc, setDoc] = useState<LegalDocument | null>(null);
  const [draft, setDraft] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetch(`/api/site-settings/${kind}`, { cache: 'no-store' })
      .then((r) => r.json())
      .then((d) => {
        setDoc(d.document);
        setDraft(d.document?.content || '');
      })
      .catch(() => {});
  }, [kind]);

  const save = async () => {
    setSaving(true);
    try {
      const res = await fetch(`/api/site-settings/${kind}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content: draft }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || 'Failed to save');
      setDoc(data.document);
      showToast(`${legalTitles[kind]} updated`, 'success');
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Failed to save', 'error');
    } finally {
      setSaving(false);
    }
  };

  return (
    <section className="card p-5 sm:p-7">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h3 className="text-[20px] font-bold text-navy">{legalTitles[kind]}</h3>
        <Link href={`/${kind}`} target="_blank" className="link-arrow">
          View page <ExternalLink size={12} />
        </Link>
      </div>
      <p className="field-hint mt-1">
        {doc?.updatedAt ? `Last updated ${format(new Date(doc.updatedAt), 'MMM d, yyyy · h:mm a')}. ` : 'Showing the default text. '}
        Start a line with &ldquo;## &rdquo; for a heading; leave a blank line between paragraphs.
      </p>
      {doc === null ? (
        <div className="flex justify-center py-10">
          <Loader2 size={20} className="animate-spin text-navy" />
        </div>
      ) : (
        <>
          <textarea className="field mt-4 font-mono text-[13px] leading-[1.6]" rows={16} value={draft} onChange={(e) => setDraft(e.target.value)} />
          <div className="mt-3 flex justify-end gap-2">
            <button className="btn-ghost btn-sm" disabled={saving || draft === doc.content} onClick={() => setDraft(doc.content)}>
              Discard
            </button>
            <button className="btn-navy btn-sm" disabled={saving || !draft.trim() || draft === doc.content} onClick={save}>
              {saving && <Loader2 size={13} className="animate-spin" />} Publish changes
            </button>
          </div>
        </>
      )}
    </section>
  );
}

function EmailOptionsEditor({ showToast }: { showToast: ShowToast }) {
  const [saved, setSaved] = useState<EmailOption[] | null>(null);
  const [options, setOptions] = useState<EmailOption[]>([]);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetch('/api/site-settings/emailOptions', { cache: 'no-store' })
      .then((r) => r.json())
      .then((d) => {
        setSaved(d.options || []);
        setOptions(d.options || []);
      })
      .catch(() => {});
  }, []);

  const update = (i: number, patch: Partial<EmailOption>) => setOptions((list) => list.map((o, j) => (j === i ? { ...o, ...patch } : o)));
  const move = (i: number, by: number) =>
    setOptions((list) => {
      const next = [...list];
      const [item] = next.splice(i, 1);
      next.splice(i + by, 0, item);
      return next;
    });

  const save = async () => {
    setSaving(true);
    try {
      const res = await fetch('/api/site-settings/emailOptions', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ options }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || 'Failed to save');
      setSaved(data.options);
      setOptions(data.options);
      showToast('Email options updated', 'success');
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Failed to save', 'error');
    } finally {
      setSaving(false);
    }
  };

  const dirty = JSON.stringify(options) !== JSON.stringify(saved);

  return (
    <section className="card p-5 sm:p-7">
      <h3 className="text-[20px] font-bold text-navy">Email opt-ins</h3>
      <p className="field-hint mt-1">
        The emails people can opt into when they sign up and on Your account. Account and security emails are always sent. Removing an option
        hides it; people&rsquo;s earlier choices are kept if you add it back with the same key.
      </p>
      {saved === null ? (
        <div className="flex justify-center py-10">
          <Loader2 size={20} className="animate-spin text-navy" />
        </div>
      ) : (
        <div className="mt-5 flex flex-col gap-3">
          {options.map((o, i) => (
            <div key={i} className="rounded-[16px] border border-line p-4">
              <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                <div>
                  <label className="field-label">Label</label>
                  <input className="field h-10 text-[14px]" value={o.label} onChange={(e) => update(i, { label: e.target.value })} placeholder="e.g. Weekly event picks" />
                </div>
                <div>
                  <label className="field-label">Description</label>
                  <input className="field h-10 text-[14px]" value={o.description} onChange={(e) => update(i, { description: e.target.value })} placeholder="Shown under the label" />
                </div>
              </div>
              <div className="mt-3 flex flex-wrap items-center gap-3">
                <select
                  value={o.audience}
                  onChange={(e) => update(i, { audience: e.target.value as EmailOption['audience'] })}
                  className="h-9 rounded-full border border-line bg-white px-3 text-[13px] font-medium text-navy"
                >
                  <option value="everyone">Everyone</option>
                  <option value="organizers">Organizers only</option>
                </select>
                <label className="flex items-center gap-2 text-[13px] font-medium text-navy">
                  <button type="button" className="switch" data-on={o.defaultOn} onClick={() => update(i, { defaultOn: !o.defaultOn })} aria-pressed={o.defaultOn}>
                    <span />
                  </button>
                  Checked by default on sign-up
                </label>
                {o.key && <span className="text-[11px] text-ink-muted">key: {o.key}</span>}
                <span className="ml-auto flex gap-1">
                  <button type="button" className="flex h-8 w-8 items-center justify-center rounded-full hover:bg-sky-soft disabled:opacity-30" disabled={i === 0} onClick={() => move(i, -1)} aria-label="Move up">
                    <ArrowUp size={14} />
                  </button>
                  <button
                    type="button"
                    className="flex h-8 w-8 items-center justify-center rounded-full hover:bg-sky-soft disabled:opacity-30"
                    disabled={i === options.length - 1}
                    onClick={() => move(i, 1)}
                    aria-label="Move down"
                  >
                    <ArrowDown size={14} />
                  </button>
                  <button
                    type="button"
                    className="flex h-8 w-8 items-center justify-center rounded-full text-danger hover:bg-danger-tint"
                    onClick={() => setOptions((list) => list.filter((_, j) => j !== i))}
                    aria-label="Remove option"
                  >
                    <Trash2 size={14} />
                  </button>
                </span>
              </div>
            </div>
          ))}
          <button
            type="button"
            className="btn-ghost btn-sm self-start"
            onClick={() => setOptions((list) => [...list, { key: '', label: '', description: '', audience: 'everyone', defaultOn: false }])}
          >
            <Plus size={14} /> Add an option
          </button>
          <div className="flex justify-end gap-2">
            <button className="btn-ghost btn-sm" disabled={!dirty || saving} onClick={() => setOptions(saved)}>
              Discard
            </button>
            <button className="btn-navy btn-sm" disabled={!dirty || saving} onClick={save}>
              {saving && <Loader2 size={13} className="animate-spin" />} Save options
            </button>
          </div>
        </div>
      )}
    </section>
  );
}

function SubscribersList({ showToast }: { showToast: ShowToast }) {
  const [subscribers, setSubscribers] = useState<Subscriber[] | null>(null);
  const [query, setQuery] = useState('');

  const load = useCallback(async () => {
    const res = await fetch('/api/newsletter', { cache: 'no-store' });
    if (res.ok) setSubscribers((await res.json()).subscribers || []);
  }, []);

  useEffect(() => {
    fetch('/api/newsletter', { cache: 'no-store' })
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => d && setSubscribers(d.subscribers || []))
      .catch(() => {});
  }, []);

  const remove = async (s: Subscriber) => {
    if (!window.confirm(`Remove ${s.email} from the list?`)) return;
    const res = await fetch(`/api/newsletter?id=${encodeURIComponent(s.id)}`, { method: 'DELETE' });
    if (res.ok) {
      showToast(`${s.email} removed`, 'success');
      load();
    } else showToast('Failed to remove subscriber', 'error');
  };

  const shown = (subscribers || []).filter((s) => s.email.includes(query.trim().toLowerCase()));

  const copyAll = async () => {
    await navigator.clipboard.writeText(shown.map((s) => s.email).join(', '));
    showToast(`Copied ${shown.length} email${shown.length === 1 ? '' : 's'}`, 'success');
  };
  const downloadCsv = () => {
    const csv = ['email,subscribed_at', ...shown.map((s) => `${s.email},${s.createdAt}`)].join('\n');
    const url = URL.createObjectURL(new Blob([csv], { type: 'text/csv' }));
    const a = document.createElement('a');
    a.href = url;
    a.download = 'kingston-happenings-subscribers.csv';
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <section className="card p-5 sm:p-7">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h3 className="text-[20px] font-bold text-navy">Newsletter subscribers</h3>
        <span className="text-[12px] text-ink-muted">From the footer&rsquo;s Subscribe form · {subscribers?.length ?? 0} total</span>
      </div>
      <div className="mt-4 flex flex-wrap gap-2">
        <input
          type="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search emails…"
          className="h-10 min-w-[200px] flex-1 rounded-full border border-line bg-white px-4 text-[14px] text-navy outline-none focus:border-navy"
        />
        <button className="btn-ghost btn-sm h-10" onClick={copyAll} disabled={shown.length === 0}>
          <Copy size={13} /> Copy emails
        </button>
        <button className="btn-ghost btn-sm h-10" onClick={downloadCsv} disabled={shown.length === 0}>
          <Download size={13} /> CSV
        </button>
      </div>
      {subscribers === null ? (
        <div className="flex justify-center py-10">
          <Loader2 size={20} className="animate-spin text-navy" />
        </div>
      ) : shown.length === 0 ? (
        <p className="py-8 text-[14px] text-ink-muted">No subscribers yet.</p>
      ) : (
        <div className="mt-3 max-h-[480px] overflow-y-auto">
          {shown.map((s) => (
            <div key={s.id} className="flex items-center justify-between gap-3 border-b border-line py-2.5 text-[14px]">
              <a href={`mailto:${s.email}`} className="truncate font-medium text-link hover:underline">
                {s.email}
              </a>
              <span className="flex shrink-0 items-center gap-3 text-[12px] text-ink-muted">
                {format(new Date(s.createdAt), 'MMM d, yyyy')}
                <button className="flex h-8 w-8 items-center justify-center rounded-full text-danger hover:bg-danger-tint" onClick={() => remove(s)} aria-label={`Remove ${s.email}`}>
                  <Trash2 size={13} />
                </button>
              </span>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}

export default function SiteTab({ showToast }: { showToast: ShowToast }) {
  return (
    <div className="grid grid-cols-1 gap-6 xl:grid-cols-2">
      <div className="flex flex-col gap-6">
        <LegalEditor kind="terms" showToast={showToast} />
        <LegalEditor kind="privacy" showToast={showToast} />
      </div>
      <div className="flex flex-col gap-6">
        <EmailOptionsEditor showToast={showToast} />
        <SubscribersList showToast={showToast} />
      </div>
    </div>
  );
}
