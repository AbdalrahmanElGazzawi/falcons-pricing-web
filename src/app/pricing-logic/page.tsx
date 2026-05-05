import { requireStaff } from '@/lib/auth';
import { Shell } from '@/components/Shell';
import { AccessDenied } from '@/components/AccessDenied';
import { PricingLogicContent } from './PricingLogicContent';

export const dynamic = 'force-dynamic';
export const revalidate = 0;
export const fetchCache = 'force-no-store';

export const metadata = {
  title: 'Current Pricing Logic — Team Falcons Pricing',
  description: 'Live snapshot of how every category, team, and role is priced today — and how it will evolve.',
};

/**
 * /pricing-logic — operational complement to /about.
 *   /about       = methodology principles (the formula, the philosophy)
 *   /pricing-logic = what's actually live in the database right now,
 *                    why each segment is priced the way it is, and
 *                    where it's heading once Shikenso + regional adjusters land.
 *
 * Numbers fetched live from Supabase so the page never goes stale relative
 * to the engine. Commentary (the "why" + evolution) is curated in the
 * client component.
 */
export default async function PricingLogicPage() {
  const { denied, profile, supabase } = await requireStaff();
  if (denied) return <AccessDenied />;

  // Pull live distributions in parallel — by tier, game, team, region, plus creators
  const [
    { data: players },
    { data: creators },
    { data: tiers },
  ] = await Promise.all([
    supabase
      .from('players')
      .select('id, nickname, role, game, team, nationality, tier_code, rate_ig_reel, rate_irl, authority_factor, measurement_confidence, liquipedia_url, prize_money_24mo_usd, audience_market, is_bookable, profile_strength_pct, intake_status, base_rate_anchor')
      .eq('is_active', true),
    supabase
      .from('creators')
      .select('id, nickname, tier_code, rate_ig_reels, rate_yt_full, rate_tiktok_ours, is_bookable, profile_strength_pct'),
    supabase.from('tiers').select('code, label, base_fee_min, base_fee_max, floor_share, sort_order').order('sort_order'),
  ]);

  return (
    <Shell role={profile.role} email={profile.email} fullName={profile.full_name}>
      <PricingLogicContent
        players={players ?? []}
        creators={creators ?? []}
        tiers={tiers ?? []}
      />
    </Shell>
  );
}
