import { notFound } from 'next/navigation';
import { createServiceClient } from '@/lib/supabase-server';
import { TalentIntake } from './TalentIntake';

export const dynamic = 'force-dynamic';

// ─── Deliverables shown on the intake form ──────────────────────────────────
// Order matters: it's the order the talent will see. Keys must match the
// rate_<key> columns on `players` and the platform values in `market_bands`.
const DELIVERABLES: Array<{
  key: string;
  rate_col: keyof PlayerRateColumns;
  band_platform: string;
  label: string;
  blurb: string;                     // copy aimed at the talent — connects deliverable to real campaign types
  group: 'Instagram' | 'TikTok' | 'YouTube' | 'X (Twitter)' | 'Twitch' | 'IRL'
       | 'Snapchat' | 'Kick' | 'Live & Stream' | 'Game Ads';
}> = [
  // ── Instagram (universal — every brand campaign uses it)
  { key: 'ig_reel',         rate_col: 'rate_ig_reel',         band_platform: 'rate_ig_reel',     label: 'Instagram Reel',           blurb: 'Sponsored 15–60s vertical — product reviews, game promo, lifestyle drops.',     group: 'Instagram' },
  { key: 'ig_static',       rate_col: 'rate_ig_static',       band_platform: 'rate_ig_post',     label: 'Instagram Post / Carousel', blurb: 'Single image or carousel — seeding, product features, partnership announcements.', group: 'Instagram' },
  { key: 'ig_story',        rate_col: 'rate_ig_story',        band_platform: 'rate_ig_post',     label: 'Instagram Story',          blurb: '24h frame — unboxings, in-moment shoutouts, swipe-ups.',                       group: 'Instagram' },
  // ── TikTok
  { key: 'tiktok_video',    rate_col: 'rate_tiktok_video',    band_platform: 'rate_tiktok_video',label: 'TikTok Video',             blurb: 'Original sponsored TikTok — product testing, game promo, brand integration.',  group: 'TikTok' },
  { key: 'tiktok_repost',   rate_col: 'rate_tiktok_repost',   band_platform: 'rate_tiktok_video',label: 'TikTok Repost',            blurb: 'Cross-post brand-supplied creative on your TikTok — seeding amplification.',   group: 'TikTok' },
  // ── YouTube
  { key: 'yt_short',        rate_col: 'rate_yt_short',        band_platform: 'rate_yt_short',    label: 'YouTube Short',            blurb: 'Vertical short — clips, teasers, drink-in-content moments.',                   group: 'YouTube' },
  { key: 'yt_video',        rate_col: 'rate_yt_video',        band_platform: 'rate_yt_full',     label: 'YouTube Video (long-form)',blurb: 'Full review, sponsored playthrough, brand narrative — most-common product-review asset globally.', group: 'YouTube' },
  { key: 'yt_short_repost', rate_col: 'rate_yt_short_repost', band_platform: 'rate_yt_short',    label: 'YouTube Short Repost',     blurb: 'Re-upload of brand-supplied vertical short.',                                  group: 'YouTube' },
  // ── X / Twitter
  { key: 'x_post',          rate_col: 'rate_x_post',          band_platform: 'rate_ig_post',     label: 'X / Twitter Post',         blurb: 'Sponsored tweet — announcements, brand mentions, link shares.',                group: 'X (Twitter)' },
  { key: 'x_repost',        rate_col: 'rate_x_repost',        band_platform: 'rate_ig_post',     label: 'X / Twitter Repost',       blurb: 'Quote-retweet brand content from your handle — seeding boost.',                group: 'X (Twitter)' },
  // ── Twitch (streamers)
  { key: 'twitch_stream',   rate_col: 'rate_twitch_stream',   band_platform: 'rate_yt_full',     label: 'Twitch Sponsored Stream',  blurb: 'Full live stream with brand integration — game launches, beta access, sponsored play.', group: 'Twitch' },
  { key: 'twitch_integ',    rate_col: 'rate_twitch_integ',    band_platform: 'rate_yt_short',    label: 'Twitch Integration',       blurb: 'In-stream brand segment — mid-roll mention, chat overlay, brief shoutout.',    group: 'Twitch' },
  // ── IRL (universal — events, activations, appearances)
  { key: 'irl',             rate_col: 'rate_irl',             band_platform: 'rate_irl',         label: 'IRL / Event Appearance',   blurb: 'Per-day on-site — product launches, brand activations, venue appearances.',     group: 'IRL' },
  // ── Snapchat (Migration 040 — KSA-relevant only)
  { key: 'snapchat',        rate_col: 'rate_snapchat',        band_platform: 'rate_ig_post',     label: 'Snapchat (single)',        blurb: 'One sponsored Snap on your story — KSA-native format, strong for FMCG and QSR.', group: 'Snapchat' },
  // ── Kick (Migration 040 — content-creator only currently)
  { key: 'kick_stream',     rate_col: 'rate_kick_stream',     band_platform: 'rate_yt_full',     label: 'Kick Sponsored Stream',    blurb: 'Full sponsored stream on Kick — for creators who stream there exclusively.',   group: 'Kick' },
  { key: 'kick_integ',      rate_col: 'rate_kick_integ',      band_platform: 'rate_yt_short',    label: 'Kick Integration',         blurb: 'Mid-stream brand segment / mention on Kick.',                                  group: 'Kick' },
  // ── Watch party (streamers)
  { key: 'watchparty',      rate_col: 'rate_watchparty',      band_platform: 'rate_yt_full',     label: 'Watch Party Stream',       blurb: 'Co-stream a tournament / event with brand integration — EWC season especially.', group: 'Live & Stream' },
  // ── Game Ads (Migration 042 — competitive players, Xsolla / publisher partners)
  { key: 'game_playthrough_full', rate_col: 'rate_game_playthrough_full', band_platform: 'rate_yt_full',  label: 'Game Playthrough (Full)',     blurb: 'Long-form sponsored playthrough of a brand title — game launches, expansions.', group: 'Game Ads' },
  { key: 'game_sponsored_match',  rate_col: 'rate_game_sponsored_match',  band_platform: 'rate_yt_full',  label: 'Sponsored Match',             blurb: 'Branded scrim / showmatch with overlay — game promo, brand activation.',         group: 'Game Ads' },
  { key: 'game_branded_skin_use', rate_col: 'rate_game_branded_skin_use', band_platform: 'rate_yt_short', label: 'Branded Skin / Loadout Use',  blurb: 'Featuring a brand skin or loadout in stream — partnership integrations.',         group: 'Game Ads' },
];

type PlayerRateColumns = {
  rate_ig_reel: number; rate_ig_static: number; rate_ig_story: number;
  rate_tiktok_video: number; rate_tiktok_repost: number;
  rate_yt_short: number; rate_yt_short_repost: number;
  rate_yt_video: number;  // long-form sponsored video (Migration ≤039)
  rate_x_post: number; rate_x_repost: number;
  rate_twitch_stream: number; rate_twitch_integ: number;
  rate_irl: number;
  // Mig 040 — Snapchat / Kick / Watch party
  rate_snapchat: number;
  rate_kick_stream: number; rate_kick_integ: number;
  rate_watchparty: number;
  // Mig 042 — Game-ad deliverables
  rate_game_playthrough_full: number;
  rate_game_sponsored_match: number;
  rate_game_branded_skin_use: number;
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

  // ─── Industry reference data (Migration 057+) ──────────────────────
  // Pull recent Falcons closed-deal aggregate so the talent sees real
  // campaign flow as a benchmark anchor — "brands ARE paying this".
  const since12mo = new Date();
  since12mo.setMonth(since12mo.getMonth() - 12);
  const { data: dealsRaw } = await supabase
    .from('sales_log')
    .select('amount_sar, amount_usd, platform, brand_name, deal_date, player_id, creator_id')
    .gte('deal_date', since12mo.toISOString().slice(0, 10));
  const deals = (dealsRaw ?? []) as Array<{
    amount_sar: number | null; amount_usd: number | null;
    platform: string | null;   brand_name: string | null;
    deal_date: string;         player_id: number | null; creator_id: number | null;
  }>;
  const dealsCount = deals.length;
  const dealsBrands = new Set(deals.map(d => d.brand_name).filter(Boolean)).size;
  const dealsTotalSar = deals.reduce((acc, d) => acc + Number(d.amount_sar ?? 0), 0);
  const dealsAvgSar = dealsCount ? Math.round(dealsTotalSar / dealsCount) : 0;
  const platformCounts = new Map<string, number>();
  for (const d of deals) {
    const k = (d.platform ?? '').trim();
    if (!k) continue;
    platformCounts.set(k, (platformCounts.get(k) ?? 0) + 1);
  }
  const topPlatforms = Array.from(platformCounts.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, 3)
    .map(([name, count]) => ({ name, count }));

  // Aggregate peer-org reach in this talent's region for the spend-context card.
  const peerOrgsTotalReach = peerOrgs.reduce((acc, p) => acc + Number(p.followers_total ?? 0), 0);

  const industryReference = {
    falcons: {
      dealsCount,
      dealsBrands,
      avgSar: dealsAvgSar,
      avgUsd: dealsAvgSar ? Math.round(dealsAvgSar / 3.75) : 0,
      topPlatforms,
    },
    peerOrgs: {
      count: peerOrgs.length,
      totalReach: peerOrgsTotalReach,
    },
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
          role:      player.role,
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
          x_handle:        player.x_handle ?? null,
          twitch:          player.twitch ?? null,
          kick:            player.kick ?? null,
          facebook:        player.facebook ?? null,
          snapchat:        player.snapchat ?? null,
          followers_kick:  Number(player.followers_kick ?? 0),
          followers_fb:    Number(player.followers_fb ?? 0),
          followers_snap:  Number(player.followers_snap ?? 0),
          // Migration 058 — revision lockout
          revision_count:  Number(player.intake_revision_count ?? 0),
          locked_until:    player.intake_locked_until ?? null,
          // Pricing-stack education inputs (mig 042/043 9-axis context)
          authority_factor: player.authority_factor == null ? null : Number(player.authority_factor),
          reach_multiplier: player.reach_multiplier == null ? null : Number(player.reach_multiplier),
          default_seasonality: player.default_seasonality == null ? null : Number(player.default_seasonality),
          default_language:    player.default_language == null ? null : Number(player.default_language),
          er_ig:           player.er_ig == null ? null : Number(player.er_ig),
          er_tiktok:       player.er_tiktok == null ? null : Number(player.er_tiktok),
          er_yt:           player.er_yt == null ? null : Number(player.er_yt),
          peak_tournament_tier: player.peak_tournament_tier ?? null,
          prize_money_24mo_usd: player.prize_money_24mo_usd == null ? null : Number(player.prize_money_24mo_usd),
        }}
        market={audienceMarket}
        deliverables={deliverables}
        peerOrgs={peerOrgs}
        industryReference={industryReference}
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
