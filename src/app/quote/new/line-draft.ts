// Shared LineDraft type used by QuoteBuilder and QuoteConfigurator.

export type LineDraft = {
  uid: string;
  talent_type: 'player' | 'creator';
  talent_id: number | null;
  talent_name: string;
  platform: string;
  platform_label: string;
  base_rate: number;
  qty: number;
  irl: number;
  floorShare: number;
  // Per-line axis overrides (null = inherit global)
  o_ctype: number | null;
  o_eng: number | null;
  o_aud: number | null;
  o_seas: number | null;
  o_lang: number | null;
  o_auth: number | null;
  // Per-line rights packages (each line has its own addon snapshot)
  addon_months: Record<number, number>;
  // True when the talent is appearing as a featured guest / supporting role in
  // another creator's content (cameo). Engine multiplies finalUnit by 0.5.
  is_companion?: boolean;
  // Creator-specific per-line multiplier overrides (null = use creator default).
  // Auto-loaded from the creator's stored defaults when the line is added,
  // editable per-quote via the Configurator override panel.
  o_brand_loyalty?: number | null;
  o_exclusivity?: number | null;
  o_cross_vertical?: number | null;
  o_engagement_quality?: number | null;
  o_production_style?: number | null;
};

export const newUid = () => Math.random().toString(36).slice(2, 9);
