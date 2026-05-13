import { notFound } from 'next/navigation';
import Link from 'next/link';
import { requireStaff } from '@/lib/auth';
import { Shell, PageHeader } from '@/components/Shell';
import { AccessDenied } from '@/components/AccessDenied';
import { ArrowLeft, Check, X, Info } from 'lucide-react';
import { CHANNEL_PRESETS, resolveChannelMultiplier } from '@/lib/pricing';
import { fmtCurrency } from '@/lib/utils';
import { AuthorityChip } from '@/components/AuthorityChip';
import { ArchetypeChip } from '@/components/ArchetypeChip';
import { ProfileCapabilities } from '@/components/ProfileCapabilities';
import { ConfidenceChip } from '@/components/ConfidenceChip';
import { getAnchorPremium, getAuthorityTierMeta } from '@/lib/authority-tier';

export const dynamic = 'force-dynamic';

/**
 * Quick Estimate per talent — sales-facing read-only view.
 * Locks the engine base, shows the channel × platform matrix, surfaces the
 * data coverage. No overrides here — for deep edits use /pricing.
 */
export default async function QuickEstimatePage({ params }: { params: { id: string } }) {
  const { denied, profile, supabase } = await requireStaff();
  if (denied) return <AccessDenied message="Staff only." />;

  const playerId = Number(params.id);
  if (!Number.isFinite(playerId)) notFound();

  const { data: p } = await supabase
    .from('players')
    .select(`
      id, nickname, full_name, tier_code, audience_market, game, role,
      base_rate_anchor, reach_multiplier, achievement_decay_factor,
      rate_ig_reel, rate_ig_post, rate_ig_story,
      rate_tiktok_video, rate_yt_short, rate_yt_full,
      rate_twitch_stream, rate_kick_stream, rate_irl,
      rate_snapchat, rate_event_snap, rate_x_post,
      rate_snap_repost, rate_snap_coverage, rate_snap_takeover, rate_snap_discover,
      rate_watchparty,
      rate_game_playthrough_full, rate_game_preview_demo, rate_game_tutorial,
      rate_game_speedrun_challenge, rate_game_reaction_video, rate_game_clip_series_short,
      rate_game_branded_skin_use, rate_game_sponsored_match, rate_game_launch_event_irl,
      rate_game_beta_first_access, rate_game_review_long_form, rate_game_dev_co_stream,
      rate_usage_monthly, rate_promo_monthly,
      followers_ig, followers_tiktok, followers_yt, followers_twitch,
      followers_x, followers_kick, followers_snap, followers_fb,
      instagram, tiktok, youtube, x_handle, twitch, kick, facebook, snapchat,
      agency_fee_pct,
      er_ig, er_tiktok, er_yt, er_twitch, er_x,
      peak_tournament_tier, last_major_finish_date, last_major_placement,
      liquipedia_synced_at, audience_data_verified, engagement_data_verified,
      data_completeness, agency_status, agency_name, agency_contact,
      min_rates, rate_source, prize_money_24mo_usd,
      authority_tier, authority_tier_override,
      archetype, archetype_override, stream_intensity, content_intensity,
      solo_video, cinematic_ready, irl_availability, peak_platforms, bilingual,
      profile_strength_pct,
      twitch_30d_avg_ccv, twitch_30d_peak_ccv, twitch_30d_hours_streamed,
      twitch_30d_live_views, twitch_30d_new_follows,
      twitch_30d_unique_viewers, twitch_30d_hours_watched,
      yt_28d_views, yt_28d_impressions, yt_28d_unique_viewers, yt_28d_ctr_pct,
      yt_28d_new_viewers_reached, yt_28d_avg_watch_time_seconds,
      ig_30d_reach, ig_30d_avg_reel_views, tiktok_30d_avg_views,
      posts_per_week_ig, posts_per_week_tiktok, videos_per_week_yt, streams_per_week_twitch,
      english_proficiency, min_lead_time_days, editing_team_size,
      independent_sponsorship_clause_type, independent_sponsorship_notice_days,
      independent_sponsorship_clause_text, contract_source_doc_link,
      metrics_30d_synced_at
    `)
    .eq('id', playerId)
    .single();

  if (!p) notFound();

  // Parallel fetch — commercial commitments + Schedule-1 reserved categories
  const [{ data: commitments }, { data: reservedCats }] = await Promise.all([
    supabase.from('talent_brand_commitments')
      .select('id, brand, brand_parent, commercial_category_id, sub_category, exclusivity_scope, exclusivity_type, competitor_blocklist, territory, term_start, term_end, source_doc_link, notes, commercial_categories(name, code)')
      .eq('talent_id', playerId)
      .order('created_at', { ascending: false }),
    supabase.from('talent_reserved_categories')
      .select('id, commercial_category_id, sub_category, permitted_territory, permitted_distribution, notice_days_override, source_clause, commercial_categories(name, code)')
      .eq('talent_id', playerId)
      .order('id', { ascending: true }),
  ]);
  type CommitmentRow = { id: number; brand: string; brand_parent: string | null; commercial_category_id: number; sub_category: string | null; exclusivity_scope: string | null; exclusivity_type: string | null; competitor_blocklist: string[] | null; territory: string | null; term_start: string | null; term_end: string | null; source_doc_link: string | null; notes: string | null; commercial_categories: { name: string; code: string } | null };
  type ReservedRow   = { id: number; commercial_category_id: number; sub_category: string | null; permitted_territory: string | null; permitted_distribution: string[] | null; notice_days_override: number | null; source_clause: string | null; commercial_categories: { name: string; code: string } | null };
  const commitmentList: CommitmentRow[] = (commitments ?? []) as unknown as CommitmentRow[];
  const reservedList:   ReservedRow[]   = (reservedCats ?? []) as unknown as ReservedRow[];

  // Top-of-card platforms in display order (most-quoted first).
  const PLATFORMS: Array<{ key: keyof typeof p; label: string; ratio: number }> = [
    { key: 'rate_ig_reel',       label: 'IG Reel',         ratio: 1.00 },
    { key: 'rate_ig_post',     label: 'IG Post',         ratio: 0.65 },
    { key: 'rate_ig_story',      label: 'IG Story',        ratio: 0.55 },
    { key: 'rate_tiktok_video',  label: 'TikTok Video',    ratio: 0.80 },
    { key: 'rate_yt_short',      label: 'YT Short',        ratio: 0.60 },
    { key: 'rate_yt_full',       label: 'YT Full Video',   ratio: 2.25 },
    { key: 'rate_twitch_stream', label: 'Twitch Stream',   ratio: 1.45 },
    { key: 'rate_kick_stream',   label: 'Kick Stream',     ratio: 1.45 },
    { key: 'rate_x_post',        label: 'X Post',          ratio: 0.20 },
    { key: 'rate_snapchat',      label: 'Snapchat',        ratio: 0.45 },
    { key: 'rate_event_snap',    label: 'Event Snap',         ratio: 2.20 },
    { key: 'rate_snap_repost',   label: 'Snap Repost',        ratio: 0.20 },
    { key: 'rate_snap_coverage', label: 'Snap Coverage 1-day', ratio: 0.65 },
    { key: 'rate_snap_takeover', label: 'Snap Takeover',      ratio: 1.50 },
    { key: 'rate_snap_discover', label: 'Snap Discover',      ratio: 0.85 },
    { key: 'rate_watchparty',    label: 'Watch Party (hosted)', ratio: 1.65 },
    { key: 'rate_irl',           label: 'IRL Appearance',     ratio: 2.20 },
    { key: 'rate_game_preview_demo',     label: 'Game: Pre-release Demo', ratio: 1.80 },
    { key: 'rate_game_playthrough_full', label: 'Game: Full Playthrough', ratio: 2.50 },
    { key: 'rate_game_review_long_form', label: 'Game: Long-form Review', ratio: 2.20 },
    { key: 'rate_game_tutorial',         label: 'Game: How-to Tutorial',  ratio: 1.40 },
    { key: 'rate_game_sponsored_match',  label: 'Game: Sponsored Match',  ratio: 1.50 },
    { key: 'rate_game_dev_co_stream',    label: 'Game: Dev Co-Stream',    ratio: 1.60 },
    { key: 'rate_game_launch_event_irl', label: 'Game: Launch Event IRL', ratio: 2.50 },
    { key: 'rate_game_speedrun_challenge', label: 'Game: Speedrun', ratio: 1.60 },
    { key: 'rate_game_clip_series_short', label: 'Game: Clip Series', ratio: 1.30 },
    { key: 'rate_game_branded_skin_use', label: 'Game: Branded Skin Use', ratio: 1.20 },
    { key: 'rate_game_beta_first_access', label: 'Game: Beta First-Access', ratio: 1.80 },
    { key: 'rate_game_reaction_video',   label: 'Game: Reaction Video',   ratio: 0.90 },
    { key: 'rate_usage_monthly', label: '1-Mo Usage Rights', ratio: 1.50 },
  ];

  const base = Number(p.base_rate_anchor) || 0;
  const reachMult = Number(p.reach_multiplier) || 1.0;
  const decay = Number(p.achievement_decay_factor) || 1.0;

  // Migration 071 — anchor_premium is the engine's quote-time lift on baseFee
  // (AT-1 ×1.40, AT-2 ×1.20, AT-3 ×1.10, AT-4 ×1.00, AT-5 ×0.95, AT-0 ×1.00).
  // Stored rate × anchor_premium = effective baseFee the engine actually uses
  // on every quote line. We surface effective as the headline so sales sees
  // the same number the engine uses.
  const anchorPremium = getAnchorPremium(p as { authority_tier?: string | null; authority_tier_override?: string | null });
  const authorityMeta = getAuthorityTierMeta(p as { authority_tier?: string | null; authority_tier_override?: string | null });
  const effectiveBase = Math.round(base * anchorPremium);

  // Data coverage signals (green check / red x)
  const signals: Array<[string, boolean, string | null]> = [
    ['IG followers',        !!p.followers_ig,       p.followers_ig ? `${(p.followers_ig/1000).toFixed(0)}k` : null],
    ['TikTok followers',    !!p.followers_tiktok,   p.followers_tiktok ? `${(p.followers_tiktok/1000).toFixed(0)}k` : null],
    ['YouTube followers',   !!p.followers_yt,       p.followers_yt ? `${(p.followers_yt/1000).toFixed(0)}k` : null],
    ['Twitch followers',    !!p.followers_twitch,   p.followers_twitch ? `${(p.followers_twitch/1000).toFixed(0)}k` : null],
    ['IG engagement rate',  !!p.er_ig,              p.er_ig ? `${(p.er_ig*100).toFixed(1)}%` : null],
    ['Liquipedia synced',   !!p.liquipedia_synced_at, p.liquipedia_synced_at?.slice(0,10) ?? null],
    ['Peak tournament tier', !!p.peak_tournament_tier, p.peak_tournament_tier ?? null],
    ['Audience demographics', !!p.audience_data_verified, null],
    ['Agency known',        p.agency_status === 'agency' || p.agency_status === 'direct',
                            p.agency_name ?? p.agency_status ?? null],
    ['Talent intake (min_rates)', !!(p.min_rates && Object.keys(p.min_rates).length > 0), null],
  ];

  // Reasoning string for the base
  const baseReason: string[] = [];
  baseReason.push(`Tier ${p.tier_code?.replace('Tier ','') ?? '?'} ${p.audience_market ?? 'GLOBAL'} anchor`);
  if (p.game) baseReason.push(`× ${p.game} game multiplier`);
  if (reachMult !== 1.0) baseReason.push(`× ${reachMult.toFixed(2)} reach (${p.followers_ig ? `${(p.followers_ig/1000).toFixed(0)}k IG vs cohort median` : 'no IG data'})`);

  return (
    <Shell role={profile.role} email={profile.email} fullName={profile.full_name}>
      <Link href={`/admin/players/${playerId}`} className="inline-flex items-center gap-1 text-sm text-label hover:text-ink mb-3">
        <ArrowLeft size={14} /> Back to player
      </Link>
      <div className="flex flex-wrap items-center gap-2 mb-2">
        <AuthorityChip player={p as any} size="md" showPremium />
        <ArchetypeChip player={p as any} size="md" />
        <ConfidenceChip player={p as any} />
      </div>
      <div className="mb-3"><ProfileCapabilities player={p as any} /></div>
      <PageHeader
        title={`Quick Estimate · ${p.nickname}`}
        subtitle={[
          p.tier_code ?? 'untiered',
          p.audience_market ?? 'no market',
          p.game ?? '',
          p.role ?? '',
          p.agency_name ? `Agency: ${p.agency_name}` : (p.agency_status === 'direct' ? 'Direct' : 'Agency unknown'),
        ].filter(Boolean).join(' · ')}
      />

      {/* INTERNAL ONLY banner */}
      <div className="rounded-lg border border-amber/40 bg-amber/5 px-3 py-2 text-xs text-amber-900 dark:text-amber mb-4 flex items-center gap-2">
        <Info size={14} className="flex-shrink-0" />
        <span><strong>Internal view.</strong> Not for clients. For the client-facing PDF, use the Quote Builder. For deep audit + manual overrides, use the Pricing audit page.</span>
      </div>

      {/* EFFECTIVE BASEFEE spotlight — headline = stored × anchor_premium (engine's quote-time lift) */}
      <div className="card card-p mb-4">
        <div className="flex items-baseline justify-between mb-2">
          <h2 className="text-sm font-semibold text-label uppercase tracking-wider">Effective baseFee · IG Reel</h2>
          <Link href={`/admin/players/${playerId}/pricing`} className="text-xs text-mute hover:text-ink underline">Open pricing audit →</Link>
        </div>
        <div className="flex items-baseline gap-3">
          <div className="text-4xl font-bold tabular-nums text-ink">SAR {effectiveBase.toLocaleString()}</div>
          <div className="text-xl text-mute tabular-nums">USD {Math.round(effectiveBase / 3.75).toLocaleString()}</div>
        </div>
        <p className="text-xs text-label mt-2">
          Stored {base.toLocaleString()} <span className="text-mute">SAR (pre-lift)</span>
          {anchorPremium !== 1.0 && authorityMeta && (
            <>
              <span className="text-mute"> · </span>
              ×{anchorPremium.toFixed(2)} {authorityMeta.chipEmoji ?? ''} {authorityMeta.displayLabel} anchor premium
            </>
          )}
        </p>
        <p className="text-[11px] text-mute mt-1">{baseReason.join(' ')}</p>
        {decay !== 1.0 && (
          <p className="text-[11px] text-mute mt-1">
            Authority floor decay {decay.toFixed(2)}× scales the IRL-derived AuthorityFloor only (peak {p.peak_tournament_tier ?? '?'} tier).
          </p>
        )}
        <p className="text-[11px] text-mute mt-1">
          Source: <code className="text-[11px]">{p.rate_source ?? 'tier_baseline'}</code>
          · data state <code className="text-[11px]">{p.data_completeness ?? 'unknown'}</code>
        </p>
      </div>

      {/* SOCIALS — all 8 platforms with clickable links + counts */}
      <div className="card card-p mb-4">
        <h2 className="text-sm font-semibold text-label uppercase tracking-wider mb-3">Socials</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2">
          {([
            { label:'Instagram',   url: p.instagram,  count: p.followers_ig,     prefix: 'instagram.com/' },
            { label:'TikTok',      url: p.tiktok,     count: p.followers_tiktok, prefix: 'tiktok.com/@' },
            { label:'YouTube',     url: p.youtube,    count: p.followers_yt,     prefix: 'youtube.com/' },
            { label:'X (Twitter)', url: p.x_handle,   count: p.followers_x,      prefix: 'x.com/' },
            { label:'Twitch',      url: p.twitch,     count: p.followers_twitch, prefix: 'twitch.tv/' },
            { label:'Kick',        url: p.kick,       count: p.followers_kick,   prefix: 'kick.com/' },
            { label:'Facebook',    url: p.facebook,   count: p.followers_fb,     prefix: 'facebook.com/' },
            { label:'Snapchat',    url: p.snapchat,   count: p.followers_snap,   prefix: 'snapchat.com/add/' },
          ] as Array<{label:string; url:string|null; count:number|null; prefix:string}>).map(soc => {
            const has = !!soc.url;
            const isLink = has && (soc.url!.startsWith('http://') || soc.url!.startsWith('https://'));
            return (
              <div key={soc.label} className={[
                'p-3 rounded-lg border',
                has ? 'border-line' : 'border-mute/20 bg-bg/40',
              ].join(' ')}>
                <div className="text-[10px] uppercase tracking-wider text-label font-semibold">{soc.label}</div>
                {has ? (
                  isLink ? (
                    <a href={soc.url!} target="_blank" rel="noopener noreferrer"
                       className="text-xs text-greenDark hover:underline break-all block mt-0.5">
                      {soc.url}
                    </a>
                  ) : (
                    <div className="text-xs text-ink break-all mt-0.5">{soc.prefix}{soc.url}</div>
                  )
                ) : (
                  <div className="text-xs text-mute italic mt-0.5">— not on file —</div>
                )}
                <div className="text-[11px] text-mute tabular-nums mt-1">
                  {Number(soc.count) > 0 ? `${Number(soc.count).toLocaleString()} followers` : 'no follower count'}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* 30-DAY PLATFORM ACTIVITY — Twitch + YouTube creator-dashboard metrics (Mig 081) */}
      {(p.metrics_30d_synced_at || p.twitch_30d_avg_ccv || p.yt_28d_views || p.twitch_30d_unique_viewers || p.ig_30d_reach || p.tiktok_30d_avg_views || p.english_proficiency || p.min_lead_time_days) && (
        <div className="card card-p mb-4">
          <div className="flex items-baseline justify-between mb-3">
            <h2 className="text-sm font-semibold text-label uppercase tracking-wider">
              30-day platform activity
            </h2>
            {p.metrics_30d_synced_at && (
              <span className="text-[10px] text-mute">
                Synced {new Date(p.metrics_30d_synced_at as string).toLocaleDateString()}
              </span>
            )}
          </div>

          {(p.twitch_30d_avg_ccv || p.twitch_30d_peak_ccv || p.twitch_30d_hours_streamed || p.twitch_30d_unique_viewers) && (
            <div className="mb-3">
              <div className="text-[10px] uppercase tracking-wider text-label font-semibold mb-1.5">Twitch · 30d</div>
              <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-2">
                {[
                  { label: 'Unique viewers', val: p.twitch_30d_unique_viewers, suffix: '',  hint: 'distinct accounts watched 30d' },
                  { label: 'Hours watched',  val: p.twitch_30d_hours_watched,  suffix: 'h', hint: 'viewer-hours (audience time)' },
                  { label: 'Avg CCV',        val: p.twitch_30d_avg_ccv,        suffix: '',  hint: 'avg concurrent viewers' },
                  { label: 'Peak CCV',       val: p.twitch_30d_peak_ccv,       suffix: '',  hint: 'max concurrent viewers' },
                  { label: 'Hours streamed', val: p.twitch_30d_hours_streamed, suffix: 'h', hint: 'time live on platform' },
                  { label: 'Live views',     val: p.twitch_30d_live_views,     suffix: '',  hint: '30d total live views' },
                  { label: 'New follows',    val: p.twitch_30d_new_follows,    suffix: '',  hint: 'follows added in 30d (not total)' },
                ].map(m => (
                  <div key={m.label} className="p-2 rounded-lg border border-line bg-bg/40">
                    <div className="text-[10px] text-mute">{m.label}</div>
                    <div className="text-sm font-bold text-ink tabular-nums">
                      {m.val != null ? Number(m.val).toLocaleString() + m.suffix : '—'}
                    </div>
                    <div className="text-[10px] text-mute mt-0.5">{m.hint}</div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {(p.yt_28d_views || p.yt_28d_impressions || p.yt_28d_unique_viewers || p.yt_28d_new_viewers_reached) && (
            <div className="mb-3">
              <div className="text-[10px] uppercase tracking-wider text-label font-semibold mb-1.5">YouTube · 28d</div>
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2">
                {[
                  { label: 'Views',           val: p.yt_28d_views,                   suffix: '', hint: 'video views (28d)' },
                  { label: 'Impressions',     val: p.yt_28d_impressions,             suffix: '', hint: 'thumbnail impressions' },
                  { label: 'New viewers',     val: p.yt_28d_new_viewers_reached,     suffix: '', hint: 'first-time viewers reached' },
                  { label: 'CTR',             val: p.yt_28d_ctr_pct,                 suffix: '%', hint: 'impressions → views' },
                  { label: 'Avg watch (s)',   val: p.yt_28d_avg_watch_time_seconds,  suffix: 's', hint: 'avg view duration' },
                  { label: 'Unique viewers',  val: p.yt_28d_unique_viewers,          suffix: '', hint: 'legacy — same as New viewers' },
                ].map(m => (
                  <div key={m.label} className="p-2 rounded-lg border border-line bg-bg/40">
                    <div className="text-[10px] text-mute">{m.label}</div>
                    <div className="text-sm font-bold text-ink tabular-nums">
                      {m.val != null ? Number(m.val).toLocaleString() + m.suffix : '—'}
                    </div>
                    <div className="text-[10px] text-mute mt-0.5">{m.hint}</div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {(p.ig_30d_reach || p.ig_30d_avg_reel_views || p.tiktok_30d_avg_views) && (
            <div className="mb-3">
              <div className="text-[10px] uppercase tracking-wider text-label font-semibold mb-1.5">IG / TikTok · 30d</div>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                {[
                  { label: 'IG reach',       val: p.ig_30d_reach,          suffix: '', hint: 'accounts reached 30d' },
                  { label: 'IG avg reel',    val: p.ig_30d_avg_reel_views, suffix: '', hint: 'avg Reel plays' },
                  { label: 'TikTok avg',     val: p.tiktok_30d_avg_views,  suffix: '', hint: 'avg views per post' },
                ].map(m => (
                  <div key={m.label} className="p-2 rounded-lg border border-line bg-bg/40">
                    <div className="text-[10px] text-mute">{m.label}</div>
                    <div className="text-sm font-bold text-ink tabular-nums">
                      {m.val != null ? Number(m.val).toLocaleString() + m.suffix : '—'}
                    </div>
                    <div className="text-[10px] text-mute mt-0.5">{m.hint}</div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {(p.posts_per_week_ig || p.posts_per_week_tiktok || p.videos_per_week_yt || p.streams_per_week_twitch || p.english_proficiency || p.min_lead_time_days || p.editing_team_size) && (
            <div>
              <div className="text-[10px] uppercase tracking-wider text-label font-semibold mb-1.5">Cadence & brand fit</div>
              <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-2">
                {[
                  { label: 'IG /wk',     val: p.posts_per_week_ig,        suffix: '',  hint: 'posts per week' },
                  { label: 'TikTok /wk', val: p.posts_per_week_tiktok,    suffix: '',  hint: 'posts per week' },
                  { label: 'YT /wk',     val: p.videos_per_week_yt,       suffix: '',  hint: 'uploads per week' },
                  { label: 'Twitch /wk', val: p.streams_per_week_twitch,  suffix: '',  hint: 'streams per week' },
                  { label: 'English',    val: p.english_proficiency,      suffix: '',  hint: 'self-reported fluency' },
                  { label: 'Lead time',  val: p.min_lead_time_days,       suffix: 'd', hint: 'min days notice' },
                  { label: 'Editors',    val: p.editing_team_size,        suffix: '',  hint: 'production team size' },
                ].map(m => (
                  <div key={m.label} className="p-2 rounded-lg border border-line bg-bg/40">
                    <div className="text-[10px] text-mute">{m.label}</div>
                    <div className="text-sm font-bold text-ink tabular-nums">
                      {m.val != null && m.val !== '' ? (typeof m.val === 'number' ? Number(m.val).toLocaleString() + m.suffix : String(m.val)) : '—'}
                    </div>
                    <div className="text-[10px] text-mute mt-0.5">{m.hint}</div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* COMMERCIAL · clause type + active commitments + Schedule-1 carveouts (Mig 088) */}
      {(p.independent_sponsorship_clause_type || commitmentList.length > 0 || reservedList.length > 0) && (
        <div className="card card-p mb-4">
          <div className="flex items-baseline justify-between mb-3">
            <h2 className="text-sm font-semibold text-label uppercase tracking-wider">
              Commercial · independent-sponsor clause + commitments
            </h2>
            {p.contract_source_doc_link && (
              <a href={p.contract_source_doc_link as string} className="text-[10px] text-mute underline" target="_blank" rel="noopener noreferrer">contract</a>
            )}
          </div>

          {p.independent_sponsorship_clause_type && (
            <div className="mb-3 p-3 rounded-lg border border-line bg-bg/40">
              <div className="flex flex-wrap items-baseline gap-3 mb-1.5">
                <span className="text-[10px] uppercase tracking-wider text-mute">Clause type</span>
                <span className="text-sm font-bold text-ink">{String(p.independent_sponsorship_clause_type).replace(/_/g, ' ')}</span>
                {p.independent_sponsorship_notice_days != null && (
                  <>
                    <span className="text-[10px] uppercase tracking-wider text-mute ml-2">Notice</span>
                    <span className="text-sm font-bold text-ink">{Number(p.independent_sponsorship_notice_days).toLocaleString()} days</span>
                  </>
                )}
              </div>
              {p.independent_sponsorship_clause_text && (
                <p className="text-[11px] text-mute leading-relaxed mt-1">{String(p.independent_sponsorship_clause_text)}</p>
              )}
            </div>
          )}

          {commitmentList.length > 0 && (
            <div className="mb-3">
              <div className="text-[10px] uppercase tracking-wider text-label font-semibold mb-1.5">
                Active commitments ({commitmentList.length})
              </div>
              <div className="space-y-1.5">
                {commitmentList.map(c => (
                  <div key={c.id} className="p-2 rounded-lg border border-line bg-bg/40">
                    <div className="flex flex-wrap items-baseline gap-2">
                      <span className="text-sm font-bold text-ink">{c.brand}</span>
                      {c.brand_parent && <span className="text-[10px] text-mute">({c.brand_parent})</span>}
                      <span className="text-[10px] text-mute">·</span>
                      <span className="text-[11px] text-ink">{c.commercial_categories?.name ?? `cat#${c.commercial_category_id}`}{c.sub_category ? ` — ${c.sub_category}` : ''}</span>
                      <span className="text-[10px] text-mute">·</span>
                      <span className="text-[11px] text-ink">{c.exclusivity_type ?? '—'} {c.exclusivity_scope ?? ''}</span>
                      {c.territory && <><span className="text-[10px] text-mute">·</span><span className="text-[11px] text-ink">{c.territory}</span></>}
                    </div>
                    {Array.isArray(c.competitor_blocklist) && c.competitor_blocklist.length > 0 && (
                      <div className="text-[10px] text-mute mt-0.5">
                        Blocks: {c.competitor_blocklist.join(' · ')}
                      </div>
                    )}
                    {c.notes && <div className="text-[10px] text-mute mt-0.5 italic">{c.notes}</div>}
                  </div>
                ))}
              </div>
            </div>
          )}

          {reservedList.length > 0 && (
            <div>
              <div className="text-[10px] uppercase tracking-wider text-label font-semibold mb-1.5">
                Schedule-1 reserved categories ({reservedList.length}) <span className="text-mute font-normal normal-case">— talent has right to sign individually</span>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5">
                {reservedList.map(r => (
                  <div key={r.id} className="p-2 rounded-lg border border-line bg-bg/40">
                    <div className="flex items-baseline justify-between gap-2">
                      <span className="text-[11px] font-bold text-ink">
                        {r.commercial_categories?.name ?? `cat#${r.commercial_category_id}`}
                        {r.sub_category ? ` — ${r.sub_category}` : ''}
                      </span>
                      <span className={`text-[10px] font-mono px-1.5 py-0.5 rounded ${r.permitted_territory === 'Global' ? 'bg-emerald-100 text-emerald-900' : 'bg-amber-100 text-amber-900'}`}>
                        {r.permitted_territory ?? '—'}
                      </span>
                    </div>
                    {Array.isArray(r.permitted_distribution) && r.permitted_distribution.length > 0 && (
                      <div className="text-[10px] text-mute mt-0.5">
                        {r.permitted_distribution.map(d => d.replace(/_/g, ' ')).join(' · ')}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* CHANNEL × IG REEL preview — uses effectiveBase so numbers match engine reality */}
      <div className="card card-p mb-4">
        <div className="flex items-baseline justify-between mb-3">
          <h2 className="text-sm font-semibold text-label uppercase tracking-wider">Channel preview · IG Reel</h2>
          {anchorPremium !== 1.0 && (
            <span className="text-[10px] text-mute">
              {`Channel × effectiveBase (stored ${base.toLocaleString()} × ${anchorPremium.toFixed(2)} anchor premium)`}
            </span>
          )}
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
          {CHANNEL_PRESETS.map(c => {
            const adjusted = Math.round(effectiveBase * c.multiplier);
            return (
              <div key={`${c.channel}-${c.intensity ?? 'none'}`}
                   className={['p-3 rounded-lg border',
                     c.multiplier === 1 ? 'border-line' : 'border-amber/40 bg-amber/5'
                   ].join(' ')}>
                <div className="text-[10px] uppercase tracking-wider text-label font-semibold">{c.label}</div>
                <div className="text-2xl font-bold tabular-nums mt-1">SAR {adjusted.toLocaleString()}</div>
                <div className="text-xs text-mute tabular-nums">USD {Math.round(adjusted/3.75).toLocaleString()}</div>
                <div className="text-[10px] text-mute mt-1">{c.multiplier.toFixed(2)}× effective base</div>
                <div className="text-[10px] text-label mt-1 leading-tight">{c.description}</div>
              </div>
            );
          })}
        </div>
      </div>

      {/* PER-PLATFORM rates across channels */}
      <div className="card card-p mb-4 overflow-x-auto">
        <h2 className="text-sm font-semibold text-label uppercase tracking-wider mb-3">Per-platform rates by channel</h2>
        <table className="w-full text-sm">
          <thead>
            <tr className="text-[10px] uppercase tracking-wider text-label border-b border-line">
              <th className="text-left py-2 pr-3">Platform</th>
              <th className="text-right py-2 px-2">Direct</th>
              <th className="text-right py-2 px-2">Strategic</th>
              <th className="text-right py-2 px-2">Agency Light</th>
              <th className="text-right py-2 px-2">Agency Std</th>
              <th className="text-right py-2 px-2">Agency Heavy</th>
              <th className="text-right py-2 px-2 text-amber-700">Talent floor</th>
            </tr>
          </thead>
          <tbody>
            {PLATFORMS.map(pf => {
              const directSar = Number(p[pf.key]) || 0;
              if (directSar <= 0) return null;
              // Map each rate_* column to the talent's intake floor key.
              const PLATFORM_TO_INTAKE_KEY: Record<string,string> = {
                rate_ig_reel: 'ig_reel', rate_ig_post: 'ig_static', rate_ig_story: 'ig_story',
                rate_tiktok_video: 'tiktok_video', rate_yt_short: 'yt_short', rate_yt_full: 'yt_video',
                rate_twitch_stream: 'twitch_stream', rate_kick_stream: 'kick_stream',
                rate_x_post: 'x_post', rate_irl: 'irl', rate_snapchat: 'snapchat',
              };
              const intakeKey = PLATFORM_TO_INTAKE_KEY[pf.key as string];
              const floorRaw = intakeKey && p.min_rates ? Number((p.min_rates as Record<string,number>)[intakeKey] ?? 0) : 0;
              const feePct = Number((p as any).agency_fee_pct ?? 0);
              const grossedFloor = floorRaw > 0 ? Math.round(floorRaw * (1 + feePct/100)) : 0;
              const floorWins = grossedFloor > directSar;
              return (
                <tr key={pf.key as string} className={`border-b border-line/40 ${floorWins ? 'bg-amber-50' : ''}`}>
                  <td className="py-2 pr-3 text-ink">{pf.label}</td>
                  <td className="py-2 px-2 text-right tabular-nums">{directSar.toLocaleString()}</td>
                  <td className="py-2 px-2 text-right tabular-nums text-mute">{Math.round(directSar * 0.65).toLocaleString()}</td>
                  <td className="py-2 px-2 text-right tabular-nums text-mute">{Math.round(directSar * 0.65).toLocaleString()}</td>
                  <td className="py-2 px-2 text-right tabular-nums text-mute">{Math.round(directSar * 0.50).toLocaleString()}</td>
                  <td className="py-2 px-2 text-right tabular-nums text-mute">{Math.round(directSar * 0.20).toLocaleString()}</td>
                  <td className={[
                    'py-2 px-2 text-right tabular-nums',
                    floorWins ? 'text-amber-800 font-bold' : 'text-mute',
                  ].join(' ')}
                      title={floorRaw > 0 ? `Talent intake floor ${floorRaw.toLocaleString()} SAR${feePct > 0 ? ` × (1 + ${feePct}% agency fee)` : ''}` : 'No intake floor on file'}>
                    {grossedFloor > 0 ? grossedFloor.toLocaleString() : '—'}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
        <p className="text-[11px] text-mute mt-3">All rates SAR. Multiply by 0.267 (or divide by 3.75) for USD. Channel multipliers apply to baseFee, not to these per-platform rates — engine math is more nuanced (axes apply on top), but this table gives a fast reference. <strong className="text-amber-800">Talent floor</strong> column shows the intake-submitted minimum, grossed up by the talent&rsquo;s declared agency fee. Rows highlighted amber are where the floor exceeds the engine rate — engine will max up at quote time (priceController = talent_floor).</p>
      </div>

      {/* DATA COVERAGE */}
      <div className="card card-p">
        <h2 className="text-sm font-semibold text-label uppercase tracking-wider mb-3">Data coverage for this talent</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-2">
          {signals.map(([label, has, val]) => (
            <div key={label} className={[
              'flex items-start gap-2 p-2 rounded border',
              has ? 'border-green/30 bg-green/5' : 'border-mute/20 bg-bg/40'
            ].join(' ')}>
              <div className="flex-shrink-0 mt-0.5">
                {has ? <Check size={14} className="text-green" /> : <X size={14} className="text-mute" />}
              </div>
              <div className="text-xs">
                <div className={has ? 'text-ink' : 'text-mute'}>{label}</div>
                {val && <div className="text-[10px] text-label tabular-nums">{val}</div>}
              </div>
            </div>
          ))}
        </div>
        <p className="text-[11px] text-mute mt-3">
          Each red ✗ above = an axis the engine can't auto-calibrate for this talent. Sales should default to neutral (1.00×) on those axes when quoting.
          Manus research and talent intake will fill these as they land.
        </p>
      </div>
    </Shell>
  );
}
