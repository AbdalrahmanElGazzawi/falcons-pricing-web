/**
 * ProfileCapabilities — surfaces a player's 8 capability flags as a strip
 * (Migration 074, May 9 2026).
 *
 * Shows what the talent can actually deliver (stream, content, IRL, etc.) at
 * a glance. Sales uses it to filter quote-builder picks; the engine reads
 * the same flags to gate which deliverables are quotable.
 */

interface Props {
  player: {
    stream_intensity?: number | null;
    content_intensity?: number | null;
    solo_video?: boolean | null;
    cinematic_ready?: boolean | null;
    irl_availability?: string | null;
    peak_platforms?: string[] | null;
    bilingual?: boolean | null;
    agency_status?: string | null;
  };
}

const intensityLabel = (n: number | null | undefined) =>
  n === 3 ? 'heavy' : n === 2 ? 'active' : n === 1 ? 'some' : 'none';

const intensityColor = (n: number | null | undefined) =>
  (n ?? 0) >= 2 ? 'text-greenDark' : (n ?? 0) === 1 ? 'text-amber-700' : 'text-mute';

export function ProfileCapabilities({ player }: Props) {
  const items: Array<{ k: string; v: string; tone: string; title: string }> = [];

  items.push({
    k: 'Stream',
    v: intensityLabel(player.stream_intensity),
    tone: intensityColor(player.stream_intensity),
    title: 'How active the talent streams (Twitch/Kick). 0 hides those deliverables in quotes.',
  });
  items.push({
    k: 'Content',
    v: intensityLabel(player.content_intensity),
    tone: intensityColor(player.content_intensity),
    title: 'Volume of content the talent produces.',
  });
  items.push({
    k: 'Solo video',
    v: player.solo_video ? 'yes' : 'no',
    tone: player.solo_video ? 'text-greenDark' : 'text-mute',
    title: 'Has a YouTube channel + does long-form integrations.',
  });
  items.push({
    k: 'Cinematic',
    v: player.cinematic_ready ? 'yes' : 'no',
    tone: player.cinematic_ready ? 'text-greenDark' : 'text-mute',
    title: 'Cinematic-grade scripted production capability.',
  });
  items.push({
    k: 'IRL',
    v: player.irl_availability || 'mena',
    tone: player.irl_availability === 'global' ? 'text-greenDark' : player.irl_availability === 'none' ? 'text-mute' : 'text-amber-800',
    title: 'IRL appearance availability scope.',
  });
  if (player.peak_platforms && player.peak_platforms.length > 0) {
    items.push({
      k: 'Peak',
      v: player.peak_platforms.slice(0, 2).join(', '),
      tone: 'text-ink',
      title: 'Top platforms by follower count.',
    });
  }
  items.push({
    k: 'Bilingual',
    v: player.bilingual ? 'yes' : 'no',
    tone: player.bilingual ? 'text-greenDark' : 'text-mute',
    title: 'Speaks Arabic + English (MENA campaigns).',
  });
  if (player.agency_status === 'agency') {
    items.push({
      k: 'Agency',
      v: 'agency-repped',
      tone: 'text-amber-800',
      title: 'Auto-applies channel discount.',
    });
  }

  return (
    <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-[10px] text-mute">
      {items.map((it, i) => (
        <span key={i} className="inline-flex items-center gap-1" title={it.title}>
          <span className="uppercase tracking-wider">{it.k}</span>
          <span className={`font-semibold ${it.tone}`}>{it.v}</span>
        </span>
      ))}
    </div>
  );
}

export default ProfileCapabilities;
