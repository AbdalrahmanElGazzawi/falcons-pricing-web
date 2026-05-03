import { notFound } from 'next/navigation';
import Link from 'next/link';
import { requireAdmin } from '@/lib/auth';
import { Shell, PageHeader } from '@/components/Shell';
import { AccessDenied } from '@/components/AccessDenied';
import { PricingBandsPanel } from '@/components/PricingBandsPanel';
import { ArrowLeft } from 'lucide-react';
import type { PricingInputs, MarketBandRow, CampaignSummary, ActiveOverride, ProductionGrade } from '@/lib/pricing-bands';

export const dynamic = 'force-dynamic';

export default async function PlayerPricingPage({ params }: { params: { id: string } }) {
  const { denied, profile, supabase } = await requireAdmin();
  if (denied) return <AccessDenied message="Admin only." />;

  const playerId = Number(params.id);
  if (!Number.isFinite(playerId)) notFound();

  // 1. Talent inputs (single row) from the view
  const { data: talentRow } = await supabase
    .from('talent_pricing_inputs')
    .select('*')
    .eq('talent_kind', 'player')
    .eq('talent_id', playerId)
    .single();
  if (!talentRow) notFound();

  // 2. Market bands for this tier (we'll filter further client-side per platform)
  const { data: bandRows } = await supabase
    .from('market_bands')
    .select('tier_code, game, audience_market, platform, min_sar, median_sar, max_sar, source, source_url')
    .eq('tier_code', talentRow.tier_code ?? '');

  // 3. Closed-deal campaigns for this player
  const { data: campaignRows } = await supabase
    .from('talent_campaigns_summary')
    .select('platform, deal_count, avg_sar, max_sar, last_sar, last_deal_date')
    .eq('talent_kind', 'player')
    .eq('talent_id', playerId);

  // 4. Active overrides (not superseded)
  const { data: overrideRows } = await supabase
    .from('pricing_band_overrides')
    .select('band, platform, override_value_sar, reason, effective_from, created_by_email, created_at')
    .eq('talent_kind', 'player')
    .eq('talent_id', playerId)
    .is('superseded_at', null);

  // 5. Production grades catalogue
  const { data: gradeRows } = await supabase
    .from('production_grades')
    .select('code, label, multiplier, cost_per_deliverable_sar')
    .eq('is_active', true)
    .order('sort_order');

  const talent = talentRow as PricingInputs;
  const bands = (bandRows ?? []) as MarketBandRow[];
  const campaigns = (campaignRows ?? []) as CampaignSummary[];
  const overrides = (overrideRows ?? []) as ActiveOverride[];
  const grades = (gradeRows ?? []) as ProductionGrade[];

  return (
    <Shell role={profile.role} email={profile.email} fullName={profile.full_name}>
      <Link href={`/admin/players/${playerId}`} className="inline-flex items-center gap-1 text-sm text-label hover:text-ink mb-3">
        <ArrowLeft size={14} /> Back to player edit
      </Link>
      <PageHeader
        title={`Pricing audit · ${talent.nickname}`}
        subtitle={[
          talent.tier_code ?? 'untiered',
          talent.audience_market ?? 'no market',
          talent.data_completeness ?? 'no data state',
          talent.game ?? '',
        ].filter(Boolean).join(' · ')}
      />
      <PricingBandsPanel
        talent={talent}
        bands={bands}
        campaigns={campaigns}
        overrides={overrides}
        grades={grades}
      />
    </Shell>
  );
}
