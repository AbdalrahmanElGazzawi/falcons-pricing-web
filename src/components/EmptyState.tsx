import type { LucideIcon } from 'lucide-react';
import Link from 'next/link';

/**
 * Empty state with icon, headline, body, optional CTA.
 * Use whenever a list/table is empty so the user knows what to do next.
 */
export function EmptyState({
  icon: Icon, title, body, action,
}: {
  icon: LucideIcon;
  title: string;
  body?: string;
  action?: { label: string; href?: string; onClick?: () => void };
}) {
  return (
    <div className="px-6 py-14 text-center">
      <div className="mx-auto w-16 h-16 rounded-2xl bg-greenSoft text-greenDark grid place-items-center mb-4">
        <Icon size={28} />
      </div>
      <div className="text-base font-semibold text-ink mb-1">{title}</div>
      {body && <div className="text-sm text-label max-w-md mx-auto">{body}</div>}
      {action && (
        action.href ? (
          <Link href={action.href} className="btn btn-primary mt-5 inline-flex">
            {action.label}
          </Link>
        ) : (
          <button onClick={action.onClick} className="btn btn-primary mt-5">
            {action.label}
          </button>
        )
      )}
    </div>
  );
}
