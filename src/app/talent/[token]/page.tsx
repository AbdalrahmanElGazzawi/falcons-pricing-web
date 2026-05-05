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

  // Region for the player → drives which audience_market band we show.
  // 5-region taxonomy: KSA / MENA / EU / NA / APAC + GLOBAL fallback.
  const audienceMarket = regionFromNationality(player.nationality);

  // Pull bands for the talent's home market AND the GLOBAL ceiling. Both are
  // shown side-by-side on the intake page so the talent can anchor against
  // world-class peers without losing their local-market context.
  const { data: bandsTier } = await supabase
    .from('market_bands')
    .select('platform, min_sar, median_sar, max_sar, audience_market, source')
    .eq('tier_code', player.tier_code ?? 'Tier 3')
    .in('audience_market', [audienceMarket, 'GLOBAL']);

  const regionalBandFor = (platform: string) => {
    const candidates = (bandsTier ?? []).filter(b => b.platform === platform);
    return candidates.find(b => b.audience_market === audienceMarket)
        ?? candidates.find(b => b.audience_market === 'GLOBAL')
        ?? null;
  };

  const worldBandFor = (platform: string) => {
    const candidates = (bandsTier ?? []).filter(b => b.platform === platform);
    return candidates.find(b => b.audience_market === 'GLOBAL') ?? null;
  };

  // Pull peer-org rows for this region so the intake page can show 'others
  // in your region' as social proof. Only org-level public follower counts
  // are surfaced — no fabricated player rates.
  const { data: peerOrgsRaw } = await supabase
    .from('peer_orgs')
    .select('org_name, region, primary_game, hq_country, followers_total, source_url, notes')
    .eq('is_active', true)
    .eq('region', audienceMarket)
    .order('followers_total', { ascending: false })
    .limit(8);
  const peerOrgs = (peerOrgsRaw ?? []) as Array<{
    org_name: string; region: string; primary_game: string | null;
    hq_country: string | null; followers_total: number | null;
    source_url: string | null; notes: string | null;
  }>;

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
    band:       regionalBandFor(d.band_platform),            // talent's home-market band
    worldBand:  worldBandFor(d.band_platform),               // GLOBAL world-class anchor
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
          agency_status:   player.agency_status ?? null,
          agency_name:     player.agency_name ?? null,
          agency_fee_pct:  player.agency_fee_pct == null ? null : Number(player.agency_fee_pct),
          // Migration 057 — editable social handles
          instagram:       player.instagram ?? null,
          tiktok:          player.tiktok ?? null,
          youtube:         player.youtube ?? null,
          x_handle:       player.x_handle ?? null,
          twitch:          player.twitch ?? null,
        }}
        market={audienceMarket}
        deliverables={deliverables}
        peerOrgs={peerOrgs}
      />
    </Shell>
  );
}

// ─── helpers ────────────────────────────────────────────────────────────────
type IntakeRegion = 'KSA' | 'MENA' | 'EU' | 'NA' | 'APAC' | 'GLOBAL';
function regionFromNationality(nat: string | null | undefined): IntakeRegion {
  const n = (nat ?? '').toLowerCase().trim();
  if (!n) return 'GLOBAL';
  if (n.startsWith('saudi')) return 'KSA';
  if ([
    'emirati','bahraini','kuwaiti','qatari','omani',
    'egyptian','jordanian','lebanese','tunisian','moroccan',
    'algerian','iraqi','syrian','yemeni','libyan','sudanese','palestinian',
  ].includes(n)) return 'MENA';
  if ([
    'american','canadian','mexican',
  ].includes(n)) return 'NA';
  if ([
    'british','english','scottish','welsh','irish',
    'french','german','spanish','italian','portuguese','dutch','belgian',
    'swiss','austrian','swedish','norwegian','danish','finnish','icelandic',
    'polish','czech','slovak','hungarian','romanian','bulgarian',
    'ukrainian','russian','belarusian','estonian','latvian','lithuanian',
    'serbian','croatian','slovenian','bosnian','greek','turkish','cypriot',
    'albanian','macedonian','montenegrin','moldovan','luxembourgish','maltese',
  ].includes(n)) return 'EU';
  if ([
    'chinese','japanese','korean','south korean','north korean',
    'thai','vietnamese','indonesian','filipino','malaysian','singaporean',
    'indian','pakistani','bangladeshi','sri lankan','nepali',
    'australian','new zealander','taiwanese','hong konger','mongolian',
    'cambodian','laotian','burmese','myanmar',
  ].includes(n)) return 'APAC';
  return 'GLOBAL';
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
