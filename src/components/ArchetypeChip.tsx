/**
 * ArchetypeChip — surfaces a player's archetype as a visible chip
 * (Migration 074, May 9 2026).
 *
 * 8 archetypes total. Color-coded by competitive pedigree.
 * Renders nothing if no archetype set.
 */

import { getArchetypeMeta, type Archetype } from '@/lib/archetype';

interface Props {
  player: {
    archetype?: Archetype | string | null;
    archetype_override?: Archetype | string | null;
  };
  size?: 'sm' | 'md';
}

const COLORS: Record<Archetype, string> = {
  world_class_pro:       'bg-green/15 text-greenDark border-green/30',
  established_pro:       'bg-greenSoft text-greenDark border-green/20',
  regional_pro:          'bg-blue-50 text-blue-900 border-blue-200',
  esports_personality:   'bg-purple-50 text-purple-900 border-purple-200',
  hybrid_lifestyle:      'bg-pink-50 text-pink-900 border-pink-200',
  grassroots_competitor: 'bg-zinc-50 text-zinc-700 border-zinc-200',
  tournament_athlete:    'bg-amber-50 text-amber-900 border-amber-200',
  pure_lifestyle:        'bg-fuchsia-50 text-fuchsia-900 border-fuchsia-200',
};

export function ArchetypeChip({ player, size = 'sm' }: Props) {
  const meta = getArchetypeMeta(player);
  if (!meta) return null;
  const color = COLORS[meta.archetype] ?? 'bg-zinc-50 text-zinc-700 border-zinc-200';
  const padX = size === 'sm' ? 'px-2' : 'px-2.5';
  const padY = size === 'sm' ? 'py-0.5' : 'py-1';
  const text = size === 'sm' ? 'text-[10px]' : 'text-xs';

  return (
    <span
      className={`inline-flex items-center gap-1 rounded-md border ${color} ${padX} ${padY} ${text} font-semibold tracking-wide`}
      title={`${meta.displayLabel} — ${meta.description}. ${meta.brandPitch}`}
    >
      {meta.displayLabel}
    </span>
  );
}

export default ArchetypeChip;
