/**
 * ConfidenceChip — surfaces quote/talent pricing confidence
 * (Migration 074, May 9 2026).
 */

import { getConfidence, type ConfidenceLevel } from '@/lib/archetype';

interface Props {
  player: {
    rate_source?: string | null;
    audience_data_verified?: boolean | null;
    engagement_data_verified?: boolean | null;
    profile_strength_pct?: number | null;
    archetype?: string | null;
    authority_tier?: string | null;
  };
}

const COLOR: Record<ConfidenceLevel, string> = {
  high:        'bg-green/15 text-greenDark border-green/40',
  medium:      'bg-amber-50 text-amber-900 border-amber-300',
  low:         'bg-orange-50 text-orange-900 border-orange-300',
  speculative: 'bg-rose-50 text-rose-900 border-rose-300',
};

const LABEL: Record<ConfidenceLevel, string> = {
  high: 'High confidence', medium: 'Medium confidence',
  low: 'Low confidence', speculative: 'Speculative',
};

export function ConfidenceChip({ player }: Props) {
  const conf = getConfidence(player);
  return (
    <span
      className={`inline-flex items-center gap-1 rounded-md border ${COLOR[conf.level]} px-2 py-0.5 text-[10px] font-semibold tracking-wide`}
      title={conf.reasons.join(' · ')}
    >
      {LABEL[conf.level]} · {conf.score}%
    </span>
  );
}

export default ConfidenceChip;
