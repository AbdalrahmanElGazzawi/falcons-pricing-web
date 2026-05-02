'use client';
import { useEffect, useState } from 'react';

/**
 * Tier-review settings hook — persisted in localStorage so admins can manage
 * the auto-flag (player or creator off-tier) without a DB migration.
 *
 *   disabled  → hide badges + filter pill
 *   tolerance → fraction (0..0.5) — within ±tol of a cutoff stays 'ok'
 *   dismissed → set of talent IDs the admin has explicitly approved as-is
 *
 * Used by both the Roster (players) and the Creator Rate Card so the same
 * admin gestures apply across talent types. Pass a `scope` so player IDs and
 * creator IDs don't collide in localStorage.
 */
export function useTierReviewSettings(scope: 'players' | 'creators' = 'players') {
  const KEY_DISABLED  = `falcons.tierReview.${scope}.disabled`;
  const KEY_TOLERANCE = `falcons.tierReview.${scope}.tolerance`;
  const KEY_DISMISSED = `falcons.tierReview.${scope}.dismissed`;

  // Backwards-compat: roster originally wrote to falcons.tierReview.* (no scope).
  // Read those legacy keys on first load so existing approved players carry over.
  const LEGACY_DISABLED  = 'falcons.tierReview.disabled';
  const LEGACY_TOLERANCE = 'falcons.tierReview.tolerance';
  const LEGACY_DISMISSED = 'falcons.tierReview.dismissed';

  const [disabled, setDisabledState] = useState(false);
  const [tolerance, setToleranceState] = useState(0);
  const [dismissed, setDismissedState] = useState<Set<number>>(() => new Set());
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    try {
      const dRaw = localStorage.getItem(KEY_DISABLED) ?? (scope === 'players' ? localStorage.getItem(LEGACY_DISABLED) : null);
      setDisabledState(dRaw === 'true');

      const tRaw = localStorage.getItem(KEY_TOLERANCE) ?? (scope === 'players' ? localStorage.getItem(LEGACY_TOLERANCE) : null);
      const t = Number(tRaw ?? '0');
      setToleranceState(Number.isFinite(t) ? Math.max(0, Math.min(t, 0.5)) : 0);

      const idsRaw = localStorage.getItem(KEY_DISMISSED) ?? (scope === 'players' ? localStorage.getItem(LEGACY_DISMISSED) : null) ?? '[]';
      const arr = JSON.parse(idsRaw);
      setDismissedState(new Set(
        Array.isArray(arr) ? arr.map((x: any) => Number(x)).filter((x: number) => Number.isFinite(x)) : []
      ));
    } catch { /* localStorage unavailable */ }
    setHydrated(true);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const setDisabled = (v: boolean) => {
    setDisabledState(v);
    try { localStorage.setItem(KEY_DISABLED, String(v)); } catch {}
  };
  const setTolerance = (v: number) => {
    const clamped = Math.max(0, Math.min(v, 0.5));
    setToleranceState(clamped);
    try { localStorage.setItem(KEY_TOLERANCE, String(clamped)); } catch {}
  };
  const dismiss = (id: number) => {
    setDismissedState(prev => {
      const next = new Set(prev); next.add(id);
      try { localStorage.setItem(KEY_DISMISSED, JSON.stringify([...next])); } catch {}
      return next;
    });
  };
  const restore = (id: number) => {
    setDismissedState(prev => {
      const next = new Set(prev); next.delete(id);
      try { localStorage.setItem(KEY_DISMISSED, JSON.stringify([...next])); } catch {}
      return next;
    });
  };
  const restoreAll = () => {
    setDismissedState(new Set());
    try { localStorage.removeItem(KEY_DISMISSED); } catch {}
  };
  return { disabled, setDisabled, tolerance, setTolerance, dismissed, dismiss, restore, restoreAll, hydrated };
}

export type TierReviewSettings = ReturnType<typeof useTierReviewSettings>;
