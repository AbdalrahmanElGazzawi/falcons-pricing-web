import Link from 'next/link';
import { requireStaff } from '@/lib/auth';
import { Shell, PageHeader } from '@/components/Shell';
import { AccessDenied } from '@/components/AccessDenied';
import { RosterAuditView } from './RosterAuditView';

export const dynamic = 'force-dynamic';
export const revalidate = 0;
export const fetchCache = 'force-no-store';

export const metadata = {
  title: 'Pricing Audit — Roster',
  description: 'Per-player base-rate audit against the v8 methodology. Flags underpriced talent, tier mismatches, and locked-but-unverified data.',
};

/**
 * /roster/audit — actionable rate-card audit.
 * Pulls every active player + computes expected tier (from max-platform-reach)
 * and expected rate (linear interpolation inside tier band), then flags every
 * row whose current rate / tier diverges from methodology so the user can fix
 * one at a time or run a bulk recalibration.
 */
export default async function RosterAuditPage() {
  const { denied, profile, supabase } = await requireStaff();
  if (denied) return <AccessDenied />;

  const [{ data: players }, { data: tiers }] = await Promise.all([
    supabase
      .from('players')
      .select('id, nickname, full_name, role, game, team, nationality, tier_code, ' +
              'rate_ig_reel, rate_irl, measurement_confidence, ' +
              'followers_ig, followers_twitch, followers_yt, followers_tiktok, followers_x, followers_fb, followers_snap')
      .eq('is_active', true),
    supabase.from('tiers').select('code, label, base_fee_min, base_fee_max, sort_order').order('sort_order'),
  ]);

  return (
    <Shell role={profile.role} email={profile.email} fullName={profile.full_name}>
      <PageHeader
        title="Pricing Audit"
        subtitle="Per-player rate vs methodology check. Click any row to open the player editor — or fix in bulk."
        action={
          <Link href="/roster/players" className="btn btn-ghost text-xs">← Back to roster</Link>
        }
      />
      <RosterAuditView
        players={(players ?? []) as any}
        tiers={(tiers ?? []) as any}
        isAdmin={profile.role === 'admin'}
      />
    </Shell>
  );
}
