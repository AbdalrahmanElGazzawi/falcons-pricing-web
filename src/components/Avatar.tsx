'use client';
/**
 * Talent avatar with graceful fallback chain:
 *   1. If avatar_url looks like a real URL (http/https), render <img />
 *   2. If it's a filename or empty, render initials in a tinted circle
 *
 * This is intentionally tolerant of the messy data we just imported from the
 * roster sheet (mix of Drive links, drive.google.com viewer URLs, raw
 * filenames like "DSC02382.png", etc.).
 */
function isDisplayableUrl(s: string | undefined | null): boolean {
  if (!s) return false;
  return /^https?:\/\//.test(s);
}

function initials(name: string): string {
  const parts = name.trim().split(/[\s_\-]+/).filter(Boolean);
  if (parts.length === 0) return '?';
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

const SIZES = {
  sm: 'w-8 h-8 text-[11px]',
  md: 'w-10 h-10 text-xs',
  lg: 'w-14 h-14 text-sm',
  xl: 'w-20 h-20 text-base',
} as const;

export function Avatar({
  src, name, size = 'md',
}: {
  src?: string | null;
  name: string;
  size?: keyof typeof SIZES;
}) {
  const sizeClasses = SIZES[size];
  if (isDisplayableUrl(src)) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={src!}
        alt={name}
        className={`${sizeClasses} rounded-full object-cover bg-bg border border-line`}
      />
    );
  }
  return (
    <div
      className={`${sizeClasses} rounded-full bg-greenSoft text-greenDark border border-line flex items-center justify-center font-semibold uppercase tracking-tight`}
      aria-label={name}
      title={name}
    >
      {initials(name)}
    </div>
  );
}
