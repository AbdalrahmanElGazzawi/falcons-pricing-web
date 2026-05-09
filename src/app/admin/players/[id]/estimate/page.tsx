import { notFound } from 'next/navigation';
import Link from 'next/link';
import { requireStaff } from '@/lib/auth';
import { Shell, PageHeader } from '@/components/Shell';
import { AccessDenied } from '@/components/AccessDenied';
import { ArrowLeft, Check, X, Info } from 'lucide-react';
import { CHANNEL_PRESETS, resolveChannelMultiplier } from '@/lib/pricing';
import { fmtCurrency } from '@/lib/utils';
import { AuthorityChip } from '@/components/AuthorityChip';

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
      authority_tier, authority_tier_override
    `)
    .eq('id', playerId)
    .single();

  if (!p) notFound();

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
      <div className="mb-1"><AuthorityChip player={p as any} size="md" showPremium /></div>
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

      {/* ENGINE BASE spotlight */}
      <div className="card card-p mb-4">
        <div className="flex items-baseline justify-between mb-2">
          <h2 className="text-sm font-semibold text-label uppercase tracking-wider">Engine base · IG Reel</h2>
          <Link href={`/admin/players/${playerId}/pricing`} className="text-xs text-mute hover:text-ink underline">Open pricing audit →</Link>
        </div>
        <div className="flex items-baseline gap-3">
          <div className="text-4xl font-bold tabular-nums text-ink">SAR {base.toLocaleString()}</div>
          <div className="text-xl text-mute tabular-nums">USD {Math.round(base / 3.75).toLocaleString()}</div>
        </div>
        <p className="text-xs text-label mt-2">{baseReason.join(' ')}</p>
        {decay !== 1.0 && (
          <p className="text-[11px] text-mute mt-1">
            Authority decay {decay.toFixed(2)}× applied to authority floor (peak {p.peak_tournament_tier ?? '?'} tier).
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

      {/* CHANNEL × IG REEL preview */}
      <div className="card card-p mb-4">
        <h2 className="text-sm font-semibold text-label uppercase tracking-wider mb-3">Channel preview · IG Reel</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
          {CHANNEL_PRESETS.map(c => {
            const adjusted = Math.round(base * c.multiplier);
            return (
              <div key={`${c.channel}-${c.intensity ?? 'none'}`}
                   className={['p-3 rounded-lg border',
                     c.multiplier === 1 ? 'border-line' : 'border-amber/40 bg-amber/5'
                   ].join(' ')}>
                <div className="text-[10px] uppercase tracking-wider text-label font-semibold">{c.label}</div>
                <div className="text-2xl font-bold tabular-nums mt-1">SAR {adjusted.toLocaleString()}</div>
                <div className="text-xs text-mute tabular-nums">USD {Math.round(adjusted/3.75).toLocaleString()}</div>
                <div className="text-[10px] text-mute mt-1">{c.multiplier.toFixed(2)}× base</div>
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
