'use client';
import { useLocale } from '@/lib/i18n/Locale';
import { Languages } from 'lucide-react';
import { LOCALES, LOCALE_NAMES } from '@/lib/i18n/dict';

export function LocaleSwitcher({ compact = false }: { compact?: boolean }) {
  const { locale, setLocale } = useLocale();

  if (compact) {
    // Two-button pill — fits in the sidebar above the user block
    return (
      <div className="flex items-center gap-1.5 bg-white/5 rounded-lg p-1">
        {LOCALES.map(l => (
          <button
            key={l}
            onClick={() => setLocale(l)}
            className={[
              'flex-1 text-xs font-medium px-2 py-1.5 rounded-md transition',
              locale === l ? 'bg-green text-white' : 'text-white/60 hover:text-white',
            ].join(' ')}
          >
            {LOCALE_NAMES[l]}
          </button>
        ))}
      </div>
    );
  }

  return (
    <div className="flex items-center gap-2">
      <Languages size={14} className="text-label" />
      <select
        value={locale}
        onChange={e => setLocale(e.target.value as any)}
        className="text-sm bg-transparent outline-none"
      >
        {LOCALES.map(l => (
          <option key={l} value={l}>{LOCALE_NAMES[l]}</option>
        ))}
      </select>
    </div>
  );
}
