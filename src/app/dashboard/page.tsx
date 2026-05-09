import Link from 'next/link';
import { requireStaff } from '@/lib/auth';
import { Shell, PageHeader } from '@/components/Shell';
import { AccessDenied } from '@/components/AccessDenied';
import { isSuperAdminEmail } from '@/lib/super-admin';
import { getPageLayout } from '@/lib/layout';
import { DashboardLayout } from './DashboardLayout';
import { ATeamGrid, BrainTrustGrid } from './PlayerTiles';
import { Users, Sparkles, Trophy, Gamepad2, Layers, PlusCircle, ArrowUpRight, BarChart3, Megaphone, GraduationCap, Briefcase } from 'lucide-react';
import { AssetCharts } from './AssetCharts';

export const dynamic = 'force-dynamic';
function fmtFollow(n: number) {
  if (n >= 1_000_000) return (n / 1_000_000).toFixed(1).replace(/\.0$/, '') + 'M';
  if (n >= 1_000)     return (n / 1_000).toFixed(1).replace(/\.0$/, '') + 'K';
  return n.toLocaleString('en-US');
}


export default async function DashboardPage() {
  const { denied, profile, supabase } = await requireStaff();
  if (denied) return <AccessDenied />;

  const [
    { data: players },
    { data: creators },
    { data: tiers },
    { data: teams },
    { data: recentDeals },
    { data: recentClassChanges },
  ] = await Promise.all([
    supabase.from('players').select('id, nickname, full_name, role, game, tier_code, avatar_url, ingame_role, agency_status, agency_name, agency_contact, is_bookable, profile_strength_pct, intake_status, authority_tier, authority_tier_override, archetype, archetype_override').eq('is_active', true),
    supabase.from('creators').select('id, nickname, tier_code, is_bookable, profile_strength_pct').eq('is_active', true),
    supabase.from('tiers').select('code, label, sort_order').order('sort_order'),
    supabase.from('esports_teams').select('*').eq('is_active', true).order('sort_order').order('game'),
    supabase.from('deals').select('id, brand_name, brand_category, status, quoted_price_sar, final_price_sar, discount_percent, created_at, closed_at').order('created_at', { ascending: false }).limit(7),
    supabase.from('audit_log').select('entity_id, action, diff, created_at').in('action', ['authority_tier_classification','archetype_profile_backfill']).order('created_at', { ascending: false }).limit(50),
  ]);

  const allRows = players ?? [];
  const allCreators = creators ?? [];
  const allTiers = tiers ?? [];
  const allTeams = (teams ?? []) as any[];

  // Roster categorisation — the players table mixes athletes with staff.
  const STAFF_ROLES = new Set(['Coach','Head Coach','Assistant Coach','Manager','Analyst']);
  const playersOnly  = allRows.filter(p => p.role === 'Player');
  const staffOnly    = allRows.filter(p => STAFF_ROLES.has(p.role || ''));
  const influencers  = allRows.filter(p => p.role === 'Influencer');

  const totalReach = allTeams.reduce((s, t) =>
    s + Number(t.followers_ig||0) + Number(t.followers_x||0) + Number(t.followers_tiktok||0) +
        Number(t.subscribers_yt||0) + Number(t.followers_twitch||0), 0);
  const teamsWithChannels = allTeams.filter(t => t.handle_ig || t.handle_x || t.handle_tiktok || t.handle_yt || t.handle_twitch);

  // ── Hero counts ───────────────────────────────────────────────────────────
  const totalPlayers = playersOnly.length;
  const totalStaff   = staffOnly.length;
  const totalInfluencers = influencers.length;
  const totalCreators = allCreators.length;
  const totalRoster = totalPlayers + totalCreators + totalInfluencers;

  // ── Pricing readiness (Mig 059 + 062) ────────────────────────────────────
  // Bookable + profile-strength reflects the agency-industry two-axis model:
  // continuous confidence score + binary bookable. Intake-status is the
  // talent-side floor approval queue.
  const allBookable = [...allRows, ...allCreators];
  const bookableCount = allBookable.filter((r: any) => r.is_bookable !== false).length;
  const onHoldCount   = allBookable.filter((r: any) => r.is_bookable === false).length;
  const bookablePct   = allBookable.length ? Math.round((bookableCount / allBookable.length) * 100) : 0;

  const strengths = allBookable
    .map((r: any) => Number(r.profile_strength_pct ?? 0))
    .filter(n => Number.isFinite(n));
  const avgStrength = strengths.length ? Math.round(strengths.reduce((s, n) => s + n, 0) / strengths.length) : 0;
  const strongCount = strengths.filter(n => n >= 70).length;
  const midCount    = strengths.filter(n => n >= 50 && n < 70).length;
  const weakCount   = strengths.filter(n => n < 50).length;

  const intakeSubmitted = allRows.filter((p: any) => p.intake_status === 'submitted' || p.intake_status === 'revised').length;
  const intakeApproved  = allRows.filter((p: any) => p.intake_status === 'approved').length;
  const intakeSent      = allRows.filter((p: any) => p.intake_status === 'sent').length;
  const intakeNotStarted = allRows.filter((p: any) => !p.intake_status || p.intake_status === 'not_started').length;

  // tier codes are stored as 'Tier S' / 'Tier 1' / 'Tier 2' — not single letters
  const tierSPlayers = playersOnly.filter(p => p.tier_code === 'Tier S');
  const games = new Set(playersOnly.map(p => p.game).filter(Boolean));

  // Agency representation breakdown
  const agencyDirect  = playersOnly.filter(p => p.agency_status === 'direct').length;
  const agencyManaged = playersOnly.filter(p => p.agency_status === 'agency').length;
  const agencyUnknown = playersOnly.filter(p => !p.agency_status || p.agency_status === 'unknown').length;

  // ── Roster by tier (players + creators only; staff are tracked separately) ─
  const tierBuckets = new Map<string, { players: number; creators: number }>();
  for (const p of playersOnly) {
    const k = (p.tier_code || '—').replace(/^Tier\s+/, '');
    if (!tierBuckets.has(k)) tierBuckets.set(k, { players: 0, creators: 0 });
    tierBuckets.get(k)!.players += 1;
  }
  for (const c of allCreators) {
    const k = (c.tier_code || '—').replace(/^Tier\s+/, '');
    if (!tierBuckets.has(k)) tierBuckets.set(k, { players: 0, creators: 0 });
    tierBuckets.get(k)!.creators += 1;
  }
  // Sort: S first, then numeric ascending
  const tierSortKey = (k: string) => k === 'S' ? -1 : Number(k) || 99;
  const byTier = [...tierBuckets.entries()]
    .sort((a, b) => tierSortKey(a[0]) - tierSortKey(b[0]))
    .map(([code, v]) => ({
      tier: code === '—' ? 'Untiered' : code,
      players: v.players, creators: v.creators, total: v.players + v.creators,
    }));

  // ── Roster by game ────────────────────────────────────────────────────────
  const gameMap = new Map<string, number>();
  for (const p of playersOnly) {
    const g = p.game || 'Other';
    gameMap.set(g, (gameMap.get(g) ?? 0) + 1);
  }
  const byGame = [...gameMap.entries()]
    .map(([game, count]) => ({ game, count }))
    .sort((a, b) => b.count - a.count);

  // ── Deliverable inventory (platforms covered) ────────────────────────────
  // Player platforms (from rate columns)
  const playerPlatforms = [
    'IG Reels','IG Static','IG Story','TikTok','YouTube Shorts','X Post','Facebook',
    'Twitch Stream','Twitch Integration','IRL Appearance',
  ];
  const creatorPlatforms = [
    'X Post / Quote','X Repost','IG Post','IG Story','IG Reels','YT Full Video',
    'YT Pre-roll','YT Shorts','Snapchat','TikTok','Twitch / Kick Live','Telegram',
  ];


  // Super admin can reorder sections; persisted in page_layouts
  const sectionOrder = await getPageLayout(
    supabase, 'dashboard',
    ['hero', 'readiness', 'owned_media', 'a_team', 'brain_trust', 'charts', 'inventory']
  );

  const sectionNodes: Record<string, React.ReactNode> = {
    readiness: (
      <>
      {/* PRICING READINESS — bookable + profile-strength + intake queue */}
      <div className="card overflow-hidden mb-6">
        <div className="px-5 py-3 border-b border-line flex items-center justify-between">
          <div>
            <h2 className="font-semibold flex items-center gap-2"><BarChart3 size={14} className="text-greenDark" /> Pricing readiness</h2>
            <p className="text-xs text-mute mt-0.5">Bookable status + profile strength + intake-approval queue. The 5-second answer to &quot;what % of the roster can I sell today?&quot;</p>
          </div>
          <Link href="/roster/players?readiness=on_hold" className="text-xs text-greenDark hover:underline">View on-hold →</Link>
        </div>
        <div className="grid grid-cols-2 lg:grid-cols-5 gap-4 p-5">
          <div className="rounded-xl border border-greenDark/30 bg-greenSoft/40 p-4">
            <div className="text-[10px] text-greenDark uppercase tracking-wider font-bold">Bookable today</div>
            <div className="text-3xl font-extrabold text-greenDark tabular-nums mt-1">{bookablePct}%</div>
            <div className="text-xs text-label mt-1">{bookableCount} of {allBookable.length} active</div>
          </div>
          <div className="rounded-xl border border-line p-4">
            <div className="text-[10px] text-mute uppercase tracking-wider font-bold">On hold</div>
            <div className="text-3xl font-extrabold text-ink tabular-nums mt-1">{onHoldCount}</div>
            <div className="text-xs text-label mt-1">{onHoldCount === 0 ? 'no hard blockers' : 'needs source / market'}</div>
          </div>
          <div className="rounded-xl border border-line p-4">
            <div className="text-[10px] text-mute uppercase tracking-wider font-bold">Avg profile strength</div>
            <div className="text-3xl font-extrabold text-ink tabular-nums mt-1">{avgStrength}%</div>
            <div className="text-xs text-label mt-1">strong {strongCount} · mid {midCount} · weak {weakCount}</div>
          </div>
          <div className="rounded-xl border border-line p-4">
            <div className="text-[10px] text-mute uppercase tracking-wider font-bold">Intake queue</div>
            <div className="text-3xl font-extrabold text-ink tabular-nums mt-1">{intakeSubmitted}</div>
            <div className="text-xs text-label mt-1">awaiting your approval</div>
          </div>
          <div className="rounded-xl border border-line p-4">
            <div className="text-[10px] text-mute uppercase tracking-wider font-bold">Intake coverage</div>
            <div className="text-3xl font-extrabold text-ink tabular-nums mt-1">{intakeApproved}</div>
            <div className="text-xs text-label mt-1">approved · {intakeSent} sent · {intakeNotStarted} not started</div>
          </div>
        </div>
      </div>
      </>
    ),
    hero: (
      <>
      {/* Hero strip — asset inventory */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-4 mb-6">
        <HeroCard icon={Megaphone} tint="green" label="Owned channel reach" value={fmtFollow(totalReach)} sub={`${teamsWithChannels.length}/${allTeams.length} teams populated`} />
        <HeroCard icon={Users}     tint="navy"  label="Pro players"         value={totalPlayers.toString()} sub={`+ ${totalCreators} creators · ${totalInfluencers} influencers`} />
        <HeroCard icon={Trophy}    tint="amber" label="Tier S anchors"      value={tierSPlayers.length.toString()} sub={tierSPlayers.length > 0 ? tierSPlayers.slice(0, 2).map(p => p.nickname).join(' · ') : 'promote stars in /admin/tiers'} />
        <HeroCard icon={Briefcase} tint="navy"  label="Direct vs agency"   value={`${agencyDirect}/${agencyManaged}`} sub={`${agencyUnknown} still to capture`} />
        <HeroCard icon={Gamepad2}  tint="green" label="Games covered"       value={games.size.toString()} sub={`${totalStaff} staff across teams`} />
      </div>
      </>
    ),
    owned_media: (
      <>
      {/* OWNED MEDIA — what we sell directly */}
      <div className="card overflow-hidden mb-6">
        <div className="px-5 py-3 border-b border-line flex items-center justify-between">
          <div>
            <h2 className="font-semibold flex items-center gap-2"><Megaphone size={14} className="text-greenDark" /> Owned Media — Team Channels</h2>
            <p className="text-xs text-mute mt-0.5">Falcons-owned social channels per game. <strong>This is what we sell directly.</strong> Brand pays us, content lives on our channel.</p>
          </div>
          {profile.role === 'admin' && (
            <Link href="/admin/esports-teams" className="text-xs text-greenDark hover:underline">Manage →</Link>
          )}
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3 p-4">
          {allTeams.map(t => {
            const reach = Number(t.followers_ig||0) + Number(t.followers_x||0) + Number(t.followers_tiktok||0) +
                          Number(t.subscribers_yt||0) + Number(t.followers_twitch||0);
            const channels = [t.handle_ig, t.handle_x, t.handle_tiktok, t.handle_yt, t.handle_twitch].filter(Boolean).length;
            const populated = channels > 0;
            return (
              <div key={t.id} className={['relative rounded-xl border overflow-hidden', populated ? 'border-line bg-white' : 'border-dashed border-line bg-bg/60'].join(' ')}>
                <div className="p-3">
                  <div className="flex items-center gap-2 mb-2">
                    <div className="w-8 h-8 rounded-md bg-navy text-white grid place-items-center text-[11px] font-bold flex-shrink-0">
                      {t.game.split(' ').map((s: string) => s[0]).slice(0, 2).join('').toUpperCase()}
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="text-[11px] text-mute uppercase tracking-wider truncate">{t.game}</div>
                      <div className="text-sm font-semibold text-ink truncate">{t.team_name}</div>
                    </div>
                  </div>
                  <div className="flex items-center justify-between text-xs">
                    <span className={populated ? 'text-greenDark font-semibold tabular-nums' : 'text-mute italic'}>
                      {populated ? fmtFollow(reach) : 'Add handles →'}
                    </span>
                    <span className="text-[10px] text-label uppercase tracking-wider font-semibold">{channels}/5</span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
      </>
    ),
    a_team: (
      <>
      {/* A-team showcase — Tier S spotlight */}
      <div className="card overflow-hidden mb-6">
        <div className="px-5 py-3 border-b border-line flex items-center justify-between">
          <div>
            <h2 className="font-semibold flex items-center gap-2"><Trophy size={14} className="text-amber-500" /> Talent We Represent — Tier S anchors</h2>
            <p className="text-xs text-mute mt-0.5">Players we represent. Brand pays us, content lives on the player's personal channels — we take a fee/markup.</p>
          </div>
          <Link href="/roster/players?tier=Tier+S" className="text-xs text-greenDark hover:underline">View all →</Link>
        </div>
        {tierSPlayers.length === 0 ? (
          <div className="p-8 text-center text-mute text-sm">No Tier S talent yet — promote your top performers in /admin/tiers.</div>
        ) : (
          <ATeamGrid players={tierSPlayers as any} />
        )}
      </div>
      </>
    ),
    brain_trust: (
      <>
      {/* Coaching staff & analysts — under-leveraged commercial asset */}
      {staffOnly.length > 0 && (
        <div className="card overflow-hidden mb-6">
          <div className="px-5 py-3 border-b border-line flex items-center justify-between">
            <div>
              <h2 className="font-semibold flex items-center gap-2"><GraduationCap size={14} className="text-blue-700" /> Brain Trust — Coaching Staff & Analysts</h2>
              <p className="text-xs text-mute mt-0.5">{staffOnly.length} coaches, analysts, managers across {games.size} games. Often underutilised in brand deals — perfect for expert interviews, technical content, behind-the-scenes.</p>
            </div>
            <Link href="/roster/players?role=staff" className="text-xs text-greenDark hover:underline">View all →</Link>
          </div>
          <BrainTrustGrid players={staffOnly as any} totalCount={staffOnly.length} />
        </div>
      )}
      </>
    ),
    charts: (
      <>
      {/* Charts — roster shape */}
      <AssetCharts
        byTier={byTier}
        byGame={byGame}
        playerPlatforms={playerPlatforms}
        creatorPlatforms={creatorPlatforms}
      />
      </>
    ),
    inventory: (
      <>
      {/* Deliverable inventory tables */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mt-6">
        <DeliverableInventory title="Player deliverables" subtitle="What pro athletes can deliver" items={playerPlatforms} icon={Users} />
        <DeliverableInventory title="Creator deliverables" subtitle="Influencer & content-creator inventory" items={creatorPlatforms} icon={Sparkles} />
      </div>
      </>
    ),
  };

  return (
    <Shell role={profile.role} email={profile.email} fullName={profile.full_name}>
      <PageHeader
        title={`Hello, ${profile.full_name || profile.email.split('@')[0]}`}
        subtitle="Roster & Assets — what we have to sell"
        action={
          <div className="flex items-center gap-2">
            {isSuperAdminEmail(profile.email) && (
              <Link href="/admin/revenue" className="btn btn-ghost">
                <BarChart3 size={14} /> Revenue insights
              </Link>
            )}
            <Link href="/quote/new" className="btn btn-primary">
              <PlusCircle size={16} /> New quote
            </Link>
          </div>
        }
      />

      {/* ─── V3.4 Pricing OS at a glance ───────────────────────────── */}
      {(() => {
        const at1 = allRows.filter((p: any) => (p.authority_tier_override ?? p.authority_tier) === 'AT-1').length;
        const at2 = allRows.filter((p: any) => (p.authority_tier_override ?? p.authority_tier) === 'AT-2').length;
        const at3 = allRows.filter((p: any) => (p.authority_tier_override ?? p.authority_tier) === 'AT-3').length;
        const at0 = allRows.filter((p: any) => (p.authority_tier_override ?? p.authority_tier) === 'AT-0').length;
        const archCounts: Record<string, number> = {};
        for (const p of allRows as any[]) {
          const a = p.archetype_override ?? p.archetype ?? 'unclassified';
          archCounts[a] = (archCounts[a] ?? 0) + 1;
        }
        const accepted = (recentDeals ?? []).filter((d: any) => d.status === 'accepted').length;
        const totalDeals = (recentDeals ?? []).length;
        const avgDiscount = (recentDeals ?? []).filter((d: any) => d.status === 'accepted' && d.discount_percent != null)
          .reduce((s: number, d: any, _i: number, arr: any[]) => s + Number(d.discount_percent) / arr.length, 0);
        const overrideCount = (recentClassChanges ?? []).length;

        return (
          <section className="rounded-2xl border border-greenDark/30 bg-gradient-to-br from-greenSoft/40 via-white to-greenSoft/30 p-5 mb-6">
            <div className="flex items-baseline justify-between mb-3">
              <h2 className="text-lg font-bold text-greenDark flex items-center gap-2">⚡ Pricing OS at a glance</h2>
              <div className="text-[11px] text-mute">Engine v1.0-2026-05-09 · {allRows.length + allCreators.length} talents classified</div>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              <div className="rounded-lg border border-amber-200 bg-amber-50 p-3">
                <div className="text-[10px] uppercase tracking-wider text-amber-700 font-semibold">🏆 World Champions</div>
                <div className="text-3xl font-extrabold tabular-nums text-amber-900 mt-1">{at1}</div>
                <div className="text-[10px] text-amber-700">AT-1 · ×1.40 anchor lift</div>
              </div>
              <div className="rounded-lg border border-line bg-white p-3">
                <div className="text-[10px] uppercase tracking-wider text-mute font-semibold">🥈 Major Finalists</div>
                <div className="text-3xl font-extrabold tabular-nums mt-1">{at2}</div>
                <div className="text-[10px] text-mute">AT-2 · ×1.20</div>
              </div>
              <div className="rounded-lg border border-line bg-white p-3">
                <div className="text-[10px] uppercase tracking-wider text-mute font-semibold">⭐ Tier-1 Active</div>
                <div className="text-3xl font-extrabold tabular-nums mt-1">{at3}</div>
                <div className="text-[10px] text-mute">AT-3 · ×1.10</div>
              </div>
              <div className="rounded-lg border border-line bg-white p-3">
                <div className="text-[10px] uppercase tracking-wider text-mute font-semibold">No Authority Signal</div>
                <div className="text-3xl font-extrabold tabular-nums mt-1">{at0}</div>
                <div className="text-[10px] text-mute">AT-0 · ×1.00 (bug-fix neutral)</div>
              </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mt-4">
              <div className="rounded-lg border border-line bg-white p-3">
                <div className="text-[11px] uppercase tracking-wider text-label font-semibold mb-2">Archetype distribution</div>
                <div className="space-y-1.5">
                  {Object.entries(archCounts).sort((a,b) => b[1] - a[1]).slice(0, 6).map(([k, v]) => (
                    <div key={k} className="flex items-center gap-2 text-[11px]">
                      <span className="w-32 truncate text-ink capitalize">{k.replace(/_/g, ' ')}</span>
                      <div className="flex-1 bg-bg rounded-full h-2 overflow-hidden">
                        <div className="bg-greenDark h-full" style={{ width: `${Math.min(100, (v / allRows.length) * 100 * 3)}%` }} />
                      </div>
                      <span className="text-mute tabular-nums">{v}</span>
                    </div>
                  ))}
                </div>
              </div>
              <div className="rounded-lg border border-line bg-white p-3">
                <div className="text-[11px] uppercase tracking-wider text-label font-semibold mb-2">Recent deal activity</div>
                {totalDeals === 0 ? (
                  <p className="text-xs text-mute italic">No deals logged in last 30 days. <Link href="/admin/deals" className="text-greenDark hover:underline">Log one →</Link></p>
                ) : (
                  <div className="space-y-1 text-xs">
                    <div className="flex justify-between"><span className="text-mute">Last 7 deals</span><span className="font-semibold tabular-nums">{totalDeals}</span></div>
                    <div className="flex justify-between"><span className="text-mute">Accepted</span><span className="font-semibold text-greenDark tabular-nums">{accepted}/{totalDeals}</span></div>
                    <div className="flex justify-between"><span className="text-mute">Avg discount on close</span><span className="font-semibold tabular-nums">{avgDiscount.toFixed(1)}%</span></div>
                    <Link href="/admin/deals" className="text-greenDark hover:underline text-[10px] block mt-1">Open deal log →</Link>
                  </div>
                )}
              </div>
            </div>

            <div className="flex items-center justify-between mt-4 pt-3 border-t border-line">
              <div className="text-[11px] text-mute">
                {overrideCount > 0
                  ? <>Recent classification activity: {overrideCount} overrides logged. <Link href="/admin/audit-log" className="text-greenDark hover:underline">Review →</Link></>
                  : <>No pending classification overrides. <Link href="/roster/players" className="text-greenDark hover:underline">Audit roster →</Link></>}
              </div>
              <div className="flex gap-2">
                <Link href="/admin/health" className="btn btn-ghost text-xs">📊 Health</Link>
                <Link href="/admin/inventory-assets" className="btn btn-ghost text-xs">🎬 Inventory</Link>
                <Link href="/admin/deals" className="btn btn-ghost text-xs">💰 Deals</Link>
              </div>
            </div>
          </section>
        );
      })()}

      <DashboardLayout
        initialOrder={sectionOrder}
        sectionNodes={sectionNodes}
        isSuperAdmin={isSuperAdminEmail(profile.email)}
      />
    </Shell>
  );
}

function HeroCard({ icon: Icon, tint, label, value, sub }: { icon: any; tint: 'green'|'navy'|'amber'; label: string; value: string; sub: string }) {
  const tintMap = {
    green: 'from-green/10 to-greenSoft/40 text-greenDark',
    navy:  'from-navy/10 to-navy/5 text-navy',
    amber: 'from-amber-100 to-amber-50 text-amber-700',
  } as const;
  return (
    <div className={`card overflow-hidden bg-gradient-to-br ${tintMap[tint]}`}>
      <div className="p-4">
        <div className="flex items-start justify-between">
          <div className="text-[10px] uppercase tracking-widest font-semibold opacity-70">{label}</div>
          <Icon size={18} className="opacity-60" />
        </div>
        <div className="mt-2 text-3xl font-bold tabular-nums text-ink">{value}</div>
        <div className="mt-1 text-[11px] text-label flex items-center gap-1">
          <ArrowUpRight size={11} /> {sub}
        </div>
      </div>
    </div>
  );
}

function DeliverableInventory({ title, subtitle, items, icon: Icon }: { title: string; subtitle: string; items: string[]; icon: any }) {
  return (
    <div className="card card-p">
      <div className="flex items-center gap-2 mb-1">
        <Icon size={14} className="text-greenDark" />
        <h3 className="font-semibold text-ink">{title}</h3>
      </div>
      <p className="text-xs text-mute mb-3">{subtitle}</p>
      <div className="flex flex-wrap gap-1.5">
        {items.map(p => (
          <span key={p} className="px-2.5 py-1 rounded-full text-xs font-medium bg-bg border border-line text-label">
            {p}
          </span>
        ))}
      </div>
    </div>
  );
}
