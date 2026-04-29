'use client';
import { useLocale } from '@/lib/i18n/Locale';
import { useDisplayCurrency } from '@/lib/use-display-currency';
import { fmtCurrency } from '@/lib/utils';
import {
  AreaChart, Area, BarChart, Bar, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend,
} from 'recharts';

const C = {
  green: '#2ED06E',
  greenDark: '#16A34A',
  greenSoft: '#DCFCE7',
  navy: '#0B2340',
  amber: '#F59E0B',
  blue: '#3B82F6',
  purple: '#8B5CF6',
  pink: '#EC4899',
  rose: '#F43F5E',
  slate: '#64748B',
};

const PALETTE = [C.green, C.navy, C.amber, C.blue, C.purple, C.pink, C.rose, C.slate];

function fmtSar(n: number) { return Math.round(n).toLocaleString('en-US'); }
function fmtKsar(n: number) { return n >= 1000 ? `${(n / 1000).toFixed(0)}K` : `${Math.round(n)}`; }
function monthLabel(m: string) {
  // YYYY-MM → 'Jan 2026'
  const [y, mm] = m.split('-');
  const date = new Date(Number(y), Number(mm) - 1, 1);
  return date.toLocaleDateString('en-US', { month: 'short', year: '2-digit' });
}

export function RevenueCharts({
  monthly, creators, brands, platforms, funnel, aging, statusMix,
}: {
  monthly: Array<{ month: string; collected: number; pipeline: number; quotes: number }>;
  creators: Array<{ name: string; revenue: number; deals: number }>;
  brands:   Array<{ name: string; revenue: number; domain: string | null }>;
  platforms:Array<{ name: string; revenue: number }>;
  funnel:   Array<{ stage: string; value: number }>;
  aging:    Array<{ bucket: string; amount: number }>;
  statusMix:Array<{ name: string; value: number }>;
}) {
  const [ccy] = useDisplayCurrency();
  const fmtMoney = (n: number) => fmtCurrency(Number(n) || 0, ccy, 3.75);
  const { t } = useLocale();
  return (
    <div className="grid grid-cols-1 lg:grid-cols-6 gap-4">
      {/* Monthly trend — wide */}
      <div className="card card-p lg:col-span-4">
        <div className="flex items-center justify-between mb-3">
          <div>
            <h3 className="font-semibold text-ink">{t('dash.revenue_trend')}</h3>
            <p className="text-xs text-mute">{t('dash.revenue_trend_sub')}</p>
          </div>
        </div>
        <ResponsiveContainer width="100%" height={260}>
          <AreaChart data={monthly.map(m => ({ ...m, label: monthLabel(m.month) }))}>
            <defs>
              <linearGradient id="gradCollected" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor={C.green} stopOpacity={0.95}/>
                <stop offset="95%" stopColor={C.green} stopOpacity={0.15}/>
              </linearGradient>
              <linearGradient id="gradPipeline" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor={C.navy} stopOpacity={0.55}/>
                <stop offset="95%" stopColor={C.navy} stopOpacity={0.05}/>
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" />
            <XAxis dataKey="label" tick={{ fontSize: 11 }} />
            <YAxis tick={{ fontSize: 11 }} tickFormatter={fmtKsar} />
            <Tooltip
              formatter={(v: any) => fmtMoney(Number(v))}
              contentStyle={{ fontSize: 12, borderRadius: 8 }}
            />
            <Legend wrapperStyle={{ fontSize: 12 }} />
            <Area type="monotone" dataKey="collected" name="Collected" stroke={C.green} strokeWidth={2} fill="url(#gradCollected)" />
            <Area type="monotone" dataKey="pipeline"  name="Pipeline"  stroke={C.navy}  strokeWidth={2} fill="url(#gradPipeline)" />
          </AreaChart>
        </ResponsiveContainer>
      </div>

      {/* Status mix donut */}
      <div className="card card-p lg:col-span-2">
        <h3 className="font-semibold text-ink mb-1">{t('dash.status_mix')}</h3>
        <p className="text-xs text-mute mb-2">{t('dash.status_mix_sub')}</p>
        <ResponsiveContainer width="100%" height={220}>
          <PieChart>
            <Pie data={statusMix} dataKey="value" nameKey="name" innerRadius={50} outerRadius={80} paddingAngle={2}>
              {statusMix.map((_, i) => <Cell key={i} fill={[C.green, C.blue, C.amber, C.slate][i % 4]} />)}
            </Pie>
            <Tooltip contentStyle={{ fontSize: 12, borderRadius: 8 }} />
            <Legend wrapperStyle={{ fontSize: 11 }} iconSize={8} />
          </PieChart>
        </ResponsiveContainer>
      </div>

      {/* Top creators */}
      <div className="card card-p lg:col-span-3">
        <h3 className="font-semibold text-ink mb-1">{t('dash.top_creators')}</h3>
        <p className="text-xs text-mute mb-2">{t('dash.top_creators_sub')}</p>
        <ResponsiveContainer width="100%" height={Math.max(180, creators.length * 32)}>
          <BarChart data={creators} layout="vertical" margin={{ left: 30, right: 30 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#F3F4F6" horizontal={false} />
            <XAxis type="number" tick={{ fontSize: 11 }} tickFormatter={fmtKsar} />
            <YAxis type="category" dataKey="name" width={90} tick={{ fontSize: 11 }} />
            <Tooltip formatter={(v: any) => fmtMoney(Number(v))} contentStyle={{ fontSize: 12, borderRadius: 8 }} />
            <Bar dataKey="revenue" fill={C.green} radius={[0, 4, 4, 0]}>
              {creators.map((_, i) => <Cell key={i} fill={i === 0 ? C.greenDark : C.green} />)}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* Brand portfolio — custom row layout with logos */}
      <div className="card card-p lg:col-span-3">
        <h3 className="font-semibold text-ink mb-1">{t('dash.brand_portfolio')}</h3>
        <p className="text-xs text-mute mb-3">{t('dash.brand_portfolio_sub')}</p>
        <BrandList brands={brands} />
      </div>

      {/* Funnel */}
      <div className="card card-p lg:col-span-3">
        <h3 className="font-semibold text-ink mb-1">{t('dash.funnel')}</h3>
        <p className="text-xs text-mute mb-2">{t('dash.funnel_sub')}</p>
        <ResponsiveContainer width="100%" height={220}>
          <BarChart data={funnel}>
            <CartesianGrid strokeDasharray="3 3" stroke="#F3F4F6" />
            <XAxis dataKey="stage" tick={{ fontSize: 10 }} interval={0} angle={-15} textAnchor="end" height={50} />
            <YAxis tick={{ fontSize: 11 }} allowDecimals={false} />
            <Tooltip contentStyle={{ fontSize: 12, borderRadius: 8 }} />
            <Bar dataKey="value" radius={[4, 4, 0, 0]}>
              {funnel.map((_, i) => (
                <Cell key={i} fill={[C.navy, C.blue, C.purple, C.amber, C.greenDark, C.green][i]} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* AR aging */}
      <div className="card card-p lg:col-span-3">
        <h3 className="font-semibold text-ink mb-1">{t('dash.aging')}</h3>
        <p className="text-xs text-mute mb-2">{t('dash.aging_sub')}</p>
        <ResponsiveContainer width="100%" height={220}>
          <BarChart data={aging}>
            <CartesianGrid strokeDasharray="3 3" stroke="#F3F4F6" />
            <XAxis dataKey="bucket" tick={{ fontSize: 11 }} />
            <YAxis tick={{ fontSize: 11 }} tickFormatter={fmtKsar} />
            <Tooltip formatter={(v: any) => fmtMoney(Number(v))} contentStyle={{ fontSize: 12, borderRadius: 8 }} />
            <Bar dataKey="amount" radius={[4, 4, 0, 0]}>
              {aging.map((_, i) => (
                <Cell key={i} fill={[C.green, C.amber, C.rose, C.navy][i]} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* Platform mix — full width */}
      <div className="card card-p lg:col-span-6">
        <h3 className="font-semibold text-ink mb-1">{t('dash.platform_mix')}</h3>
        <p className="text-xs text-mute mb-2">{t('dash.platform_mix_sub')}</p>
        <ResponsiveContainer width="100%" height={180}>
          <BarChart data={platforms}>
            <CartesianGrid strokeDasharray="3 3" stroke="#F3F4F6" />
            <XAxis dataKey="name" tick={{ fontSize: 11 }} />
            <YAxis tick={{ fontSize: 11 }} tickFormatter={fmtKsar} />
            <Tooltip formatter={(v: any) => fmtMoney(Number(v))} contentStyle={{ fontSize: 12, borderRadius: 8 }} />
            <Bar dataKey="revenue" fill={C.green} radius={[4, 4, 0, 0]}>
              {platforms.map((_, i) => <Cell key={i} fill={PALETTE[i % PALETTE.length]} />)}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}

// ── Brand list with auto-sourced logos ─────────────────────────────────────
function BrandList({ brands }: { brands: Array<{ name: string; revenue: number; domain: string | null }> }) {
  const max = Math.max(...brands.map(b => b.revenue), 1);
  return (
    <ul className="space-y-2">
      {brands.map((b, i) => {
        const pct = (b.revenue / max) * 100;
        return (
          <li key={b.name} className="flex items-center gap-3">
            <BrandLogo name={b.name} domain={b.domain} />
            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between mb-1">
                <span className="text-sm font-medium text-ink truncate">{b.name}</span>
                <span className="text-xs font-semibold text-greenDark tabular-nums whitespace-nowrap ml-2">
                  {fmtMoney(b.revenue)}
                </span>
              </div>
              <div className="h-1.5 rounded-full bg-bg overflow-hidden">
                <div
                  className="h-full rounded-full"
                  style={{
                    width: pct + '%',
                    backgroundColor: PALETTE[i % PALETTE.length],
                  }}
                />
              </div>
            </div>
          </li>
        );
      })}
    </ul>
  );
}

function BrandLogo({ name, domain }: { name: string; domain: string | null }) {
  const initials = name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map(s => s[0]?.toUpperCase() ?? '')
    .join('') || '?';

  if (!domain) {
    // Coloured initials tile
    const hue = Array.from(name).reduce((h, c) => (h * 31 + c.charCodeAt(0)) >>> 0, 0) % 360;
    return (
      <div
        className="w-9 h-9 rounded-lg grid place-items-center text-xs font-bold text-white flex-shrink-0"
        style={{ backgroundColor: `hsl(${hue}, 55%, 45%)` }}
      >
        {initials}
      </div>
    );
  }

  return (
    <div className="w-9 h-9 rounded-lg bg-white border border-line grid place-items-center overflow-hidden flex-shrink-0">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={`https://logo.clearbit.com/${domain}?size=72`}
        alt={name}
        className="w-7 h-7 object-contain"
        onError={(e) => {
          // Fallback to initials on logo failure
          const el = e.currentTarget;
          el.style.display = 'none';
          const parent = el.parentElement;
          if (parent && !parent.querySelector('.fallback-initials')) {
            const span = document.createElement('span');
            span.textContent = initials;
            span.className = 'fallback-initials text-xs font-bold text-label';
            parent.appendChild(span);
          }
        }}
      />
    </div>
  );
}

