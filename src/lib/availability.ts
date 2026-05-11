/**
 * Talent × brand availability check for QuoteBuilder.
 *
 * Reads from public.v_talent_brand_commitments_with_economics (Migration 082)
 * and returns a per-talent availability state used to render ✅/⚠️/⛔ badges
 * and gate the "Add to quote" button.
 *
 * computeLine (engine math, src/lib/pricing.ts) stays pure and is NOT
 * involved — this is a pre-pricing collision check, called server-side
 * before the line is rendered.
 */

import type { SupabaseClient } from '@supabase/supabase-js';

export type AvailabilityState = 'available' | 'clearance_required' | 'blocked';

export interface CommitmentConflict {
  commitment_id: number;
  brand: string;
  brand_parent: string | null;
  category_name: string;
  category_code: string;
  exclusivity_scope: string | null;
  exclusivity_type: string | null;
  competitor_blocklist: string[];
  term_start: string | null;
  term_end: string | null;
  status: 'previous' | 'current' | 'future';
  reason:
    | 'category_exclusive'
    | 'category_sub_exclusive'
    | 'brand_in_blocklist'
    | 'brand_parent_in_blocklist'
    | 'future_lock';
}

export interface AvailabilityResult {
  talent_id: number;
  availability: AvailabilityState;
  conflicts: CommitmentConflict[];
}

export interface AvailabilityRequest {
  talent_ids: number[];
  brand: string;                 // The brand being pitched (e.g. "GameSir")
  brand_parent?: string | null;  // Optional holding-co (e.g. "Pepsi" → "PepsiCo")
  category_code: string;         // commercial_categories.code (e.g. "controller")
  delivery_date?: string;        // ISO date; defaults to today
  territory?: string | null;     // Optional territory filter (Worldwide / MENA / ...)
}

/**
 * Normalises a brand string for fuzzy match against competitor_blocklist[].
 */
function norm(s: string): string {
  return s.trim().toLowerCase().replace(/\s+/g, ' ');
}

/**
 * Decide whether a single commitment row conflicts with the requested pitch.
 * Returns null if no conflict; otherwise returns the conflict reason metadata.
 */
function classifyConflict(
  row: any,
  req: AvailabilityRequest,
  deliveryDate: string,
): CommitmentConflict | null {
  // Time window: only commitments that are active on the delivery date matter
  // for blocking. Future commitments warn (clearance_required); previous don't.
  const start = row.term_start as string | null;
  const end = row.term_end as string | null;
  const isFuture = start && start > deliveryDate;
  const isPast = end && end < deliveryDate;
  if (isPast) return null; // expired — no conflict

  const brandNorm = norm(req.brand);
  const parentNorm = req.brand_parent ? norm(req.brand_parent) : null;
  const blocklist = (row.competitor_blocklist || []).map((s: string) => norm(s));

  // Brand or parent literally in this commitment's blocklist → conflict
  if (blocklist.includes(brandNorm)) {
    return {
      commitment_id: row.id,
      brand: row.brand,
      brand_parent: row.brand_parent ?? null,
      category_name: row.commercial_category_id ? '' : '', // patched below
      category_code: '',
      exclusivity_scope: row.exclusivity_scope ?? null,
      exclusivity_type: row.exclusivity_type ?? null,
      competitor_blocklist: row.competitor_blocklist || [],
      term_start: start,
      term_end: end,
      status: row.status,
      reason: 'brand_in_blocklist',
    };
  }
  if (parentNorm && blocklist.includes(parentNorm)) {
    return {
      commitment_id: row.id,
      brand: row.brand,
      brand_parent: row.brand_parent ?? null,
      category_name: '',
      category_code: '',
      exclusivity_scope: row.exclusivity_scope ?? null,
      exclusivity_type: row.exclusivity_type ?? null,
      competitor_blocklist: row.competitor_blocklist || [],
      term_start: start,
      term_end: end,
      status: row.status,
      reason: 'brand_parent_in_blocklist',
    };
  }

  // Same category → exclusivity classification
  if (row.category_code === req.category_code) {
    const reason =
      row.exclusivity_type === 'Exclusive'
        ? 'category_exclusive'
        : row.exclusivity_type === 'Sub-exclusive'
        ? 'category_sub_exclusive'
        : null;
    if (!reason) return null;
    return {
      commitment_id: row.id,
      brand: row.brand,
      brand_parent: row.brand_parent ?? null,
      category_name: row.category_name ?? '',
      category_code: row.category_code,
      exclusivity_scope: row.exclusivity_scope ?? null,
      exclusivity_type: row.exclusivity_type ?? null,
      competitor_blocklist: row.competitor_blocklist || [],
      term_start: start,
      term_end: end,
      status: row.status,
      reason: isFuture ? 'future_lock' : reason,
    };
  }

  return null;
}

/**
 * Roll up per-talent conflicts into a single availability state.
 *
 * - ⛔ blocked            = any current Exclusive same-category commitment, or
 *                          any current brand/parent in a competitor blocklist
 * - ⚠️ clearance_required = any current Sub-exclusive, or any future_lock,
 *                          or a non-exclusive same-category match
 * - ✅ available          = no conflicts found
 */
function rollUp(conflicts: CommitmentConflict[]): AvailabilityState {
  if (conflicts.length === 0) return 'available';
  const hasBlocker = conflicts.some(
    (c) =>
      c.reason === 'category_exclusive' ||
      c.reason === 'brand_in_blocklist' ||
      c.reason === 'brand_parent_in_blocklist',
  );
  if (hasBlocker) return 'blocked';
  return 'clearance_required';
}

/**
 * Server-side: get availability for a set of talents against a single
 * brand/category pitch. Uses the supabase client passed in (typically
 * the service_role client from requireAdmin/requireAuth).
 */
export async function getAvailability(
  supabase: SupabaseClient,
  req: AvailabilityRequest,
): Promise<Record<number, AvailabilityResult>> {
  const deliveryDate =
    req.delivery_date && /^\d{4}-\d{2}-\d{2}$/.test(req.delivery_date)
      ? req.delivery_date
      : new Date().toISOString().slice(0, 10);

  if (!req.talent_ids || req.talent_ids.length === 0) {
    return {};
  }

  // Fetch all commitments for the requested talents joined with category code.
  // We join the view (which exposes computed status) with commercial_categories
  // to surface category_code on every row.
  const { data, error } = await supabase
    .from('v_talent_brand_commitments_with_economics')
    .select(
      `id, talent_id, brand, brand_parent,
       commercial_category_id, exclusivity_scope, exclusivity_type,
       competitor_blocklist, term_start, term_end, status,
       commercial_categories!inner ( code, name )`,
    )
    .in('talent_id', req.talent_ids);

  if (error) {
    // If anything goes wrong, fail OPEN — never block sales on a stale schema
    // hiccup. Return 'available' for everyone with no conflicts. This is logged.
    // eslint-disable-next-line no-console
    console.error('[availability] query failed, failing open:', error.message);
    const empty: Record<number, AvailabilityResult> = {};
    for (const tid of req.talent_ids) {
      empty[tid] = { talent_id: tid, availability: 'available', conflicts: [] };
    }
    return empty;
  }

  // Flatten category code onto each row for the classifier.
  const rows = (data ?? []).map((r: any) => ({
    ...r,
    category_code: r.commercial_categories?.code ?? null,
    category_name: r.commercial_categories?.name ?? null,
  }));

  const out: Record<number, AvailabilityResult> = {};
  for (const tid of req.talent_ids) {
    out[tid] = { talent_id: tid, availability: 'available', conflicts: [] };
  }
  for (const row of rows) {
    const conflict = classifyConflict(row, req, deliveryDate);
    if (!conflict) continue;
    const existing = out[row.talent_id];
    if (!existing) continue;
    existing.conflicts.push(conflict);
  }
  for (const tid of req.talent_ids) {
    out[tid].availability = rollUp(out[tid].conflicts);
  }
  return out;
}

/**
 * Pretty-print a conflict reason for the UI badge tooltip.
 */
export function describeConflict(c: CommitmentConflict): string {
  switch (c.reason) {
    case 'category_exclusive':
      return `Exclusive ${c.category_name || c.category_code} deal with ${c.brand}`;
    case 'category_sub_exclusive':
      return `Sub-exclusive ${c.category_name || c.category_code} with ${c.brand} — clearance required`;
    case 'brand_in_blocklist':
      return `Competitor blocklist: ${c.brand} bars this pitch`;
    case 'brand_parent_in_blocklist':
      return `Holding-co blocklist: ${c.brand} (parent) bars this pitch`;
    case 'future_lock':
      return `Future commitment to ${c.brand} starts ${c.term_start} — clearance required`;
    default:
      return `Conflict with ${c.brand}`;
  }
}
