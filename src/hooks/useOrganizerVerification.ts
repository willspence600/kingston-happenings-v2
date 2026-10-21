'use client';

import { useCallback, useEffect, useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';

interface VerificationState {
  userId: string;
  isVerifiedOrganizer: boolean;
  verificationRequestedAt: string | null;
  organizerApproved: boolean;
  organizerVenueIds: string[];
}

/**
 * Verified-organizer status for the signed-in user. Admins are always verified;
 * organizers are verified by an admin (stored server-side in auth app_metadata,
 * so it's read through the API rather than the cached client session).
 */
export function useOrganizerVerification() {
  const { user, isAdmin } = useAuth();
  const userId = user?.role === 'organizer' ? user.id : null;
  const [state, setState] = useState<VerificationState | null>(null);

  useEffect(() => {
    if (!userId) return;
    let cancelled = false;
    fetch('/api/user/organizer-verification')
      .then((res) => (res.ok ? res.json() : null))
      .catch(() => null)
      .then((data) => {
        if (cancelled) return;
        setState({
          userId,
          isVerifiedOrganizer: !!data?.isVerifiedOrganizer,
          verificationRequestedAt: data?.verificationRequestedAt ?? null,
          organizerApproved: data?.organizerApproved !== false,
          organizerVenueIds: data?.organizerVenueIds ?? [],
        });
      });
    return () => {
      cancelled = true;
    };
  }, [userId]);

  // Only trust state fetched for the current organizer
  const current = userId && state?.userId === userId ? state : null;

  const requestVerification = useCallback(async () => {
    const res = await fetch('/api/user/organizer-verification', { method: 'POST' });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(data.error || 'Failed to send your request. Please try again.');
    if (userId) {
      setState((prev) => ({
        userId,
        isVerifiedOrganizer: !!data.isVerifiedOrganizer,
        verificationRequestedAt: data.verificationRequestedAt ?? null,
        organizerApproved: prev?.organizerApproved ?? true,
        organizerVenueIds: prev?.organizerVenueIds ?? [],
      }));
    }
  }, [userId]);

  return {
    isVerifiedOrganizer: isAdmin || !!current?.isVerifiedOrganizer,
    verificationRequestedAt: current?.verificationRequestedAt ?? null,
    organizerApproved: isAdmin || current?.organizerApproved !== false,
    organizerVenueIds: current?.organizerVenueIds ?? [],
    isLoading: !!userId && !current,
    requestVerification,
  };
}
