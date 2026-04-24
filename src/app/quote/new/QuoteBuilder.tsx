'use client';
import { useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { computeLine, computeQuoteTotals, AXIS_OPTIONS, type MeasurementConfidence } from '@/lib/pricing';
import { fmtMoney, fmtPct } from '@/lib/utils';
import { PLAYER_PLATFORMS, CREATOR_PLATFORMS, type Player, type Creator, type Tier, type Addon } from '@/lib/types';
import { Trash2, Plus, Save, ArrowLeft } from 'lucide-react';
import Link from 'next/link';

type LineDraft = {
  uid: string;                    // local row id
  talent_type: 'player' | 'creator';
  talent_id: number | null;
  talent_name: string;
  platform: string;               // rate column key, e.g. rate_ig_reel
  platform_label: string;
  base_rate: number;
  qty: number;
  // per-line overrides (optional)
  irl: number;                    // pulled from player irl, 0 for creator
  floorShare: number;             // tier floor share
};

const newUid = () => Math.random().toString(36).slice(2, 9);

export function QuoteBuilder({
  players, creators, tiers, addons, ownerEmail,
}: {
  players: Player[];
  creators: Creator[];
  tiers: Tier[];
  addons: Addon[];
  ownerEmail: string;
}) {
  const router = useRouter();
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // ── Quote header
  const [clientName, setClientName] = useState('');
  const [clientEmail, setClientEmail] = useState('');
  const [campaign, setCampaign] = useState('');
  const [currency, setCurrency] = useState('SAR');
  const [vatRate, setVatRate] = useState(0.15);
  const [notes, setNotes] = useState('');

  // ── Global axes (apply to every line; can be overridden later)
  const [eng, setEng] = useState(AXIS_OPTIONS.engagement[1].factor);   // 1.0
  const [aud, setAud] = useState(AXIS_OPTIONS.audience[0].factor);     // 1.0
  const [seas, setSeas] = useState(AXIS_OPTIONS.seasonality[0].factor); // 1.0
  const [ctype, setCtype] = useState(AXIS_OPTIONS.contentType[1].factor); // 1.0
  const [lang, setLang] = useState(AXIS_OPTIONS.language[0].factor);   // 1.0
  const [auth, setAuth] = useState(AXIS_OPTIONS.authority[0].factor);  // 1.0
  const [obj, setObj] = useState(AXIS_OPTIONS.objective[1].weight);    // 0.5
  const [conf, setConf] = useState<MeasurementConfidence>('exact');

  // ── Add-ons (multi-select; uplift accumulates additively)
  const [addonIds, setAddonIds] = useState<Set<number>>(new Set());
  const addonsUpliftPct = useMemo(() => {
    return Array.from(addonIds).reduce((sum, id) => {
      const a = addons.find(x => x.id === id);
      return sum + (a?.uplift_pct ?? 0);
    }, 0);
  }, [addonIds, addons]);

  // ── Lines
  const [lines, setLines] = useState<LineDraft[]>([]);

  function tierFor(t?: string): Tier | undefined {
    return tiers.find(x => x.code === t);
  }

  function addPlayerLine(playerId: number) {
    const p = players.find(x => x.id === playerId);
    if (!p) return;
    const tier = tierFor(p.tier_code);
    setLines(ls => [...ls, {
      uid: newUid(),
      talent_type: 'player',
      talent_id: p.id,
      talent_name: p.nickname,
      platform: 'rate_ig_reel',
      platform_label: 'IG Reel',
      base_rate: p.rate_ig_reel || 0,
      qty: 1,
      irl: p.rate_irl || 0,
      floorShare: tier?.floor_share ?? p.floor_share ?? 0.5,
    }]);
  }

  function addCreatorLine(creatorId: number) {
    const c = creators.find(x => x.id === creatorId);
    if (!c) return;
    const tier = tierFor(c.tier_code);
    setLines(ls => [...ls, {
      uid: newUid(),
      talent_type: 'creator',
      talent_id: c.id,
      talent_name: c.nickname,
      platform: 'rate_x_post_quote',
      platform_label: 'X Post / Quote',
      base_rate: c.rate_x_post_quote || 0,
      qty: 1,
      irl: 0,
      floorShare: tier?.floor_share ?? 0.5,
    }]);
  }

  function updateLine(uid: string, patch: Partial<LineDraft>) {
    setLines(ls => ls.map(l => l.uid === uid ? { ...l, ...patch } : l));
  }

  function changePlatform(line: LineDraft, key: string) {
    let rate = 0, label = key;
    if (line.talent_type === 'player') {
      const p = players.find(x => x.id === line.talent_id);
      const opt = PLAYER_PLATFORMS.find(o => o.key === key);
      rate = (p as any)?.[key] ?? 0;
      label = opt?.label ?? key;
    } else {
      const c = creators.find(x => x.id === line.talent_id);
      const opt = CREATOR_PLATFORMS.find(o => o.key === key);
      rate = (c as any)?.[key] ?? 0;
      label = opt?.label ?? key;
    }
    updateLine(line.uid, { platform: key, platform_label: label, base_rate: rate });
  }

  function removeLine(uid: string) {
    setLines(ls => ls.filter(l => l.uid !== uid));
  }

  // ── Live pricing per line + totals
  const computed = useMemo(() => {
    const out = lines.map(l => {
      const r = computeLine({
        baseFee: l.base_rate,
        irl: l.irl,
        eng, aud, seas, ctype, lang, auth, obj, conf,
        floorShare: l.floorShare,
        rightsPct: addonsUpliftPct,
        qty: l.qty,
      });
      return { ...l, ...r };
    });
    const totals = computeQuoteTotals({
      lines: out.map(o => ({ finalAmount: o.finalAmount })),
      addonsUpliftPct: 0,           // uplift already baked into each line
      vatRate,
    });
    return { rows: out, totals };
  }, [lines, eng, aud, seas, ctype, lang, auth, obj, conf, addonsUpliftPct, vatRate]);

  async function save(status: 'draft' | 'pending_approval') {
    setError(null);
    if (!clientName.trim()) { setError('Client name is required'); return; }
    if (lines.length === 0) { setError('Add at least one line'); return; }
    setSaving(true);
    try {
      const res = await fetch('/api/quote', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          header: {
            client_name: clientName.trim(),
            client_email: clientEmail.trim() || null,
            campaign: campaign.trim() || null,
            owner_email: ownerEmail,
            currency,
            vat_rate: vatRate,
            eng_factor: eng, audience_factor: aud, seasonality_factor: seas,
            content_type_factor: ctype, language_factor: lang, authority_factor: auth,
            objective_weight: obj, measurement_confidence: conf,
            subtotal: computed.totals.subtotal,
            addons_uplift_pct: addonsUpliftPct,
            pre_vat: computed.totals.preVat,
            vat_amount: computed.totals.vatAmount,
            total: computed.totals.total,
            status,
            notes: notes.trim() || null,
          },
          lines: computed.rows.map((r, i) => ({
            sort_order: i,
            talent_type: r.talent_type,
            player_id: r.talent_type === 'player' ? r.talent_id : null,
            creator_id: r.talent_type === 'creator' ? r.talent_id : null,
            talent_name: r.talent_name,
            platform: r.platform_label,
            base_rate: r.base_rate,
            qty: r.qty,
            final_unit: r.finalUnit,
            final_amount: r.finalAmount,
          })),
          addonIds: Array.from(addonIds),
        }),
      });
      if (!res.ok) {
        const j = await res.json().catch(() => ({}));
        throw new Error(j.error || `Save failed (${res.status})`);
      }
      const j = await res.json();
      router.push(`/quote/${j.id}`);
    } catch (e: any) {
      setError(e.message || 'Save failed');
      setSaving(false);
    }
  }

  return (
    <div className="space-y-6">
      <Link href="/dashboard" className="inline-flex items-center gap-1 text-sm text-label hover:text-ink">
        <ArrowLeft size={14} /> Back
      </Link>

      {/* Header card */}
      <div className="card card-p">
        <h2 className="font-semibold mb-4">Quote header</h2>
        <div className="grid grid-cols-3 gap-4">
          <div>
            <label className="label">Client name *</label>
            <input value={clientName} onChange={e => setClientName(e.target.value)} className="input" placeholder="e.g. STC Play" />
          </div>
          <div>
            <label className="label">Client email</label>
            <input value={clientEmail} onChange={e => setClientEmail(e.target.value)} className="input" placeholder="contact@client.com" />
          </div>
          <div>
            <label className="label">Campaign</label>
            <input value={campaign} onChange={e => setCampaign(e.target.value)} className="input" placeholder="e.g. Ramadan 2026" />
          </div>
          <div>
            <label className="label">Currency</label>
            <select value={currency} onChange={e => setCurrency(e.target.value)} className="input">
              <option value="SAR">SAR</option>
              <option value="USD">USD</option>
              <option value="AED">AED</option>
            </select>
          </div>
          <div>
            <label className="label">VAT</label>
            <select value={vatRate} onChange={e => setVatRate(parseFloat(e.target.value))} className="input">
              <option value="0.15">15% (KSA)</option>
              <option value="0.05">5% (UAE)</option>
              <option value="0">0% (Export)</option>
            </select>
          </div>
        </div>
      </div>

      {/* Axes card */}
      <div className="card card-p">
        <h2 className="font-semibold mb-4">Pricing axes (apply to every line)</h2>
        <div className="grid grid-cols-4 gap-4">
          <AxisSelect label="Content type" value={ctype} setValue={setCtype}
            options={AXIS_OPTIONS.contentType.map(o => ({ label: o.label, val: o.factor }))} />
          <AxisSelect label="Engagement" value={eng} setValue={setEng}
            options={AXIS_OPTIONS.engagement.map(o => ({ label: o.label, val: o.factor }))} />
          <AxisSelect label="Audience" value={aud} setValue={setAud}
            options={AXIS_OPTIONS.audience.map(o => ({ label: o.label, val: o.factor }))} />
          <AxisSelect label="Seasonality" value={seas} setValue={setSeas}
            options={AXIS_OPTIONS.seasonality.map(o => ({ label: o.label, val: o.factor }))} />
          <AxisSelect label="Language" value={lang} setValue={setLang}
            options={AXIS_OPTIONS.language.map(o => ({ label: o.label, val: o.factor }))} />
          <AxisSelect label="Authority" value={auth} setValue={setAuth}
            options={AXIS_OPTIONS.authority.map(o => ({ label: o.label, val: o.factor }))} />
          <AxisSelect label="Objective weight" value={obj} setValue={setObj}
            options={AXIS_OPTIONS.objective.map(o => ({ label: o.label, val: o.weight }))} />
          <div>
            <label className="label">Measurement confidence</label>
            <select value={conf} onChange={e => setConf(e.target.value as MeasurementConfidence)} className="input">
              {AXIS_OPTIONS.confidence.map(o => (
                <option key={o.value} value={o.value}>{o.label}</option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Add-ons */}
      <div className="card card-p">
        <h2 className="font-semibold mb-4">Add-on rights packages</h2>
        <div className="grid grid-cols-3 gap-2">
          {addons.map(a => {
            const checked = addonIds.has(a.id);
            return (
              <label key={a.id} className={[
                'flex items-start gap-3 p-3 rounded-lg border cursor-pointer transition',
                checked ? 'border-green bg-green/5' : 'border-line hover:border-mute',
              ].join(' ')}>
                <input
                  type="checkbox"
                  checked={checked}
                  onChange={() => {
                    setAddonIds(s => {
                      const next = new Set(s);
                      if (next.has(a.id)) next.delete(a.id); else next.add(a.id);
                      return next;
                    });
                  }}
                  className="mt-0.5"
                />
                <div className="text-sm">
                  <div className="font-medium text-ink">{a.label} <span className="text-green">+{fmtPct(a.uplift_pct, 0)}</span></div>
                  {a.description && <div className="text-xs text-mute mt-0.5">{a.description}</div>}
                </div>
              </label>
            );
          })}
        </div>
        {addonsUpliftPct > 0 && (
          <div className="text-xs text-label mt-3">Total uplift: <strong className="text-green">+{fmtPct(addonsUpliftPct, 0)}</strong></div>
        )}
      </div>

      {/* Lines */}
      <div className="card">
        <div className="px-5 py-4 border-b border-line flex items-center justify-between">
          <h2 className="font-semibold">Quote lines</h2>
          <div className="flex items-center gap-2">
            <RosterAddPicker
              label="+ Player"
              items={players.map(p => ({ id: p.id, label: `${p.nickname}${p.tier_code ? ` · ${p.tier_code}` : ''}` }))}
              onPick={addPlayerLine}
            />
            <RosterAddPicker
              label="+ Creator"
              items={creators.map(c => ({ id: c.id, label: `${c.nickname}${c.tier_code ? ` · ${c.tier_code}` : ''}` }))}
              onPick={addCreatorLine}
            />
          </div>
        </div>

        {computed.rows.length === 0 ? (
          <div className="px-5 py-12 text-center text-label text-sm">
            No lines yet. Click <strong>+ Player</strong> or <strong>+ Creator</strong> to start.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-xs text-label uppercase tracking-wide bg-bg">
                  <th className="px-4 py-3">Talent</th>
                  <th className="px-4 py-3">Platform</th>
                  <th className="px-4 py-3 text-right">Base rate</th>
                  <th className="px-4 py-3 text-right w-20">Qty</th>
                  <th className="px-4 py-3 text-right">Unit price</th>
                  <th className="px-4 py-3 text-right">Line total</th>
                  <th className="px-4 py-3 w-10"></th>
                </tr>
              </thead>
              <tbody>
                {computed.rows.map(r => {
                  const platforms = r.talent_type === 'player' ? PLAYER_PLATFORMS : CREATOR_PLATFORMS;
                  return (
                    <tr key={r.uid} className="border-t border-line">
                      <td className="px-4 py-3">
                        <div className="font-medium text-ink">{r.talent_name}</div>
                        <div className="text-xs text-mute capitalize">{r.talent_type}</div>
                      </td>
                      <td className="px-4 py-3">
                        <select
                          value={r.platform}
                          onChange={e => changePlatform(r, e.target.value)}
                          className="input py-1 px-2 text-sm w-44"
                        >
                          {platforms.map(p => (
                            <option key={p.key} value={p.key}>{p.label}</option>
                          ))}
                        </select>
                      </td>
                      <td className="px-4 py-3 text-right text-label">
                        {r.base_rate ? fmtMoney(r.base_rate, currency) : <span className="text-orange-500">no rate set</span>}
                      </td>
                      <td className="px-4 py-3 text-right">
                        <input
                          type="number" min={1} value={r.qty}
                          onChange={e => updateLine(r.uid, { qty: Math.max(1, parseInt(e.target.value) || 1) })}
                          className="input py-1 px-2 text-right w-16"
                        />
                      </td>
                      <td className="px-4 py-3 text-right text-ink">{fmtMoney(r.finalUnit, currency)}</td>
                      <td className="px-4 py-3 text-right font-medium text-ink">{fmtMoney(r.finalAmount, currency)}</td>
                      <td className="px-4 py-3 text-right">
                        <button onClick={() => removeLine(r.uid)} className="text-mute hover:text-red-600">
                          <Trash2 size={14} />
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Notes + totals + save */}
      <div className="grid grid-cols-3 gap-6">
        <div className="card card-p col-span-2">
          <label className="label">Internal notes</label>
          <textarea
            value={notes} onChange={e => setNotes(e.target.value)}
            rows={4} className="input resize-none"
            placeholder="Context, deal nuances, special terms…"
          />
        </div>

        <div className="card card-p">
          <div className="text-xs text-label uppercase tracking-wide mb-3">Quote totals</div>
          <div className="space-y-2 text-sm">
            <Row label="Subtotal" value={fmtMoney(computed.totals.subtotal, currency)} />
            {addonsUpliftPct > 0 && (
              <Row label={`Add-on uplift (+${fmtPct(addonsUpliftPct, 0)})`} value="baked into lines" muted />
            )}
            <Row label={`VAT (${fmtPct(vatRate, 0)})`} value={fmtMoney(computed.totals.vatAmount, currency)} />
            <div className="border-t border-line pt-2 mt-2">
              <Row label="TOTAL" value={fmtMoney(computed.totals.total, currency)} bold />
            </div>
          </div>

          {error && <div className="text-xs text-red-600 mt-3">{error}</div>}

          <div className="flex flex-col gap-2 mt-5">
            <button onClick={() => save('draft')} disabled={saving}
              className="btn btn-ghost w-full justify-center">
              <Save size={14} /> {saving ? 'Saving…' : 'Save as draft'}
            </button>
            <button onClick={() => save('pending_approval')} disabled={saving}
              className="btn btn-primary w-full justify-center">
              {saving ? 'Saving…' : 'Submit for approval'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── helper components ─────────────────────────────────────────────────────
function AxisSelect({ label, value, setValue, options }: {
  label: string; value: number; setValue: (v: number) => void;
  options: { label: string; val: number }[];
}) {
  return (
    <div>
      <label className="label">{label}</label>
      <select value={value} onChange={e => setValue(parseFloat(e.target.value))} className="input">
        {options.map(o => (
          <option key={o.label} value={o.val}>{o.label}</option>
        ))}
      </select>
    </div>
  );
}

function RosterAddPicker({ label, items, onPick }: {
  label: string;
  items: { id: number; label: string }[];
  onPick: (id: number) => void;
}) {
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState('');
  const filtered = q ? items.filter(i => i.label.toLowerCase().includes(q.toLowerCase())) : items;
  return (
    <div className="relative">
      <button className="btn btn-ghost text-sm" onClick={() => setOpen(o => !o)}>
        <Plus size={14} /> {label}
      </button>
      {open && (
        <div className="absolute right-0 top-full mt-1 w-72 max-h-80 overflow-y-auto card z-10 shadow-lg">
          <div className="p-2 border-b border-line bg-bg sticky top-0">
            <input
              autoFocus value={q} onChange={e => setQ(e.target.value)}
              placeholder="Search…" className="input py-1 px-2 text-sm w-full"
            />
          </div>
          <div className="py-1">
            {filtered.length === 0 && (
              <div className="px-3 py-3 text-xs text-mute text-center">No matches</div>
            )}
            {filtered.slice(0, 100).map(i => (
              <button
                key={i.id}
                className="w-full text-left px-3 py-2 text-sm hover:bg-bg"
                onClick={() => { onPick(i.id); setOpen(false); setQ(''); }}
              >
                {i.label}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function Row({ label, value, bold, muted }: { label: string; value: string; bold?: boolean; muted?: boolean }) {
  return (
    <div className="flex items-center justify-between">
      <span className={muted ? 'text-mute text-xs' : 'text-label'}>{label}</span>
      <span className={bold ? 'font-bold text-ink text-base' : 'text-ink'}>{value}</span>
    </div>
  );
}
