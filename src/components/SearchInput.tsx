'use client';
import { Search, X } from 'lucide-react';

/**
 * Unified search input. Replaces all ad-hoc <Search/> + <input> pairs.
 *
 * Fixes the perceived overlap of the cursor caret with the placeholder by
 * using a more visible icon (text-label), more left-padding (pl-11), and
 * adding a clear button when there's a value.
 */
export function SearchInput({
  value,
  onChange,
  placeholder,
  className = '',
  autoFocus = false,
  size = 'md',
}: {
  value: string;
  onChange: (v: string) => void;
  placeholder: string;
  className?: string;
  autoFocus?: boolean;
  size?: 'sm' | 'md';
}) {
  const showClear = value.length > 0;
  const iconSize = size === 'sm' ? 16 : 18;
  return (
    <div className={`relative ${className}`}>
      <Search
        size={iconSize}
        className="absolute left-3.5 top-1/2 -translate-y-1/2 text-label pointer-events-none"
        aria-hidden="true"
      />
      <input
        type="search"
        autoFocus={autoFocus}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className={`input pl-11 pr-9 ${size === 'sm' ? 'py-1.5 text-sm' : ''}`}
      />
      {showClear && (
        <button
          type="button"
          onClick={() => onChange('')}
          aria-label="Clear search"
          className="absolute right-2 top-1/2 -translate-y-1/2 p-1 rounded text-mute hover:text-ink hover:bg-bg transition"
        >
          <X size={14} />
        </button>
      )}
    </div>
  );
}
