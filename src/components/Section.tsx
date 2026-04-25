'use client';
import { ChevronUp, ChevronDown, GripVertical } from 'lucide-react';

/**
 * Section wraps a page region (e.g. "Quote header", "Quote lines") so the
 * layout editor can move it up/down. In normal mode it renders children
 * unchanged; in edit mode it overlays a small reorder strip on the right.
 */
export function Section({
  id, title, editable, isFirst, isLast, onMoveUp, onMoveDown, children,
}: {
  id: string;
  title: string;
  editable: boolean;
  isFirst: boolean;
  isLast: boolean;
  onMoveUp: () => void;
  onMoveDown: () => void;
  children: React.ReactNode;
}) {
  if (!editable) return <>{children}</>;

  return (
    <div className="relative ring-2 ring-green/40 rounded-xl">
      <div className="absolute -top-3 left-3 z-10 px-2 py-0.5 rounded-full bg-green text-white text-[10px] uppercase tracking-widest font-semibold flex items-center gap-1">
        <GripVertical size={10} />
        {title}
      </div>
      <div className="absolute -top-3 right-3 z-10 flex items-center gap-1">
        <button
          type="button"
          onClick={onMoveUp}
          disabled={isFirst}
          aria-label={`Move ${title} up`}
          className="w-7 h-7 rounded-full bg-white border border-green text-greenDark grid place-items-center shadow-card hover:bg-greenSoft disabled:opacity-30 disabled:cursor-not-allowed"
        >
          <ChevronUp size={14} />
        </button>
        <button
          type="button"
          onClick={onMoveDown}
          disabled={isLast}
          aria-label={`Move ${title} down`}
          className="w-7 h-7 rounded-full bg-white border border-green text-greenDark grid place-items-center shadow-card hover:bg-greenSoft disabled:opacity-30 disabled:cursor-not-allowed"
        >
          <ChevronDown size={14} />
        </button>
      </div>
      <div data-section-id={id}>{children}</div>
    </div>
  );
}
