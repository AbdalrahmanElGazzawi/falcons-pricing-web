import { NextRequest, NextResponse } from 'next/server';
import { createServiceClient } from '@/lib/supabase-server';

// Allowlist of deliverable keys we accept on intake. Drop anything else.
const ALLOWED_KEYS = new Set([
  'ig_reel','ig_static','ig_story',
  'tiktok_video','tiktok_repost',
  'yt_short','yt_short_repost',
  'x_post','x_repost',
  'twitch_stream','twitch_integ',
  'irl',
]);

type AgencyPayload = { has_agency?: boolean; name?: string | null; fee_pct?: number | null };
type SocialsPayload = {
  instagram?: string | null;
  tiktok?: string | null;
  youtube?: string | null;
  x_handle?: string | null;
  twitch?: string | null;
  kick?: string | null;
  facebook?: string | null;
  snapchat?: string | null;
  followers_ig?: number | null;
  followers_tiktok?: number | null;
  followers_yt?: number | null;
  followers_x?: number | null;
  followers_twitch?: number | null;
  followers_kick?: number | null;
  followers_fb?: number | null;
  followers_snap?: number | null;
};

export async function POST(
  req: NextRequest,
  { params }: { params: { token: string } }
) {
  const supabase = createServiceClient();

  type DemographicsPayload = {
    country_mix?: Record<string, number> | null;        // KSA / MENA / EU / NA / APAC / GLOBAL → %
    age_distribution?: Record<string, number> | null;   // '13-17' / '18-24' / etc. → %
    gender_split?: Record<string, number> | null;       // male / female / other → %
    top_countries?: string[] | null;
  };
  type Perf30dPayload = {
    twitch_30d_unique_viewers?: number | null;
    twitch_30d_hours_watched?:  number | null;
    twitch_30d_avg_ccv?:        number | null;
    twitch_30d_peak_ccv?:       number | null;
    twitch_30d_hours_streamed?: number | null;
    twitch_30d_live_views?:     number | null;
    twitch_30d_new_follows?:    number | null;
    yt_28d_views?:                  number | null;
    yt_28d_impressions?:            number | null;
    yt_28d_new_viewers_reached?:    number | null;
    yt_28d_ctr_pct?:                number | null;
    yt_28d_avg_watch_time_seconds?: number | null;
    ig_30d_reach?:          number | null;
    ig_30d_avg_reel_views?: number | null;
    tiktok_30d_avg_views?:  number | null;
  };
  type BrandFitPayload = {
    english_proficiency?: 'native' | 'fluent' | 'conversational' | 'basic' | 'none' | null;
    min_lead_time_days?:  number | null;
    editing_team_size?:   number | null;
    posts_per_week_ig?:        number | null;
    posts_per_week_tiktok?:    number | null;
    videos_per_week_yt?:       number | null;
    streams_per_week_twitch?:  number | null;
  };
  const body = await req.json().catch(() => null) as {
    min_rates?: Record<string, number>;
    notes?: string;
    agency?: AgencyPayload;
    socials?: SocialsPayload;
    demographics?: DemographicsPayload;
    engagement_rates?: {
      er_ig?: number | null;
      er_tiktok?: number | null;
      er_yt?: number | null;
      er_twitch?: number | null;
      er_x?: number | null;
    };
    performance_90d?: Record<string, Record<string, number>> | null;
    performance_30d_live?: Perf30dPayload | null;
    brand_fit?: BrandFitPayload | null;
  } | null;
  if (!body || typeof body !== 'object') {
    return NextResponse.json({ error: 'Invalid body' }, { status: 400 });
  }

  // Sanitise rates: only allowed keys, only positive finite integers ≤ 10M SAR
  const cleaned: Record<string, number> = {};
  for (const [k, v] of Object.entries(body.min_rates ?? {})) {
    if (!ALLOWED_KEYS.has(k)) continue;
    const n = Number(v);
    if (!Number.isFinite(n) || n <= 0 || n > 10_000_000) continue;
    cleaned[k] = Math.round(n);
  }

  const notes = typeof body.notes === 'string' ? body.notes.slice(0, 4000) : null;

  // Sanitise agency block
  let agency_status: 'agency' | 'direct' | null = null;
  let agency_name: string | null = null;
  let agency_fee_pct: number | null = null;
  if (body.agency && typeof body.agency === 'object') {
    if (body.agency.has_agency === true) {
      agency_status = 'agency';
      agency_name = (typeof body.agency.name === 'string' ? body.agency.name.trim() : '') || null;
      const f = Number(body.agency.fee_pct);
      if (Number.isFinite(f) && f >= 0 && f <= 50) {
        agency_fee_pct = Math.round(f * 100) / 100; // 2dp
      } else {
        return NextResponse.json({ error: 'Agency fee % must be between 0 and 50.' }, { status: 400 });
      }
      if (!agency_name) {
        return NextResponse.json({ error: 'Agency name is required when agency representation is selected.' }, { status: 400 });
      }
    } else if (body.agency.has_agency === false) {
      agency_status = 'direct';
      agency_name = null;
      agency_fee_pct = null;
    }
  }

  // Sanitise socials block (Migration 057). Only persist allowed keys.
  const cleanedSocials: Record<string, string | number | null> = {};
  if (body.socials && typeof body.socials === 'object') {
    const URL_KEYS = ['instagram','tiktok','youtube','x_handle','twitch','kick','facebook','snapchat'] as const;
    for (const k of URL_KEYS) {
      const v = (body.socials as Record<string, unknown>)[k];
      if (v === null || v === undefined || v === '') {
        cleanedSocials[k] = null;
        continue;
      }
      if (typeof v !== 'string') continue;
      const trimmed = v.trim().slice(0, 500);
      // Light validation: must look URL-ish or be a bare handle (allow either).
      // The intake page renders it as a clickable link only if it starts with
      // http(s)://, so junk here just renders as plain text.
      cleanedSocials[k] = trimmed || null;
    }
    const FOLLOWER_KEYS = ['followers_ig','followers_tiktok','followers_yt','followers_x','followers_twitch','followers_kick','followers_fb','followers_snap'] as const;
    for (const k of FOLLOWER_KEYS) {
      const v = (body.socials as Record<string, unknown>)[k];
      if (v === null || v === undefined || v === '') {
        cleanedSocials[k] = null;
        continue;
      }
      const n = Number(v);
      if (!Number.isFinite(n) || n < 0 || n > 100_000_000) continue;
      cleanedSocials[k] = Math.round(n);
    }
  }

  // Sanitise demographics block. Each map's values must be finite numbers
  // in [0, 100], and the total must land in [95, 105] (allow small rounding).
  // If any sub-map fails, we silently drop just that map (don't reject the
  // whole submission — talent might submit min_rates without demographics).
  const cleanedDemo: Record<string, unknown> = {};
  function cleanPctMap(m: unknown): Record<string, number> | null {
    if (!m || typeof m !== 'object') return null;
    const out: Record<string, number> = {};
    let total = 0;
    for (const [k, v] of Object.entries(m as Record<string, unknown>)) {
      const n = Number(v);
      if (!Number.isFinite(n) || n < 0 || n > 100) continue;
      if (n === 0) continue;
      const rounded = Math.round(n * 10) / 10;
      out[k] = rounded;
      total += rounded;
    }
    if (Object.keys(out).length === 0) return null;
    if (total < 95 || total > 105) return null; // sum check
    return out;
  }
  let hasAnyDemo = false;
  if (body.demographics && typeof body.demographics === 'object') {
    const country = cleanPctMap(body.demographics.country_mix);
    const age     = cleanPctMap(body.demographics.age_distribution);
    const gender  = cleanPctMap(body.demographics.gender_split);
    if (country) { cleanedDemo.audience_country_mix     = country; hasAnyDemo = true; }
    if (age)     { cleanedDemo.audience_age_distribution = age;     hasAnyDemo = true; }
    if (gender)  { cleanedDemo.audience_gender_split    = gender;  hasAnyDemo = true; }
    const tc = body.demographics.top_countries;
    if (Array.isArray(tc)) {
      const cleanedTC = tc
        .filter((x): x is string => typeof x === 'string')
        .map(x => x.trim().slice(0, 80))
        .filter(Boolean)
        .slice(0, 5);
      if (cleanedTC.length > 0) {
        cleanedDemo.audience_top_countries = cleanedTC;
        hasAnyDemo = true;
      }
    }
    if (hasAnyDemo) {
      cleanedDemo.has_audience_demo = true;
      cleanedDemo.audience_data_updated_at = new Date().toISOString();
      // audience_data_verified stays false — talent self-attestation, admin
      // verifies later. Engine treats has_audience_demo=true regardless.
    }
  }

  // Sanitise engagement_rates — % values in [0, 100], 2dp.
  const cleanedER: Record<string, number | null> = {};
  if (body.engagement_rates && typeof body.engagement_rates === 'object') {
    for (const k of ['er_ig','er_tiktok','er_yt','er_twitch','er_x'] as const) {
      const v = body.engagement_rates[k];
      if (v === null || v === undefined || v === '' as unknown as number) continue;
      const n = Number(v);
      if (!Number.isFinite(n) || n < 0 || n > 100) continue;
      cleanedER[k] = Math.round(n * 100) / 100;
    }
  }

  // Sanitise performance_90d — talent self-reported private analytics.
  // Drop non-finite / negative; cap absurd values (>1e9). Store as jsonb.
  let cleanedPerf: Record<string, Record<string, number>> | null = null;
  if (body.performance_90d && typeof body.performance_90d === 'object') {
    const out: Record<string, Record<string, number>> = {};
    for (const [channel, fields] of Object.entries(body.performance_90d)) {
      if (!fields || typeof fields !== 'object') continue;
      const channelOut: Record<string, number> = {};
      for (const [f, v] of Object.entries(fields as Record<string, unknown>)) {
        const n = Number(v);
        if (!Number.isFinite(n) || n < 0 || n > 1_000_000_000) continue;
        channelOut[f] = Math.round(n);
      }
      if (Object.keys(channelOut).length > 0) out[channel] = channelOut;
    }
    if (Object.keys(out).length > 0) cleanedPerf = out;
  }

  // Sanitise performance_30d_live — 30-day metrics from Twitch / YT / IG / TikTok
  // dashboards. Each field maps to a named column (not jsonb). Mig 086 added
  // these columns; semantics documented per-column.
  const PERF_30D_INT_KEYS = new Set([
    'twitch_30d_unique_viewers','twitch_30d_hours_watched','twitch_30d_avg_ccv',
    'twitch_30d_peak_ccv','twitch_30d_live_views','twitch_30d_new_follows',
    'yt_28d_views','yt_28d_impressions','yt_28d_new_viewers_reached',
    'yt_28d_avg_watch_time_seconds',
    'ig_30d_reach','ig_30d_avg_reel_views','tiktok_30d_avg_views',
  ] as const);
  const cleanedPerf30: Record<string, number | null> = {};
  if (body.performance_30d_live && typeof body.performance_30d_live === 'object') {
    const src30 = body.performance_30d_live as Record<string, unknown>;
    for (const k of PERF_30D_INT_KEYS) {
      const v = src30[k];
      if (v === null || v === undefined || v === '') continue;
      const n = Number(v);
      if (!Number.isFinite(n) || n < 0 || n > 1_000_000_000) continue;
      cleanedPerf30[k] = Math.round(n);
    }
    // 30d hours streamed is decimal (e.g. 156.37)
    const hs = src30['twitch_30d_hours_streamed'];
    if (hs !== null && hs !== undefined && hs !== '') {
      const n = Number(hs);
      if (Number.isFinite(n) && n >= 0 && n <= 1_000_000) {
        cleanedPerf30['twitch_30d_hours_streamed'] = Math.round(n * 100) / 100;
      }
    }
    // 28d CTR is percentage in [0,100], 2dp
    const ctr = src30['yt_28d_ctr_pct'];
    if (ctr !== null && ctr !== undefined && ctr !== '') {
      const n = Number(ctr);
      if (Number.isFinite(n) && n >= 0 && n <= 100) {
        cleanedPerf30['yt_28d_ctr_pct'] = Math.round(n * 100) / 100;
      }
    }
  }

  // Sanitise brand_fit — small set of typed columns.
  const ENGLISH_PROF = new Set(['native','fluent','conversational','basic','none']);
  const cleanedBrandFit: Record<string, string | number | null> = {};
  if (body.brand_fit && typeof body.brand_fit === 'object') {
    const bf = body.brand_fit as Record<string, unknown>;
    if (typeof bf.english_proficiency === 'string' && ENGLISH_PROF.has(bf.english_proficiency)) {
      cleanedBrandFit.english_proficiency = bf.english_proficiency;
    }
    const lt = Number(bf.min_lead_time_days);
    if (Number.isFinite(lt) && lt >= 0 && lt <= 90) {
      cleanedBrandFit.min_lead_time_days = Math.round(lt);
    }
    const et = Number(bf.editing_team_size);
    if (Number.isFinite(et) && et >= 0 && et <= 20) {
      cleanedBrandFit.editing_team_size = Math.round(et);
    }
    for (const k of ['posts_per_week_ig','posts_per_week_tiktok','videos_per_week_yt','streams_per_week_twitch'] as const) {
      const v = bf[k];
      if (v === null || v === undefined || v === '') continue;
      const n = Number(v);
      if (Number.isFinite(n) && n >= 0 && n <= 100) {
        cleanedBrandFit[k] = Math.round(n);
      }
    }
  }

  // Find player by token
  const { data: playerRow } = await supabase
    .from('players')
    .select('id, nickname, intake_status, min_rates, is_active, agency_status, agency_name, agency_fee_pct, instagram, tiktok, youtube, x_handle, twitch, kick, facebook, snapchat, followers_ig, followers_tiktok, followers_yt, followers_x, followers_twitch, followers_kick, followers_fb, followers_snap, intake_revision_count, intake_locked_until')
    .eq('intake_token', params.token)
    .maybeSingle();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const player: any = playerRow;

  if (!player) return NextResponse.json({ error: 'Token not found' }, { status: 404 });
  if (player.is_active === false) {
    return NextResponse.json({ error: 'Link no longer active' }, { status: 410 });
  }

  const isRevision = player.intake_status === 'submitted'
    || player.intake_status === 'approved'
    || player.intake_status === 'revised';

  // Migration 058 — Lockout policy on revisions.
  // First submit: free. After that, ONE free revision per 3-month rolling
  // window. If they're locked, return 423 with the unlock contact + date.
  const now = Date.now();
  const lockedUntilMs = player.intake_locked_until
    ? new Date(player.intake_locked_until).getTime()
    : null;
  const isCurrentlyLocked = lockedUntilMs !== null && lockedUntilMs > now;
  // Lockout enforcement (Migration 058). If a previous revision started
  // a 3-month window and it's still active, reject EVERYTHING — rates,
  // agency block, socials. Belt-and-suspenders even if the UI is bypassed.
  if (isCurrentlyLocked) {
    return NextResponse.json({
      error: 'Revision locked',
      detail: 'Your submission is locked until the date below. To request an earlier change, email afg@falcons.sa.',
      locked_until: player.intake_locked_until,
      unlock_contact: 'afg@falcons.sa',
    }, { status: 423 });
  }

  // Compute new revision_count + locked_until.
  // - First-time submit                 → count=0, locked=null
  // - Revising after lockout expired    → count=1, locked = now + 3 months
  // - Revising while not locked yet     → count = prev_count + 1, lock if hits 1
  let newRevisionCount = player.intake_revision_count ?? 0;
  let newLockedUntil: string | null = player.intake_locked_until ?? null;
  if (isRevision) {
    // Lockout expired? reset the window first.
    if (lockedUntilMs !== null && lockedUntilMs <= now) {
      newRevisionCount = 0;
      newLockedUntil = null;
    }
    newRevisionCount += 1;
    if (newRevisionCount >= 1 && !newLockedUntil) {
      // Calendar-month math: now + 3 months. Date.setMonth handles
      // month-end boundaries (Mar 31 + 3mo = Jun 30, not Jul 1).
      const lock = new Date(now);
      lock.setMonth(lock.getMonth() + 3);
      newLockedUntil = lock.toISOString();
    }
  }

  const update: Record<string, unknown> = {
    min_rates:           cleaned,
    min_rates_notes:     notes,
    intake_status:       isRevision ? 'revised' : 'submitted',
    intake_submitted_at: new Date().toISOString(),
    intake_revision_count: newRevisionCount,
    intake_locked_until:   newLockedUntil,
  };
  if (agency_status !== null) update.agency_status  = agency_status;
  if (agency_status !== null) update.agency_name    = agency_name;
  if (agency_status !== null) update.agency_fee_pct = agency_fee_pct;
  for (const [k, v] of Object.entries(cleanedSocials)) {
    update[k] = v;
  }
  for (const [k, v] of Object.entries(cleanedDemo)) {
    update[k] = v;
  }
  for (const [k, v] of Object.entries(cleanedER)) {
    update[k] = v;
  }
  if (cleanedPerf) {
    update.talent_self_reported_perf = cleanedPerf;
    // engagement_data_verified stays false — talent self-report. Admin
    // sets to true after reviewing. Engine reads the value either way.
  }
  if (Object.keys(cleanedPerf30).length > 0) {
    for (const [k, v] of Object.entries(cleanedPerf30)) update[k] = v;
    update.metrics_30d_synced_at = new Date().toISOString();
  }
  if (Object.keys(cleanedBrandFit).length > 0) {
    for (const [k, v] of Object.entries(cleanedBrandFit)) update[k] = v;
  }

  const { error: updErr } = await supabase
    .from('players')
    .update(update)
    .eq('id', player.id);

  if (updErr) {
    return NextResponse.json({ error: updErr.message }, { status: 500 });
  }

  // Audit trail — show before/after for the diff so we can spot revisions
  void supabase.from('audit_log').insert({
    actor_email: 'talent@portal',
    actor_kind:  'human',
    action:      isRevision ? 'talent.intake_revised' : 'talent.intake_submitted',
    entity_type: 'player',
    entity_id:   String(player.id),
    diff: {
      nickname: player.nickname,
      before:   {
        min_rates:      player.min_rates ?? {},
        agency_status:  player.agency_status ?? null,
        agency_name:    player.agency_name ?? null,
        agency_fee_pct: player.agency_fee_pct ?? null,
        socials: {
          instagram: player.instagram ?? null,
          tiktok:    player.tiktok    ?? null,
          youtube:   player.youtube   ?? null,
          x_handle:  player.x_handle  ?? null,
          twitch:    player.twitch    ?? null,
          kick:      player.kick      ?? null,
          facebook:  player.facebook  ?? null,
          snapchat:  player.snapchat  ?? null,
          followers_ig:     player.followers_ig     ?? null,
          followers_tiktok: player.followers_tiktok ?? null,
          followers_yt:     player.followers_yt     ?? null,
          followers_x:      player.followers_x      ?? null,
          followers_twitch: player.followers_twitch ?? null,
          followers_kick:   player.followers_kick   ?? null,
          followers_fb:     player.followers_fb     ?? null,
          followers_snap:   player.followers_snap   ?? null,
        },
      },
      after:   {
        min_rates:      cleaned,
        agency_status,
        agency_name,
        agency_fee_pct,
        socials: cleanedSocials,
        demographics: hasAnyDemo ? cleanedDemo : null,
        engagement_rates: Object.keys(cleanedER).length ? cleanedER : null,
        performance_90d:  cleanedPerf,
        performance_30d_live: Object.keys(cleanedPerf30).length ? cleanedPerf30 : null,
        brand_fit:           Object.keys(cleanedBrandFit).length ? cleanedBrandFit : null,
      },
      notes,
    },
  }).then(() => null);

  return NextResponse.json({ ok: true });
}
