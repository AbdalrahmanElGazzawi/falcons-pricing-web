import { notFound } from 'next/navigation';
import { createServiceClient } from '@/lib/supabase-server';
import { TalentIntake } from './TalentIntake';

export const dynamic = 'force-dynamic';

// ─── Deliverables shown on the intake form ──────────────────────────────────
// Order matters: it's the order the talent will see. Keys must match the
// rate_<key> columns on `players` and the platform values in `market_bands`.
const DELIVERABLES: Array<{
  key: string;                       // jsonb key in players.min_rates
  rate_col: keyof PlayerRateColumns; // current internal rate column
  band_platform: string;             // matches market_bands.platform
  label: string;
  blurb: string;
  group: 'Instagram' | 'TikTok' | 'YouTube' | 'X (Twitter)' | 'Twitch' | 'IRL';
}> = [
  { key: 'ig_reel',         rate_col: 'rate_ig_reel',         band_platform: 'rate_ig_reel',     label: 'Instagram Reel',           blurb: '15–60s sponsored vertical video on your IG.',           group: 'Instagram' },
  { key: 'ig_static',       rate_col: 'rate_ig_static',       band_platform: 'rate_ig_post',     label: 'Instagram Static / Carousel', blurb: 'Single image or carousel grid post.',                group: 'Instagram' },
  { key: 'ig_story',        rate_col: 'rate_ig_story',        band_platform: 'rate_ig_post',     label: 'Instagram Story',          blurb: '24-hour story frame, swipe-up included.',              group: 'Instagram' },
  { key: 'tiktok_video',    rate_col: 'rate_tiktok_video',    band_platform: 'rate_tiktok_video',label: 'TikTok Video',             blurb: 'Original 15–60s sponsored TikTok.',                    group: 'TikTok' },
  { key: 'tiktok_repost',   rate_col: 'rate_tiktok_repost',   band_platform: 'rate_tiktok_video',label: 'TikTok Repost',            blurb: 'Cross-post brand-supplied creative on your TikTok.',   group: 'TikTok' },
  { key: 'yt_short',        rate_col: 'rate_yt_short',        band_platform: 'rate_yt_short',    label: 'YouTube Short',            blurb: 'Vertical short on your YT channel.',                   group: 'YouTube' },
  { key: 'yt_short_repost', rate_col: 'rate_yt_short_repost', band_platform: 'rate_yt_short',    label: 'YouTube Short Repost',     blurb: 'Re-upload of brand-supplied vertical short.',          group: 'YouTube' },
  { key: 'x_post',          rate_col: 'rate_x_post',          band_platform: 'rate_ig_post',     label: 'X / Twitter Post',         blurb: 'Sponsored tweet from your handle.',                    group: 'X (Twitter)' },
  { key: 'x_repost',        rate_col: 'rate_x_repost',        band_platform: 'rate_ig_post',     label: 'X / Twitter Repost',       blurb: 'Quote-retweet brand content from your handle.',        group: 'X (Twitter)' },
  { key: 'twitch_stream',   rate_col: 'rate_twitch_stream',   band_platform: 'rate_yt_full',     label: 'Twitch Sponsored Stream',  blurb: 'Full live stream with brand integration.',             group: 'Twitch' },
  { key: 'twitch_integ',    rate_col: 'rate_twitch_integ',    band_platform: 'rate_yt_short',    label: 'Twitch Integration',       blurb: 'In-stream segment, mid-roll mention or chat overlay.', group: 'Twitch' },
  { key: 'irl',             rate_col: 'rate_irl',             band_platform: 'rate_irl',         label: 'IRL / Event Appearance',   blurb: 'Per-day on-site brand activation.',                    group: 'IRL' },
];

type PlayerRateColumns = {
  rate_ig_reel: number; rate_ig_static: number; rate_ig_story: number;
  rate_tiktok_video: number; rate_tiktok_repost: number;
  rate_yt_short: number; rate_yt_short_repost: number;
  rate_x_post: number; rate_x_repost: number;
  rate_twitch_stream: number; rate_twitch_integ: number;
  rate_irl: number;
};

export default async function TalentIntakePage({ params }: { params: { token: string } }) {
  const supabase = createServiceClient();

  const { data: playerRow } = await supabase
    .from('players')
    .select('*')
    .eq('intake_token', params.token)
    .maybeSingle();

  if (!playerRow) notFound();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const player: any = playerRow;
  if (player.is_active === false) {
    return (
      <Shell>
        <Card>
          <h1 className="text-lg font-semibold text-ink">Link no longer active</h1>
          <p className="text-sm text-label mt-1">
            Your manager will share an updated link. If you think this is an error,
            reach out to <a className="underline" href="mailto:talent@falcons.sa">talent@falcons.sa</a>.
          </p>
        </Card>
      </Shell>
    );
  }

  // Region for the player → drives which audience_market band we show
  const audienceMarket = regionFromNationality(player.nationality);

  // Pull market_bands for their tier × market — fall back to MENA if their
  // home market isn't seeded yet
  const { data: bandsTier } = await supabase
    .from('market_bands')
    .select('platform, min_sar, median_sar, max_sar, audience_market')
    .eq('tier_code', player.tier_code ?? 'Tier 3')
    .in('audience_market', [audienceMarket, 'MENA', 'KSA', 'Global']);

  // Resolve a single band per platform: prefer exact market match, else MENA, else first
  const bandFor = (platform: string) => {
    const candidates = (bandsTier ?? []).filter(b => b.platform === platform);
    return candidates.find(b => b.audience_market === audienceMarket)
        ?? candidates.find(b => b.audience_market === 'MENA')
        ?? candidates.find(b => b.audience_market === 'KSA')
        ?? candidates.find(b => b.audience_market === 'Global')
        ?? null;
  };

  // Mark intake as 'sent' the first time they open it
  if (player.intake_status === 'not_started') {
    void supabase.from('players').update({
      intake_status: 'sent', intake_sent_at: new Date().toISOString(),
    }).eq('id', player.id).then(() => null);

    void supabase.from('audit_log').insert({
      actor_email: 'talent@portal', actor_kind: 'system',
      action: 'talent.intake_opened', entity_type: 'player', entity_id: String(player.id),
      diff: { nickname: player.nickname, market: audienceMarket },
    }).then(() => null);
  }

  const deliverables = DELIVERABLES.map(d => ({
    key:        d.key,
    label:      d.label,
    blurb:      d.blurb,
    group:      d.group,
    internal:   Number((player as any)[d.rate_col] || 0),    // current internal price
    band:       bandFor(d.band_platform),                    // {min,median,max} SAR
    existing:   Number((player.min_rates ?? {})[d.key] || 0),// what they previously submitted
  }));

  return (
    <Shell>
      <TalentIntake
        token={params.token}
        player={{
          id:        player.id,
          nickname:  player.nickname,
          full_name: player.full_name,
          avatar_url: player.avatar_url,
          tier_code: player.tier_code,
          game:      player.game,
          team:      player.team,
          nationality: player.nationality,
          followers_ig:     Number(player.followers_ig ?? 0),
          followers_tiktok: Number(player.followers_tiktok ?? 0),
          followers_yt:     Number(player.followers_yt ?? 0),
          followers_x:      Number(player.followers_x ?? 0),
          followers_twitch: Number(player.followers_twitch ?? 0),
          achievements:    Array.isArray(player.achievements) ? player.achievements : [],
          liquipedia_url:  player.liquipedia_url ?? null,
          submitted_at:    player.intake_submitted_at,
          status:          player.intake_status,
          notes:           player.min_rates_notes ?? '',
        }}
        market={audienceMarket}
        deliverables={deliverables}
      />
    </Shell>
  );
}

// ─── helpers ────────────────────────────────────────────────────────────────
function regionFromNationality(nat: string | null | undefined): 'KSA' | 'MENA' | 'Global' {
  const n = (nat ?? '').toLowerCase().trim();
  if (n.startsWith('saudi')) return 'KSA';
  if (['emirati','bahraini','kuwaiti','qatari','omani','egyptian','jordanian','lebanese','tunisian','moroccan','algerian','iraqi','syrian','yemeni','libyan','sudanese','palestinian'].includes(n)) return 'MENA';
  return 'Global';
}

function Shell({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-bg">
      <div className="max-w-4xl mx-auto p-4 sm:p-8">{children}</div>
    </div>
  );
}
function Card({ children }: { children: React.ReactNode }) {
  return <div className="rounded-2xl border border-line bg-card p-6 shadow-sm">{children}</div>;
}
