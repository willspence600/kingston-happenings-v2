'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  BANDWIDTH_LOGS_KEY,
  type BandwidthLogEntry,
} from '@/components/dev/BandwidthInterceptor';

const RED_ALERT_BYTES = 250 * 1024; // 250KB single-payload threshold
const DUPLICATE_WINDOW_MS = 5000; // identical URL+method within 5s = redundant polling
// 304 revalidation sends only response headers; body comes from browser cache.
const REVALIDATED_MAX_TRANSFER_BYTES = 1024;

const IMAGE_EXTENSIONS = /\.(png|jpe?g|gif|webp|avif|svg|ico|bmp)(\?|$)/i;

type ImageCacheStatus = 'network' | 'revalidated' | 'cache' | 'opaque';

interface ImageEntry {
  url: string;
  transferBytes: number;
  decodedBytes: number;
  encodedBytes: number;
  durationMs: number;
  cacheStatus: ImageCacheStatus;
}

function formatKB(bytes: number): string {
  return `${(bytes / 1024).toFixed(1)} KB`;
}

function formatTime(epochMs: number): string {
  const d = new Date(epochMs);
  return `${d.toLocaleTimeString([], { hour12: false })}.${String(d.getMilliseconds()).padStart(3, '0')}`;
}

function pathOf(url: string): string {
  try {
    const u = new URL(url, window.location.origin);
    return u.pathname + u.search;
  } catch {
    return url;
  }
}

function classifyImageResource(r: PerformanceResourceTiming): ImageCacheStatus {
  // Zero transfer with a decoded body = served entirely from memory/disk cache.
  if (r.transferSize === 0 && r.decodedBodySize > 0) return 'cache';
  // Tiny transfer + large decoded body = 304 Not Modified (headers only).
  if (
    r.transferSize > 0 &&
    r.transferSize <= REVALIDATED_MAX_TRANSFER_BYTES &&
    r.decodedBodySize > REVALIDATED_MAX_TRANSFER_BYTES
  ) {
    return 'revalidated';
  }
  if (r.transferSize > 0) return 'network';
  // Cross-origin without Timing-Allow-Origin — size data unavailable.
  return 'opaque';
}

function parseImageResource(r: PerformanceResourceTiming): ImageEntry {
  const cacheStatus = classifyImageResource(r);
  return {
    url: r.name,
    transferBytes: r.transferSize,
    decodedBytes: r.decodedBodySize,
    encodedBytes: r.encodedBodySize,
    durationMs: Math.round(r.duration),
    cacheStatus,
  };
}

function isDuplicate(entry: BandwidthLogEntry, logs: BandwidthLogEntry[]): boolean {
  return logs.some(
    (other) =>
      other !== entry &&
      other.url === entry.url &&
      other.method === entry.method &&
      Math.abs(other.timestamp - entry.timestamp) <= DUPLICATE_WINDOW_MS
  );
}

const CACHE_STATUS_LABEL: Record<ImageCacheStatus, string> = {
  network: 'Network',
  revalidated: 'Revalidated',
  cache: 'Cache',
  opaque: 'Opaque',
};

const CACHE_STATUS_CLASS: Record<ImageCacheStatus, string> = {
  network: 'bg-blue-100 text-blue-800',
  revalidated: 'bg-teal-100 text-teal-800',
  cache: 'bg-green-100 text-green-800',
  opaque: 'bg-gray-100 text-gray-600',
};

export default function BandwidthDashboardPage() {
  const isDev = process.env.NODE_ENV === 'development';
  const [logs, setLogs] = useState<BandwidthLogEntry[]>([]);
  const [images, setImages] = useState<ImageEntry[]>([]);

  const refresh = useCallback(() => {
    try {
      const raw = sessionStorage.getItem(BANDWIDTH_LOGS_KEY);
      setLogs(raw ? (JSON.parse(raw) as BandwidthLogEntry[]) : []);
    } catch {
      setLogs([]);
    }

    const resources = window.performance.getEntriesByType('resource') as PerformanceResourceTiming[];
    setImages(
      resources
        .filter((r) => r.initiatorType === 'img' || IMAGE_EXTENSIONS.test(r.name))
        .map(parseImageResource)
    );
  }, []);

  useEffect(() => {
    if (isDev) refresh();
  }, [isDev, refresh]);

  const imageStats = useMemo(() => {
    const network = images.filter((i) => i.cacheStatus === 'network');
    const revalidated = images.filter((i) => i.cacheStatus === 'revalidated');
    const cache = images.filter((i) => i.cacheStatus === 'cache');
    const opaque = images.filter((i) => i.cacheStatus === 'opaque');
    const totalNetworkBytes = network.reduce((sum, i) => sum + i.transferBytes, 0);
    const totalRevalidatedBytes = revalidated.reduce((sum, i) => sum + i.transferBytes, 0);
    const totalDecodedFromCache = cache.reduce((sum, i) => sum + i.decodedBytes, 0);
    const totalDecodedFromRevalidated = revalidated.reduce((sum, i) => sum + i.decodedBytes, 0);

    const byUrl = new Map<string, { loads: number; network: number; revalidated: number; cache: number }>();
    for (const img of images) {
      const entry = byUrl.get(img.url) ?? { loads: 0, network: 0, revalidated: 0, cache: 0 };
      entry.loads += 1;
      if (img.cacheStatus === 'network') entry.network += 1;
      if (img.cacheStatus === 'revalidated') entry.revalidated += 1;
      if (img.cacheStatus === 'cache') entry.cache += 1;
      byUrl.set(img.url, entry);
    }
    const repeatedUrls = [...byUrl.values()].filter((v) => v.loads > 1).length;

    return {
      network,
      revalidated,
      cache,
      opaque,
      totalNetworkBytes,
      totalRevalidatedBytes,
      totalDecodedFromCache,
      totalDecodedFromRevalidated,
      uniqueUrls: byUrl.size,
      repeatedUrls,
    };
  }, [images]);

  if (!isDev) {
    return (
      <div className="flex flex-col items-center justify-center py-32">
        <h1 className="text-2xl font-bold">404 — Not Found</h1>
        <p className="text-gray-500 mt-2">This page does not exist.</p>
      </div>
    );
  }

  const clearLogs = () => {
    sessionStorage.removeItem(BANDWIDTH_LOGS_KEY);
    setLogs([]);
  };

  const totalApiBytes = logs.reduce((sum, l) => sum + l.sizeBytes, 0);
  const totalRequests = logs.length + images.length;

  return (
    <div className="max-w-6xl mx-auto px-4 py-8">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold">Bandwidth Diagnostics</h1>
          <p className="text-sm text-gray-500">
            Dev-only dashboard tracking fetch payloads and image transfer sizes for this session.
          </p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={refresh}
            className="px-4 py-2 text-sm rounded-md border border-gray-300 hover:bg-gray-50"
          >
            Refresh
          </button>
          <button
            onClick={clearLogs}
            className="px-4 py-2 text-sm rounded-md bg-red-600 text-white hover:bg-red-700"
          >
            Clear Log History
          </button>
        </div>
      </div>

      {/* Global stats */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4 mb-8">
        <div className="rounded-lg border border-gray-200 p-4">
          <div className="text-xs uppercase tracking-wide text-gray-500">Total API Transfer</div>
          <div className="text-2xl font-semibold">{formatKB(totalApiBytes)}</div>
        </div>
        <div className="rounded-lg border border-blue-200 bg-blue-50/50 p-4">
          <div className="text-xs uppercase tracking-wide text-blue-600">Image Network</div>
          <div className="text-2xl font-semibold">{formatKB(imageStats.totalNetworkBytes)}</div>
          <div className="text-xs text-gray-500 mt-1">{imageStats.network.length} full downloads</div>
        </div>
        <div className="rounded-lg border border-teal-200 bg-teal-50/50 p-4">
          <div className="text-xs uppercase tracking-wide text-teal-600">Revalidated (304)</div>
          <div className="text-2xl font-semibold">{imageStats.revalidated.length}</div>
          <div className="text-xs text-gray-500 mt-1">
            {formatKB(imageStats.totalRevalidatedBytes)} headers · {formatKB(imageStats.totalDecodedFromRevalidated)} decoded
          </div>
        </div>
        <div className="rounded-lg border border-green-200 bg-green-50/50 p-4">
          <div className="text-xs uppercase tracking-wide text-green-600">Cache Hits</div>
          <div className="text-2xl font-semibold">{imageStats.cache.length}</div>
          <div className="text-xs text-gray-500 mt-1">{formatKB(imageStats.totalDecodedFromCache)} decoded</div>
        </div>
        <div className="rounded-lg border border-gray-200 p-4">
          <div className="text-xs uppercase tracking-wide text-gray-500">Opaque Images</div>
          <div className="text-2xl font-semibold">{imageStats.opaque.length}</div>
          <div className="text-xs text-gray-500 mt-1">size unknown</div>
        </div>
        <div className="rounded-lg border border-gray-200 p-4">
          <div className="text-xs uppercase tracking-wide text-gray-500">Unique Image URLs</div>
          <div className="text-2xl font-semibold">{imageStats.uniqueUrls}</div>
          <div className="text-xs text-gray-500 mt-1">{imageStats.repeatedUrls} repeated</div>
        </div>
        <div className="rounded-lg border border-gray-200 p-4">
          <div className="text-xs uppercase tracking-wide text-gray-500">Total Requests</div>
          <div className="text-2xl font-semibold">{totalRequests}</div>
        </div>
      </div>

      {/* API requests table */}
      <h2 className="text-lg font-semibold mb-2">Fetch Requests ({logs.length})</h2>
      <div className="overflow-x-auto rounded-lg border border-gray-200 mb-8">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 text-left">
            <tr>
              <th className="px-3 py-2 font-medium">Time</th>
              <th className="px-3 py-2 font-medium">Method</th>
              <th className="px-3 py-2 font-medium">URL</th>
              <th className="px-3 py-2 font-medium">Status</th>
              <th className="px-3 py-2 font-medium text-right">Size</th>
              <th className="px-3 py-2 font-medium text-right">Latency</th>
              <th className="px-3 py-2 font-medium">Alerts</th>
            </tr>
          </thead>
          <tbody>
            {logs.length === 0 && (
              <tr>
                <td colSpan={7} className="px-3 py-6 text-center text-gray-400">
                  No fetch requests logged yet. Navigate around the app, then come back (or hit Refresh).
                </td>
              </tr>
            )}
            {[...logs].reverse().map((log, i) => {
              const oversized = log.sizeBytes > RED_ALERT_BYTES;
              const duplicate = isDuplicate(log, logs);
              const rowClass = oversized
                ? 'bg-red-50'
                : duplicate
                  ? 'bg-yellow-50'
                  : '';
              return (
                <tr key={`${log.timestamp}-${i}`} className={`border-t border-gray-100 ${rowClass}`}>
                  <td className="px-3 py-2 whitespace-nowrap text-gray-500">{formatTime(log.timestamp)}</td>
                  <td className="px-3 py-2 font-mono">{log.method}</td>
                  <td className="px-3 py-2 font-mono break-all">{pathOf(log.url)}</td>
                  <td className="px-3 py-2">{log.status}</td>
                  <td className="px-3 py-2 text-right">{formatKB(log.sizeBytes)}</td>
                  <td className="px-3 py-2 text-right">{log.latencyMs} ms</td>
                  <td className="px-3 py-2 space-x-1">
                    {oversized && (
                      <span className="inline-block rounded bg-red-100 text-red-800 px-2 py-0.5 text-xs font-medium">
                        🔴 &gt;250KB payload
                      </span>
                    )}
                    {duplicate && (
                      <span className="inline-block rounded bg-yellow-100 text-yellow-800 px-2 py-0.5 text-xs font-medium">
                        🟡 Duplicate &lt;5s
                      </span>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Images table */}
      <h2 className="text-lg font-semibold mb-2">Loaded Images ({images.length})</h2>
      <p className="text-xs text-gray-400 mb-2">
        Accumulated across this tab session via the Performance API.{' '}
        <span className="text-blue-600">Network</span> = full image download;{' '}
        <span className="text-teal-600">Revalidated</span> = 304 response (headers only, body from cache);{' '}
        <span className="text-green-600">Cache</span> = zero network bytes;{' '}
        <span className="text-gray-500">Opaque</span> = cross-origin without Timing-Allow-Origin.
      </p>
      <div className="overflow-x-auto rounded-lg border border-gray-200">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 text-left">
            <tr>
              <th className="px-3 py-2 font-medium">URL</th>
              <th className="px-3 py-2 font-medium">Source</th>
              <th className="px-3 py-2 font-medium text-right">Network</th>
              <th className="px-3 py-2 font-medium text-right">Decoded</th>
              <th className="px-3 py-2 font-medium text-right">Duration</th>
              <th className="px-3 py-2 font-medium">Alerts</th>
            </tr>
          </thead>
          <tbody>
            {images.length === 0 && (
              <tr>
                <td colSpan={6} className="px-3 py-6 text-center text-gray-400">
                  No image resources recorded on this page load.
                </td>
              </tr>
            )}
            {images.map((img, i) => {
              const oversized = img.cacheStatus === 'network' && img.transferBytes > RED_ALERT_BYTES;
              const rowClass =
                img.cacheStatus === 'network'
                  ? oversized
                    ? 'bg-red-50'
                    : ''
                  : img.cacheStatus === 'revalidated'
                    ? 'bg-teal-50/40'
                    : img.cacheStatus === 'cache'
                      ? 'bg-green-50/40'
                      : 'bg-gray-50/40';
              return (
                <tr key={`${img.url}-${i}`} className={`border-t border-gray-100 ${rowClass}`}>
                  <td className="px-3 py-2 font-mono break-all">{pathOf(img.url)}</td>
                  <td className="px-3 py-2">
                    <span
                      className={`inline-block rounded px-2 py-0.5 text-xs font-medium ${CACHE_STATUS_CLASS[img.cacheStatus]}`}
                    >
                      {CACHE_STATUS_LABEL[img.cacheStatus]}
                    </span>
                  </td>
                  <td className="px-3 py-2 text-right">
                    {img.cacheStatus === 'network' || img.cacheStatus === 'revalidated'
                      ? formatKB(img.transferBytes)
                      : '—'}
                  </td>
                  <td className="px-3 py-2 text-right text-gray-500">
                    {img.decodedBytes > 0 ? formatKB(img.decodedBytes) : '—'}
                  </td>
                  <td className="px-3 py-2 text-right">{img.durationMs} ms</td>
                  <td className="px-3 py-2 space-x-1">
                    {oversized && (
                      <span className="inline-block rounded bg-red-100 text-red-800 px-2 py-0.5 text-xs font-medium">
                        🔴 &gt;250KB image
                      </span>
                    )}
                    {img.cacheStatus === 'revalidated' && (
                      <span className="inline-block rounded bg-teal-100 text-teal-800 px-2 py-0.5 text-xs font-medium">
                        ✅ 304 revalidated
                      </span>
                    )}
                    {img.cacheStatus === 'cache' && (
                      <span className="inline-block rounded bg-green-100 text-green-800 px-2 py-0.5 text-xs font-medium">
                        ✅ Cache hit
                      </span>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
