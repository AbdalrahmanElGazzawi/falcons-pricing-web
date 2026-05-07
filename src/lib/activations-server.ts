import 'server-only';
import { createClient } from './supabase-server';
import type { Activation } from './activations';

/** Fetch active activations for the public catalogue. RLS-safe (anon read). */
export async function fetchActiveActivations(): Promise<Activation[]> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from('activations')
    .select('*')
    .eq('status', 'active')
    .order('kind', { ascending: true })
    .order('position', { ascending: true });
  if (error) {
    // eslint-disable-next-line no-console
    console.error('[fetchActiveActivations]', error);
    return [];
  }
  return (data ?? []) as Activation[];
}

/** Fetch ALL activations including drafts/retired. Staff-only via RLS. */
export async function fetchAllActivations(): Promise<Activation[]> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from('activations')
    .select('*')
    .order('kind', { ascending: true })
    .order('position', { ascending: true });
  if (error) {
    // eslint-disable-next-line no-console
    console.error('[fetchAllActivations]', error);
    return [];
  }
  return (data ?? []) as Activation[];
}
