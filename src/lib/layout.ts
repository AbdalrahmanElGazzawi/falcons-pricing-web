import 'server-only';
import type { SupabaseClient } from '@supabase/supabase-js';

/**
 * Fetch the persisted section order for a page. If the row is missing or
 * unreadable, return the supplied default. Cleans the result so any unknown
 * sections are dropped and any missing-but-allowed sections are appended at
 * the end (so we never lose a section just because the persisted order is
 * stale relative to the code).
 */
export async function getPageLayout(
  supabase: SupabaseClient,
  page: string,
  defaultOrder: string[],
): Promise<string[]> {
  const { data } = await supabase
    .from('page_layouts')
    .select('section_order')
    .eq('page', page)
    .maybeSingle();

  const raw = (data?.section_order as string[] | undefined) ?? null;
  if (!raw || raw.length === 0) return defaultOrder;

  const allowed = new Set(defaultOrder);
  const seen = new Set<string>();
  const cleaned: string[] = [];
  for (const s of raw) {
    if (allowed.has(s) && !seen.has(s)) {
      cleaned.push(s);
      seen.add(s);
    }
  }
  for (const s of defaultOrder) {
    if (!seen.has(s)) cleaned.push(s);
  }
  return cleaned;
}
