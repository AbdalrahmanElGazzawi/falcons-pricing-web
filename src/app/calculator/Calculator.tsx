'use client';
import { useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { computeLine, computeQuoteTotals, AXIS_OPTIONS, type MeasurementConfidence } from '@/lib/pricing';
import { fmtMoney, fmtPct } from '@/lib/utils';
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
  const [eng, setEng]   = useState(AXIS_OPTIONS.engagement[1].factor);
  const [aud, setAud]   = useState(AXIS_OPTIONS.audience[0].factor);
  const [seas, setSeas] = useState(AXIS_OPTIONS.seasonality[0].factor);
  const [ctype, setCtype] = useState(AXIS_OPTIONS.contentType[1].factor);
  const [lang, setLang] = useState(AXIS_OPTIONS.language[0].factor);
  const [auth, setAuth] = useState(AXIS_OPTIONS.authority[0].factor);
  const [obj, setObj]   = useState(AXIS_OPTIONS.objective[1].weight);
  const [conf]          = useState<MeasurementConfidence>('exact');

  const [addonIds, setAddonIds] = useState<Set<number>>(new Set());
  const addonsUpliftPct = useMemo(() => {
    return Array.from(addonIds).reduce((s, id) => {
      const a = addons.find(x => x.id === id);
      return s + (a?.uplift_pct ?? 0);
    }, 0);
  }, [addonIds, addons]);

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
    setAddonIds(new Set());
  }

  function copySummary() {
    if (lines.length === 0) return;
    const summary = computed.rows.map(r =>
      `• ${r.talent_name} — ${r.platform_label} × ${r.qty} = ${fmtMoney(r.finalAmount, 'SAR')}`
    ).join('\n');
    const lines_total = `\nSubtotal: ${fmtMoney(computed.totals.subtotal, 'SAR')}\nVAT 15%: ${fmtMoney(computed.totals.vatAmount, 'SAR')}\nTotal: ${fmtMoney(computed.totals.total, 'SAR')}`;
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
      currency: 'SAR',
      vatRate: 0.15,
      notes: '',
      eng, aud, seas, ctype, lang, auth, obj, conf,
      addonIds: Array.from(addonIds),
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
          globals={{ eng, aud, seas, ctype, lang, auth, obj, conf }}
          currency="SAR"
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
                      <td className="text-right">{fmtMoney(r.finalUnit, 'SAR')}</td>
                      <td className="text-right font-medium text-ink">{fmtMoney(r.finalAmount, 'SAR')}</td>
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
          <div className="flex flex-wrap gap-2">
            {addons.map(a => {
              const checked = addonIds.has(a.id);
              return (
                <button
                  key={a.id}
                  onClick={() => setAddonIds(s => {
                    const next = new Set(s);
                    if (next.has(a.id)) next.delete(a.id); else next.add(a.id);
                    return next;
                  })}
                  className={[
                    'px-3 py-1.5 rounded-full text-xs font-medium border transition',
                    checked
                      ? 'bg-green text-white border-green'
                      : 'bg-white text-label border-line hover:border-green hover:bg-greenSoft',
                  ].join(' ')}
                >
                  {a.label} <span className="opacity-75">+{fmtPct(a.uplift_pct, 0)}</span>
                </button>
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
        <div className="card overflow-hidden">
          <div className="bg-gradient-to-br from-green to-greenDark text-white p-5">
            <div className="text-[10px] tracking-widest opacity-80">QUICK ESTIMATE</div>
            <div className="text-3xl font-extrabold mt-1 leading-tight">{fmtMoney(computed.totals.total, 'SAR')}</div>
            <div className="text-xs opacity-90 mt-1">VAT inclusive · {computed.rows.length} line{computed.rows.length === 1 ? '' : 's'}</div>
          </div>
          <div className="p-4 space-y-1.5 text-xs bg-white border-t border-line">
            <Row label="Subtotal" value={fmtMoney(computed.totals.subtotal, 'SAR')} muted />
            {addonsUpliftPct > 0 && (
              <Row label={`Add-on uplift +${fmtPct(addonsUpliftPct, 0)}`} value="in lines" muted />
            )}
            <Row label="VAT (15%)" value={fmtMoney(computed.totals.vatAmount, 'SAR')} muted />
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
