import Link from 'next/link';
import { requireStaff } from '@/lib/auth';
import { Shell, PageHeader } from '@/components/Shell';
import { AccessDenied } from '@/components/AccessDenied';
import { isSuperAdminEmail } from '@/lib/super-admin';
import { getPageLayout } from '@/lib/layout';
import { DashboardLayout } from './DashboardLayout';
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
  ] = await Promise.all([
    supabase.from('players').select('id, nickname, full_name, role, game, tier_code, avatar_url, ingame_role, agency_status, agency_name, agency_contact').eq('is_active', true),
    supabase.from('creators').select('id, nickname, tier_code').eq('is_active', true),
    supabase.from('tiers').select('code, label, sort_order').order('sort_order'),
    supabase.from('esports_teams').select('*').eq('is_active', true).order('sort_order').order('game'),
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
    ['hero', 'owned_media', 'a_team', 'brain_trust', 'charts', 'inventory']
  );

  const sectionNodes: Record<string, React.ReactNode> = {
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
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6 gap-3 p-4">
            {tierSPlayers.map(p => (
              <Link key={p.id} href={`/roster/players?focus=${p.id}`} className="group">
                <div className="aspect-square rounded-xl bg-gradient-to-br from-navy/5 to-amber-50 border border-line overflow-hidden grid place-items-center relative">
                  {p.avatar_url ? (
                    /* eslint-disable-next-line @next/next/no-img-element */
                    <img src={p.avatar_url} alt={p.nickname} className="w-full h-full object-cover" />
                  ) : (
                    <div className="text-3xl font-bold text-navy/40">{p.nickname.slice(0, 2).toUpperCase()}</div>
                  )}
                  <div className="absolute top-1.5 right-1.5">
                    <span className="px-1.5 py-0.5 rounded bg-amber-500 text-white text-[9px] font-bold uppercase tracking-wider">S</span>
                  </div>
                </div>
                <div className="mt-2 px-1">
                  <div className="text-sm font-semibold text-ink truncate group-hover:text-greenDark">{p.nickname}</div>
                  <div className="text-[10px] text-mute uppercase tracking-wide truncate">{p.game}{p.ingame_role ? ` · ${p.ingame_role}` : ''}</div>
                  {p.agency_status === 'agency' ? (
                    <div className="text-[10px] text-blue-700 mt-0.5 truncate" title={`${p.agency_name || ''}${p.agency_contact ? ' · ' + p.agency_contact : ''}`}>
                      <Briefcase size={9} className="inline mr-0.5 mb-0.5" />
                      {p.agency_name || p.agency_contact || 'Agency-managed'}
                    </div>
                  ) : p.agency_status === 'direct' ? (
                    <div className="text-[10px] text-greenDark mt-0.5">Direct</div>
                  ) : null}
                </div>
              </Link>
            ))}
          </div>
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
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3 p-4">
            {staffOnly.slice(0, 8).map(p => (
              <div key={p.id} className="flex items-center gap-3 p-2 rounded-lg border border-line bg-bg/40">
                <div className="w-10 h-10 rounded-full bg-navy text-white grid place-items-center font-bold text-xs flex-shrink-0">
                  {p.nickname.slice(0, 2).toUpperCase()}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="text-sm font-medium text-ink truncate">{p.nickname}</div>
                  <div className="text-[10px] text-mute uppercase tracking-wide truncate">{p.role} · {p.game}</div>
                </div>
              </div>
            ))}
            {staffOnly.length > 8 && (
              <Link href="/roster/players?role=staff" className="flex items-center justify-center p-2 rounded-lg border border-dashed border-line text-xs text-greenDark hover:bg-greenSoft">
                + {staffOnly.length - 8} more →
              </Link>
            )}
          </div>
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
