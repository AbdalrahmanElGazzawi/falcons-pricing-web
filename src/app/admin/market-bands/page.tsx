import { requireAdmin } from '@/lib/auth';
import { Shell, PageHeader } from '@/components/Shell';
import { AccessDenied } from '@/components/AccessDenied';
import { MarketBandsEditor } from './MarketBandsEditor';
import type { MarketBand } from '@/lib/market-bands';

export const dynamic = 'force-dynamic';

export default async function MarketBandsAdmin() {
  const { denied, profile, supabase } = await requireAdmin();
  if (denied) return <AccessDenied message="Admin only." />;

  const [{ data: bands }, { data: tiers }] = await Promise.all([
    supabase.from('market_bands').select('*').is('effective_to', null)
      .order('tier_code').order('audience_market').order('platform').order('game', { nullsFirst: true }),
    supabase.from('tiers').select('code, label').order('sort_order'),
  ]);

  const games = await supabase
    .from('players')
    .select('game')
    .eq('is_active', true)
    .not('game', 'is', null);
  const gameOptions = Array.from(new Set((games.data ?? []).map(r => r.game as string).filter(Boolean))).sort();

  return (
    <Shell role={profile.role} email={profile.email} fullName={profile.full_name}>
      <PageHeader
        title="Market Bands"
        subtitle="Defensible Floor / Anchor / Stretch ranges per tier × game × audience × platform. Source-attributed. Used by the F/A/S/C panel and the variance register."
      />
      <MarketBandsEditor
        initialBands={(bands ?? []) as MarketBand[]}
        tiers={(tiers ?? []).map(t => t.code)}
        gameOptions={gameOptions}
      />
    </Shell>
  );
}
