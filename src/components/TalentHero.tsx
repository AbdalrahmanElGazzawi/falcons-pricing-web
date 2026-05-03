'use client';
/**
 * TalentHero — rich detail-view portrait for a player or creator.
 *
 * Uses portrait_url when set; falls back to avatar_url; falls back to
 * initials in a tinted square. Renders with object-cover at the top so
 * the face stays visible whether the image is square or portrait-aspect.
 *
 * Sizes:
 *   md   — 96×128  (compact modal hero)
 *   lg   — 128×176 (default modal hero)
 *   xl   — 192×256 (showcase / press kit)
 *   wide — 320×200 (campaign banner)
 */
function isUrl(s?: string | null) { return !!s && /^https?:\/\//.test(s); }

function initials(name: string): string {
  const parts = name.trim().split(/[\s_\-]+/).filter(Boolean);
  if (parts.length === 0) return '?';
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

const SIZES = {
  md:   { box: 'w-24 h-32',   text: 'text-2xl' },
  lg:   { box: 'w-32 h-44',   text: 'text-3xl' },
  xl:   { box: 'w-48 h-64',   text: 'text-4xl' },
  wide: { box: 'w-80 h-50',   text: 'text-3xl' },
} as const;

export function TalentHero({
  portraitUrl, avatarUrl, name, size = 'lg', rounded = 'rounded-2xl', className = '',
}: {
  portraitUrl?: string | null;
  avatarUrl?: string | null;
  name: string;
  size?: keyof typeof SIZES;
  rounded?: string;
  className?: string;
}) {
  const sz = SIZES[size];
  const src = isUrl(portraitUrl) ? portraitUrl! : (isUrl(avatarUrl) ? avatarUrl! : null);

  if (src) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={src}
        alt={name}
        loading="lazy"
        decoding="async"
        referrerPolicy="no-referrer"
        className={`${sz.box} ${rounded} object-cover object-top bg-bg border border-line ${className}`}
        onError={(e) => { (e.currentTarget as HTMLImageElement).style.display = 'none'; }}
      />
    );
  }
  return (
    <div
      className={`${sz.box} ${rounded} bg-greenSoft text-greenDark border border-line flex items-center justify-center font-semibold uppercase ${sz.text} ${className}`}
      aria-label={name}
      title={name}
    >
      {initials(name)}
    </div>
  );
}
