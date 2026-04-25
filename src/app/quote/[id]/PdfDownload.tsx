'use client';
import { useState } from 'react';
import { Download } from 'lucide-react';

/**
 * Currency toggle + Download PDF. The stored quote currency stays untouched —
 * this only flips the rendered presentation.
 */
export function PdfDownload({
  quoteId,
  storedCurrency,
}: {
  quoteId: string;
  storedCurrency: string;
}) {
  const [ccy, setCcy] = useState<'SAR' | 'USD'>(
    storedCurrency === 'USD' ? 'USD' : 'SAR'
  );

  const href = `/api/quote/${quoteId}/pdf?ccy=${ccy}`;

  return (
    <div className="inline-flex items-center gap-2">
      {/* Currency selector */}
      <div className="inline-flex items-center rounded-lg border border-line overflow-hidden bg-white">
        <button
          type="button"
          onClick={() => setCcy('SAR')}
          className={[
            'px-2.5 py-1.5 text-xs font-medium transition',
            ccy === 'SAR' ? 'bg-green text-white' : 'text-label hover:text-ink',
          ].join(' ')}
          title="Render PDF in Saudi Riyals"
        >
          SAR
        </button>
        <button
          type="button"
          onClick={() => setCcy('USD')}
          className={[
            'px-2.5 py-1.5 text-xs font-medium transition border-l border-line',
            ccy === 'USD' ? 'bg-green text-white' : 'text-label hover:text-ink',
          ].join(' ')}
          title="Render PDF in US Dollars"
        >
          USD
        </button>
      </div>

      <a
        href={href}
        target="_blank"
        rel="noreferrer"
        className="btn btn-primary"
        title={`Download as ${ccy}`}
      >
        <Download size={14} /> Download PDF ({ccy})
      </a>
    </div>
  );
}
