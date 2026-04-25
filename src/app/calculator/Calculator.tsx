'use client';
import { useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { computeLine, computeQuoteTotals, AXIS_OPTIONS, type MeasurementConfidence } from '@/lib/pricing';
import { fmtMoney, fmtPct, fmtCurrency } from '@/lib/utils';
import { type Player, type Creator, type Tier, type Addon } from '@/lib/types';
import { QuoteConfigurator } from '@/app/quote/new/QuoteConfigurator';
import { type LineDraft } from '@/app/quote/new/line-draft';
import { useToast } from '@/components/Toast';
import { Trash2, Send, Copy, RotateCcw, Sparkles } from 'lucide-react';

const LS_KEY = 'falcons.quote-draft.v2'; // matches QuoteBuilder, so the handoff hydrates cleanly

export function Calculator({
  players, creators, tiers, addons,
}: {
  players: Player[];
  creators: Creator[];
  tiers: Tier[];
  addons: Addon[];
}) {
  const router = useRouter();
  const toast = useToast();

  // Campaign defaults — pre-populate with the most-common values so the
  // calculator answers a DM in seconds without configuring axes.
  // Currency + FX
  const [currency, setCurrency] = useState<'SAR' | 'USD'>('SAR');
  const [usdRate, setUsdRate] = useState(3.75);

  const [eng, setEng]   = useState(AXIS_OPTIONS.engagement[1].factor);
  const [aud, setAud]   = useState(AXIS_OPTIONS.audience[0].factor);
  const [seas, setSeas] = useState(AXIS_OPTIONS.seasonality[0].factor);
  const [ctype, setCtype] = useState(AXIS_OPTIONS.contentType[1].factor);
  const [lang, setLang] = useState(AXIS_OPTIONS.language[0].factor);
  const [auth, setAuth] = useState(AXIS_OPTIONS.authority[0].factor);
  const [obj, setObj]   = useState(AXIS_OPTIONS.objective[1].weight);
  const [conf]          = useState<MeasurementConfidence>('exact');

  const [addonMonths, setAddonMonths] = useState<Record<number, number>>({});
  const addonIds = useMemo(() => new Set(Object.keys(addonMonths).map(Number)), [addonMonths]);
  const addonsUpliftPct = useMemo(() => {
    return Object.entries(addonMonths).reduce((s, [idStr, months]) => {
      const a = addons.find(x => x.id === Number(idStr));
      return s + (a?.uplift_pct ?? 0) * (months || 1);
    }, 0);
  }, [addonMonths, addons]);
  const toggleAddon = (id: number) => setAddonMonths(s => {
    const next = { ...s };
    if (id in next) delete next[id]; else next[id] = 1;
    return next;
  });
  const setAddonMonth = (id: number, months: number) => {
    const m = Math.max(1, Math.min(60, Math.round(months || 1)));
    setAddonMonths(s => ({ ...s, [id]: m }));
  };

  // Lines basket
  const [lines, setLines] = useState<LineDraft[]>([]);

  // Compute totals
  const computed = useMemo(() => {
    const out = lines.map(l => {
      const r = computeLine({
        baseFee: l.base_rate,
        irl: l.irl,
        eng:  l.o_eng   ?? eng,
        aud:  l.o_aud   ?? aud,
        seas: l.o_seas  ?? seas,
        ctype: l.o_ctype ?? ctype,
        lang: l.o_lang  ?? lang,
        auth: l.o_auth  ?? auth,
        obj, conf,
        floorShare: l.floorShare,
        rightsPct: addonsUpliftPct,
        qty: l.qty,
      });
      return { ...l, ...r };
    });
    const totals = computeQuoteTotals({
      lines: out.map(o => ({ finalAmount: o.finalAmount })),
      addonsUpliftPct: 0,
      vatRate: 0.15,
    });
    return { rows: out, totals };
  }, [lines, eng, aud, seas, ctype, lang, auth, obj, conf, addonsUpliftPct]);

  function addDrafts(drafts: LineDraft[]) {
    setLines(ls => [...ls, ...drafts]);
    toast.success(`+${drafts.length} added`);
  }
  function removeLine(uid: string) {
    setLines(ls => ls.filter(l => l.uid !== uid));
  }
  function reset() {
    if (lines.length === 0) return;
    if (!confirm('Reset the calculator basket?')) return;
    setLines([]);
    setAddonMonths({});
  }

  function copySummary() {
    if (lines.length === 0) return;
    const summary = computed.rows.map(r =>
      `• ${r.talent_name} — ${r.platform_label} × ${r.qty} = ${fmtCurrency(r.finalAmount, currency, usdRate)}`
    ).join('\n');
    const lines_total = `\nSubtotal: ${fmtCurrency(computed.totals.subtotal, currency, usdRate)}\nVAT 15%: ${fmtCurrency(computed.totals.vatAmount, currency, usdRate)}\nTotal: ${fmtCurrency(computed.totals.total, currency, usdRate)}`;
    navigator.clipboard.writeText(`Team Falcons quick estimate:\n\n${summary}${lines_total}`).then(() => {
      toast.success('Summary copied to clipboard');
    }).catch(() => toast.error('Copy failed'));
  }

  function shipToQuote() {
    if (lines.length === 0) return;
    // Hand off via the same localStorage key QuoteBuilder hydrates from.
    const draft = {
      clientName: '',
      clientEmail: '',
      campaign: '',
      currency,
      vatRate: 0.15,
      usdRate,
      notes: '',
      eng, aud, seas, ctype, lang, auth, obj, conf,
      addonMonths,
      lines,
      preparedByName: '',
      preparedByEmail: '',
    };
    try {
      window.localStorage.setItem(LS_KEY, JSON.stringify(draft));
      toast.success('Lines sent', `${lines.length} ready in /quote/new`);
      router.push('/quote/new');
    } catch (e) {
      toast.error('Could not save', 'localStorage unavailable');
    }
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-[1fr,320px] gap-6 items-start">
      <div className="space-y-4">
        {/* Configurator does the heavy lifting */}
        <QuoteConfigurator
          players={players}
          creators={creators}
          tiers={tiers}
          addons={addons}
          globals={{ eng, aud, seas, ctype, lang, auth, obj, conf }}
          currency={currency}
          usdRate={usdRate}
          addonsUpliftPct={addonsUpliftPct}
          onCommit={addDrafts}
        />

        {/* Basket — running record of what's been priced */}
        <div className="card overflow-hidden">
          <div className="px-4 py-3 border-b border-line flex items-center justify-between">
            <h3 className="font-semibold text-sm">Basket <span className="text-mute font-normal">· {computed.rows.length} line{computed.rows.length === 1 ? '' : 's'}</span></h3>
            {lines.length > 0 && (
              <button onClick={reset} className="text-xs text-mute hover:text-red-600 inline-flex items-center gap-1">
                <RotateCcw size={12} /> Reset
              </button>
            )}
          </div>
          {computed.rows.length === 0 ? (
            <div className="p-8 text-center text-sm text-mute">
              Pick a talent above and tick deliverables to start a basket.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="data-table density-compact">
                <thead>
                  <tr>
                    <th>Talent</th>
                    <th>Deliverable</th>
                    <th className="text-right">Qty</th>
                    <th className="text-right">Unit</th>
                    <th className="text-right">Total</th>
                    <th></th>
                  </tr>
                </thead>
                <tbody>
                  {computed.rows.map(r => (
                    <tr key={r.uid}>
                      <td>
                        <div className="font-medium text-ink">{r.talent_name}</div>
                        <div className="text-[10px] text-mute capitalize">{r.talent_type}</div>
                      </td>
                      <td className="text-label">{r.platform_label}</td>
                      <td className="text-right">{r.qty}</td>
                      <td className="text-right">{fmtCurrency(r.finalUnit, currency, usdRate)}</td>
                      <td className="text-right font-medium text-ink">{fmtCurrency(r.finalAmount, currency, usdRate)}</td>
                      <td className="text-right">
                        <button onClick={() => removeLine(r.uid)}
                          className="p-1 text-mute hover:text-red-600" title="Remove">
                          <Trash2 size={12} />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Add-ons quick toggle row */}
        <div className="card card-p">
          <div className="text-xs text-label uppercase tracking-wide mb-3">Rights & add-ons</div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            {addons.map(a => {
              const checked = addonIds.has(a.id);
              const months = addonMonths[a.id] ?? 1;
              const totalUplift = (a.uplift_pct ?? 0) * months;
              return (
                <div
                  key={a.id}
                  className={[
                    'p-2.5 rounded-lg border transition',
                    checked ? 'border-green bg-green/5' : 'border-line hover:border-mute',
                  ].join(' ')}
                >
                  <button type="button" onClick={() => toggleAddon(a.id)} className="w-full text-left">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className={['text-sm font-medium', checked ? 'text-greenDark' : 'text-ink'].join(' ')}>{a.label}</span>
                      <span className="text-[11px] text-green font-semibold">+{fmtPct(a.uplift_pct, 0)}/mo</span>
                    </div>
                    {a.description && <div className="text-[11px] text-mute mt-0.5 leading-snug">{a.description}</div>}
                  </button>
                  {checked && (
                    <div className="mt-2 pt-2 border-t border-green/20 flex items-center justify-between gap-2">
                      <span className="text-[10px] uppercase tracking-wider text-label font-semibold">Months</span>
                      <div className="flex items-center gap-1">
                        <button type="button" onClick={() => setAddonMonth(a.id, months - 1)} disabled={months <= 1}
                          className="w-6 h-6 rounded border border-line text-label hover:bg-bg disabled:opacity-40 text-sm leading-none">−</button>
                        <input type="number" min={1} max={60} value={months}
                          onChange={e => setAddonMonth(a.id, parseInt(e.target.value, 10) || 1)}
                          className="w-10 text-center text-xs input !py-0.5 !px-1" />
                        <button type="button" onClick={() => setAddonMonth(a.id, months + 1)} disabled={months >= 60}
                          className="w-6 h-6 rounded border border-line text-label hover:bg-bg disabled:opacity-40 text-sm leading-none">+</button>
                      </div>
                      <span className="text-[11px] text-greenDark font-semibold tabular-nums">+{fmtPct(totalUplift, 0)}</span>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
          {addonsUpliftPct > 0 && (
            <div className="text-xs text-greenDark mt-3">Total uplift: <strong>+{fmtPct(addonsUpliftPct, 0)}</strong> applied to every line.</div>
          )}
        </div>
      </div>

      {/* Sticky total + actions */}
      <aside className="lg:sticky lg:top-6 space-y-3">
        {/* Currency toggle */}
        <div className="card card-p">
          <div className="text-[10px] uppercase tracking-wider text-label font-semibold mb-2">Display currency</div>
          <div className="grid grid-cols-2 gap-2">
            <button
              onClick={() => setCurrency('SAR')}
              className={[
                'rounded-lg border-2 py-2 text-sm font-semibold transition',
                currency === 'SAR' ? 'border-green bg-greenSoft text-greenDark' : 'border-line bg-white text-mute hover:border-mute',
              ].join(' ')}
            >🇸🇦 SAR</button>
            <button
              onClick={() => setCurrency('USD')}
              className={[
                'rounded-lg border-2 py-2 text-sm font-semibold transition',
                currency === 'USD' ? 'border-green bg-greenSoft text-greenDark' : 'border-line bg-white text-mute hover:border-mute',
              ].join(' ')}
            >🇺🇸 USD</button>
          </div>
          {currency === 'USD' && (
            <div className="mt-2">
              <label className="text-[10px] uppercase tracking-wider text-label font-semibold">Rate (SAR per 1 USD)</label>
              <input
                type="number" step="0.01" min={1}
                value={usdRate}
                onChange={e => setUsdRate(Math.max(0.01, parseFloat(e.target.value) || 3.75))}
                className="input text-sm mt-1"
              />
            </div>
          )}
        </div>
        <div className="card overflow-hidden">
          <div className="bg-gradient-to-br from-green to-greenDark text-white p-5">
            <div className="text-[10px] tracking-widest opacity-80">QUICK ESTIMATE</div>
            <div className="text-3xl font-extrabold mt-1 leading-tight">{fmtCurrency(computed.totals.total, currency, usdRate)}</div>
            <div className="text-xs opacity-90 mt-1">VAT inclusive · {computed.rows.length} line{computed.rows.length === 1 ? '' : 's'}{currency === 'USD' && ` · @ ${usdRate} SAR/USD`}</div>
          </div>
          <div className="p-4 space-y-1.5 text-xs bg-white border-t border-line">
            <Row label="Subtotal" value={fmtCurrency(computed.totals.subtotal, currency, usdRate)} muted />
            {addonsUpliftPct > 0 && (
              <Row label={`Add-on uplift +${fmtPct(addonsUpliftPct, 0)}`} value="in lines" muted />
            )}
            <Row label="VAT (15%)" value={fmtCurrency(computed.totals.vatAmount, currency, usdRate)} muted />
          </div>
        </div>

        <button onClick={copySummary} disabled={lines.length === 0}
          className="btn btn-ghost w-full justify-center disabled:opacity-50">
          <Copy size={14} /> Copy summary
        </button>
        <button onClick={shipToQuote} disabled={lines.length === 0}
          className="btn btn-primary w-full justify-center disabled:opacity-50">
          <Send size={14} /> Send to a quote →
        </button>

        <div className="card card-p text-xs text-label">
          <div className="flex items-center gap-2 mb-2 text-ink">
            <Sparkles size={14} /> <span className="font-semibold">Tip</span>
          </div>
          <p className="leading-relaxed">
            <strong>Copy summary</strong> drops a clean SAR breakdown into your clipboard for a quick reply. <strong>Send to a quote</strong> hands the basket off to /quote/new with everything pre-filled — fill in client name + campaign and Submit.
          </p>
        </div>
      </aside>
    </div>
  );
}

function Row({ label, value, muted }: { label: string; value: string; muted?: boolean }) {
  return (
    <div className="flex items-center justify-between">
      <span className={muted ? 'text-mute' : 'text-label'}>{label}</span>
      <span className="text-ink font-medium">{value}</span>
    </div>
  );
}
