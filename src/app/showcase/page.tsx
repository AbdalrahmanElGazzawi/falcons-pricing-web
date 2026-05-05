import { requireStaff } from '@/lib/auth';
import { Shell } from '@/components/Shell';
import { AccessDenied } from '@/components/AccessDenied';
import { ShowcaseContent } from './ShowcaseContent';

export const dynamic = 'force-dynamic';
export const revalidate = 0;
export const fetchCache = 'force-no-store';

export const metadata = {
  title: 'Talent Showcase — Team Falcons',
  description: 'Falcons roster — players, creators, championships, reach. Built for brand pitches.',
};

/**
 * /showcase — brand-pitch view of the roster.
 * Distinct from /roster/players which is the admin/operations table.
 * This page is meant to be screen-shared during a brand call: big hero,
 * polished talent cards, filterable for any brand brief on the fly.
 */
export default async function ShowcasePage() {
  const { denied, profile, supabase } = await requireStaff();
  if (denied) return <AccessDenied />;

  const [{ data: players }, { data: creators }] = await Promise.all([
    supabase
      .from('players')
      .select('id, nickname, full_name, role, game, team, nationality, tier_code, avatar_url, ' +
              'rate_ig_reel, rate_irl, authority_factor, measurement_confidence, ' +
              'followers_ig, followers_twitch, followers_yt, followers_tiktok, followers_x, followers_fb, followers_snap, ' +
              'instagram, twitch, youtube, tiktok, x_handle, kick, facebook, ' +
              'bio, achievements, date_of_birth, ingame_role, pricing_rationale, liquipedia_url')
      .eq('is_active', true)
      // Hide brand-account placeholders (e.g. "Team Falcons GG") from the showcase
      .not('role', 'in', '("Brand","Brand Account")'),
    supabase
      .from('creators')
      .select('id, nickname, full_name, nationality, tier_code, score, avatar_url, ' +
              'rate_ig_reel, rate_yt_full, rate_yt_short, rate_tiktok_ours, rate_twitch_kick_live, ' +
              'handle_ig, handle_x, handle_yt, handle_tiktok, handle_twitch, ' +
              'followers_ig, followers_x, followers_yt, followers_tiktok, followers_twitch, ' +
              'notes, link, is_active, past_campaigns, delivered_kpis, pricing_rationale')
      .or('is_active.is.null,is_active.eq.true'),
  ]);

  return (
    <Shell role={profile.role} email={profile.email} fullName={profile.full_name}>
      <ShowcaseContent
        players={(players ?? []) as any}
        creators={(creators ?? []) as any}
      />
    </Shell>
  );
}
