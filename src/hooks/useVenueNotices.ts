'use client';

import { useCallback, useEffect, useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import type { VenueNotice } from '@/lib/venueNotices';

// Shared across components so dismissing on My Venue clears the nav badge too
let cache: { userId: string; notices: VenueNotice[] } | null = null;
const listeners = new Set<(n: VenueNotice[]) => void>();
const publish = (userId: string, notices: VenueNotice[]) => {
  cache = { userId, notices };
  listeners.forEach((l) => l(notices));
};

/** Changes an admin made to the signed-in organizer's venues */
export function useVenueNotices() {
  const { user } = useAuth();
  const userId = user?.role === 'organizer' ? user.id : null;
  const [notices, setNotices] = useState<VenueNotice[]>(cache && cache.userId === userId ? cache.notices : []);

  useEffect(() => {
    listeners.add(setNotices);
    return () => {
      listeners.delete(setNotices);
    };
  }, []);

  const refresh = useCallback(async () => {
    if (!userId) return;
    try {
      const res = await fetch('/api/user/venue-notices', { cache: 'no-store' });
      if (res.ok) publish(userId, (await res.json()).notices || []);
    } catch {
      // Notices are best-effort
    }
  }, [userId]);

  useEffect(() => {
    if (userId && cache?.userId !== userId) refresh();
  }, [userId, refresh]);

  const dismiss = useCallback(
    async (id?: string) => {
      if (!userId) return;
      const next = id ? notices.filter((n) => n.id !== id) : [];
      publish(userId, next);
      await fetch(`/api/user/venue-notices${id ? `?id=${encodeURIComponent(id)}` : ''}`, { method: 'DELETE' }).catch(() => {});
    },
    [userId, notices]
  );

  return { notices: userId ? notices : [], refresh, dismiss };
}
