'use client';

import { useEffect } from 'react';

export interface BandwidthLogEntry {
  url: string;
  method: string;
  status: number;
  latencyMs: number;
  sizeBytes: number;
  timestamp: number; // epoch ms
}

export const BANDWIDTH_LOGS_KEY = 'bandwidth-logs';
const MAX_LOG_ENTRIES = 500;

declare global {
  interface Window {
    __bandwidthInterceptorInstalled?: boolean;
  }
}

function appendLog(entry: BandwidthLogEntry) {
  try {
    const raw = sessionStorage.getItem(BANDWIDTH_LOGS_KEY);
    const logs: BandwidthLogEntry[] = raw ? JSON.parse(raw) : [];
    logs.push(entry);
    // Cap the log to avoid blowing past the sessionStorage quota
    if (logs.length > MAX_LOG_ENTRIES) {
      logs.splice(0, logs.length - MAX_LOG_ENTRIES);
    }
    sessionStorage.setItem(BANDWIDTH_LOGS_KEY, JSON.stringify(logs));
  } catch {
    // Quota exceeded or storage unavailable — diagnostics must never break the app
  }
}

/**
 * Dev-only fetch interceptor. Mounted from the root layout in development;
 * records every fetch (URL, method, status, latency, payload size) into
 * sessionStorage for the /dev/bandwidth dashboard.
 */
export default function BandwidthInterceptor() {
  useEffect(() => {
    if (process.env.NODE_ENV !== 'development') return;
    if (window.__bandwidthInterceptorInstalled) return;
    window.__bandwidthInterceptorInstalled = true;

    const originalFetch = window.fetch.bind(window);

    window.fetch = async (input: RequestInfo | URL, init?: RequestInit) => {
      const url =
        typeof input === 'string'
          ? input
          : input instanceof URL
            ? input.href
            : input.url;
      const method = (init?.method ?? (input instanceof Request ? input.method : 'GET')).toUpperCase();
      const start = performance.now();

      const response = await originalFetch(input as RequestInfo, init);
      const latencyMs = Math.round(performance.now() - start);

      // Measure payload size on a clone so the caller's body stream is untouched
      void response
        .clone()
        .blob()
        .then((blob) => {
          appendLog({
            url,
            method,
            status: response.status,
            latencyMs,
            sizeBytes: blob.size,
            timestamp: Date.now(),
          });
        })
        .catch(() => {
          appendLog({
            url,
            method,
            status: response.status,
            latencyMs,
            sizeBytes: 0,
            timestamp: Date.now(),
          });
        });

      return response;
    };
  }, []);

  return null;
}
