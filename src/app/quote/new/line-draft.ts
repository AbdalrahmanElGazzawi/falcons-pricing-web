// Shared LineDraft type used by QuoteBuilder and PricingWizard.
// (Extracted so the wizard and the builder agree on line shape.)

export type LineDraft = {
  uid: string;                    // local row id
  talent_type: 'player' | 'creator';
  talent_id: number | null;
  talent_name: string;
  platform: string;               // rate column key, e.g. rate_ig_reel
  platform_label: string;
  base_rate: number;
  qty: number;
  // per-line context
  irl: number;                    // pulled from player irl, 0 for creator
  floorShare: number;             // tier floor share
  // Per-line axis overrides (null = inherit global)
  o_ctype: number | null;
  o_eng: number | null;
  o_aud: number | null;
  o_seas: number | null;
  o_lang: number | null;
  o_auth: number | null;
};

export const newUid = () => Math.random().toString(36).slice(2, 9);
