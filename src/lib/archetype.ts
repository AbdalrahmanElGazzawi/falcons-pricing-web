/**
 * Archetype × Profile classification (Migration 074, May 9 2026)
 *
 * Categorizes each talent by competitive pedigree × content profile, plus
 * 8 capability flags. Engine reads these to:
 *   - cap axis multipliers per archetype (Authority axis worth 1.40 for
 *     World-Class Pro, capped at 1.00 for Pure Lifestyle Creator)
 *   - gate which deliverables are even quotable per talent
 *     (NiKo's Twitch hidden if stream_intensity=0)
 *
 * Engine reads coalesce(archetype_override, archetype). Profile flags are
 * auto-derived but admin can edit individual rows.
 */

export type Archetype =
  | 'world_class_pro'
  | 'established_pro'
  | 'regional_pro'
  | 'esports_personality'
  | 'hybrid_lifestyle'
  | 'grassroots_competitor'
  | 'tournament_athlete'
  | 'pure_lifestyle';

export interface ArchetypeMeta {
  archetype: Archetype;
  displayLabel: string;
  description: string;
  brandPitch: string;
  // Per-axis caps applied in computeLine
  authorityCap: number;
  engagementCap: number;
  audienceCap: number;
  seasonalityCap: number;
  productionCap: number;
}

export const ARCHETYPE_META: Record<Archetype, ArchetypeMeta> = {
  world_class_pro: {
    archetype: 'world_class_pro', displayLabel: 'World-Class Pro',
    description: 'Best in the world at X · global recognition',
    brandPitch: 'Best-in-the-world credibility — brands buy NiKo because he is NiKo, not because of follower count',
    authorityCap: 1.40, engagementCap: 1.30, audienceCap: 1.50, seasonalityCap: 1.50, productionCap: 1.20,
  },
  established_pro: {
    archetype: 'established_pro', displayLabel: 'Established Pro',
    description: 'Major-finalist or 2yr+ at top — credibility, slightly less heat',
    brandPitch: 'Proven competitor with broad recognition — defensible at premium rates',
    authorityCap: 1.30, engagementCap: 1.30, audienceCap: 1.40, seasonalityCap: 1.40, productionCap: 1.30,
  },
  regional_pro: {
    archetype: 'regional_pro', displayLabel: 'Regional Pro',
    description: 'Regional champion · MENA/APAC scene leader',
    brandPitch: 'Regional credibility — pitch to MENA/APAC brands seeking authentic scene voice',
    authorityCap: 1.20, engagementCap: 1.40, audienceCap: 1.40, seasonalityCap: 1.35, productionCap: 1.30,
  },
  esports_personality: {
    archetype: 'esports_personality', displayLabel: 'Esports Personality',
    description: 'Plays + casts + commentates — deep MENA esports culture',
    brandPitch: 'Always-on esports culture voice — high attention hours with Saudi gaming audience',
    authorityCap: 1.10, engagementCap: 1.50, audienceCap: 1.40, seasonalityCap: 1.20, productionCap: 1.10,
  },
  hybrid_lifestyle: {
    archetype: 'hybrid_lifestyle', displayLabel: 'Hybrid Lifestyle Creator',
    description: 'Esports background + cinematic lifestyle content',
    brandPitch: 'Bilingual MENA hybrid — esports cred + cinematic Saudi lifestyle reach',
    authorityCap: 1.00, engagementCap: 1.60, audienceCap: 1.50, seasonalityCap: 1.30, productionCap: 1.45,
  },
  grassroots_competitor: {
    archetype: 'grassroots_competitor', displayLabel: 'Grassroots Competitor',
    description: 'Active competitive · no major win yet',
    brandPitch: 'Active MENA competitive — affordable amplification with credible scene voice',
    authorityCap: 1.10, engagementCap: 1.40, audienceCap: 1.30, seasonalityCap: 1.30, productionCap: 1.10,
  },
  tournament_athlete: {
    archetype: 'tournament_athlete', displayLabel: 'Tournament Athlete',
    description: 'High tournament value · near-zero social',
    brandPitch: 'Tournament-anchored — brands buy IRL appearances at FGC events, not social posts',
    authorityCap: 1.40, engagementCap: 1.00, audienceCap: 1.00, seasonalityCap: 1.40, productionCap: 1.00,
  },
  pure_lifestyle: {
    archetype: 'pure_lifestyle', displayLabel: 'Pure Lifestyle Creator',
    description: 'Pure social/cinematic · gaming-adjacent',
    brandPitch: 'MENA lifestyle reach with gaming-adjacent positioning — for cross-vertical FMCG',
    authorityCap: 1.00, engagementCap: 1.60, audienceCap: 1.40, seasonalityCap: 1.30, productionCap: 1.45,
  },
};

export interface PlayerProfile {
  archetype?: Archetype | string | null;
  archetype_override?: Archetype | string | null;
  stream_intensity?: number | null;
  content_intensity?: number | null;
  solo_video?: boolean | null;
  cinematic_ready?: boolean | null;
  irl_availability?: string | null;
  peak_platforms?: string[] | null;
  bilingual?: boolean | null;
  agency_status?: string | null;
}

export function resolveArchetype(p: PlayerProfile): Archetype | null {
  const raw = p.archetype_override || p.archetype;
  if (raw && raw in ARCHETYPE_META) return raw as Archetype;
  return null;
}

export function getArchetypeMeta(p: PlayerProfile): ArchetypeMeta | null {
  const a = resolveArchetype(p);
  return a ? ARCHETYPE_META[a] : null;
}

/** Engine reads this — used to MIN-cap each axis multiplier per archetype. */
export function getArchetypeCaps(p: PlayerProfile): {
  authorityCap: number;
  engagementCap: number;
  audienceCap: number;
  seasonalityCap: number;
  productionCap: number;
} | null {
  const m = getArchetypeMeta(p);
  if (!m) return null;
  return {
    authorityCap: m.authorityCap,
    engagementCap: m.engagementCap,
    audienceCap: m.audienceCap,
    seasonalityCap: m.seasonalityCap,
    productionCap: m.productionCap,
  };
}

/** Should a deliverable show up for this talent? Profile-gated visibility. */
export function isDeliverableAvailable(
  p: PlayerProfile,
  deliverableKey: string
): boolean {
  // Twitch / Kick stream + integ → require stream_intensity > 0
  if (deliverableKey.startsWith('rate_twitch_') || deliverableKey.startsWith('rate_kick_')) {
    return (p.stream_intensity ?? 0) > 0;
  }
  // YT long-form → require solo_video=true
  if (deliverableKey === 'rate_yt_full' || deliverableKey === 'rate_yt_preroll') {
    return p.solo_video === true;
  }
  // IRL deliverables → require irl_availability != 'none'
  if (deliverableKey.includes('_irl') || deliverableKey === 'rate_irl' || deliverableKey === 'rate_event_snap') {
    return p.irl_availability !== 'none' && p.irl_availability !== null;
  }
  // Snapchat deliverables → require peak_platforms includes 'snap' OR has snapchat handle
  // (we leave non-strict here — only hide if explicitly empty peak_platforms)
  // Default: show
  return true;
}

/** Compute a confidence label. Returns null if no signal. */
export type ConfidenceLevel = 'high' | 'medium' | 'low' | 'speculative';

export interface ConfidenceSignal {
  level: ConfidenceLevel;
  score: number; // 0-100
  reasons: string[];
}

export function getConfidence(p: {
  rate_source?: string | null;
  audience_data_verified?: boolean | null;
  engagement_data_verified?: boolean | null;
  profile_strength_pct?: number | null;
  archetype?: Archetype | string | null;
  authority_tier?: string | null;
}): ConfidenceSignal {
  const reasons: string[] = [];
  let score = 50;

  if (p.rate_source === 'reach_calibrated' || p.rate_source === 'methodology_v2_with_data') {
    score += 20; reasons.push('Reach-calibrated rate');
  } else if (p.rate_source === 'tier_baseline') {
    score += 0; reasons.push('Tier baseline (no reach data)');
  } else if (!p.rate_source) {
    score -= 20; reasons.push('No rate source');
  }
  if (p.audience_data_verified) { score += 15; reasons.push('Audience data verified'); }
  else { reasons.push('Audience data unverified'); }
  if (p.engagement_data_verified) { score += 10; reasons.push('Engagement data verified'); }
  if (typeof p.profile_strength_pct === 'number') {
    score = Math.round((score + p.profile_strength_pct) / 2);
    reasons.push(`Profile strength ${p.profile_strength_pct}%`);
  }
  if (p.archetype) reasons.push(`Archetype: ${ARCHETYPE_META[p.archetype as Archetype]?.displayLabel ?? p.archetype}`);
  if (p.authority_tier && p.authority_tier !== 'AT-0') reasons.push(`Authority Tier: ${p.authority_tier}`);

  score = Math.max(0, Math.min(100, score));
  const level: ConfidenceLevel = score >= 75 ? 'high' : score >= 55 ? 'medium' : score >= 35 ? 'low' : 'speculative';
  return { level, score, reasons };
}
