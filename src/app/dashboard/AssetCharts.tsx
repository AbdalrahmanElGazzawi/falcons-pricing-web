'use client';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell, Legend } from 'recharts';

const C = {
  green: '#2ED06E',
  greenDark: '#16A34A',
  navy: '#0B2340',
  amber: '#F59E0B',
  blue: '#3B82F6',
  purple: '#8B5CF6',
  pink: '#EC4899',
  rose: '#F43F5E',
  slate: '#64748B',
};
const PALETTE = [C.green, C.navy, C.amber, C.blue, C.purple, C.pink, C.rose, C.slate];

const TIER_COLOR: Record<string, string> = {
  S: C.amber, A: C.green, B: C.blue, C: C.navy, D: C.slate, '—': '#94A3B8',
};

export function AssetCharts({
  byTier, byGame,
}: {
  byTier: Array<{ tier: string; players: number; creators: number; total: number }>;
  byGame: Array<{ game: string; count: number }>;
  playerPlatforms?: string[];
  creatorPlatforms?: string[];
}) {
  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
      {/* Roster by tier — stacked bar */}
      <div className="card card-p lg:col-span-1">
        <h3 className="font-semibold text-ink mb-1">Roster by tier</h3>
        <p className="text-xs text-mute mb-3">Players (light) + creators (dark) per tier</p>
        <ResponsiveContainer width="100%" height={260}>
          <BarChart data={byTier}>
            <CartesianGrid strokeDasharray="3 3" stroke="#F3F4F6" />
            <XAxis dataKey="tier" tick={{ fontSize: 12, fontWeight: 600 }} />
            <YAxis tick={{ fontSize: 11 }} allowDecimals={false} />
            <Tooltip contentStyle={{ fontSize: 12, borderRadius: 8 }} />
            <Legend wrapperStyle={{ fontSize: 11 }} iconSize={8} />
            <Bar dataKey="players"  name="Players"  stackId="a" fill={C.green} radius={[0, 0, 0, 0]} />
            <Bar dataKey="creators" name="Creators" stackId="a" fill={C.navy}  radius={[4, 4, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* Roster by game — horizontal bar */}
      <div className="card card-p lg:col-span-2">
        <h3 className="font-semibold text-ink mb-1">Roster depth by game</h3>
        <p className="text-xs text-mute mb-3">Active players per esports title</p>
        <ResponsiveContainer width="100%" height={Math.max(360, byGame.length * 22)}>
          <BarChart data={byGame} layout="vertical" margin={{ left: 30, right: 20 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#F3F4F6" horizontal={false} />
            <XAxis type="number" tick={{ fontSize: 11 }} allowDecimals={false} />
            <YAxis type="category" dataKey="game" width={170} tick={{ fontSize: 11 }} interval={0} />
            <Tooltip contentStyle={{ fontSize: 12, borderRadius: 8 }} />
            <Bar dataKey="count" radius={[0, 4, 4, 0]}>
              {byGame.map((_, i) => <Cell key={i} fill={PALETTE[i % PALETTE.length]} />)}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
