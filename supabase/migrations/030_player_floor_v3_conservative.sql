-- ═══════════════════════════════════════════════════════════════════════════
-- Migration 030 — Conservative Floor v3 (LIVE)
-- ───────────────────────────────────────────────────────────────────────────
-- Applied via Supabase MCP on May 2 2026 (eectdiminjrthbqatwxv).
-- Replaces Migration 029.
--
-- Decision (Koge): the v2 CPM-anchored methods inflated floors (Hikaru +196%,
-- NiKo +39%, ImperialHal +36%). Those numbers are anchor/stretch territory,
-- not floor. The base SHOULD be conservative; multipliers handle the upside.
--
-- Floor v3 = MAX of three methods only:
--   A. Tier × Game        — established baseline (SOT v1.0 anchors × game_mult)
--   G. Market-band median — KSA/MENA regional premium where it exists
--   H. Authority floor    — peak Liquipedia tournament tier × decay × game,
--                           CAPPED at 1.20 × tier_x_game (modest lift, no runaway)
--
-- No CPM-from-socials. No 0.85 haircut. Tier × game IS the conservative base.
-- ═══════════════════════════════════════════════════════════════════════════

drop view if exists public.player_floor_v3;

create or replace view public.player_floor_v3 as
with src as (
  select p.id, p.nickname, p.role, p.game, p.tier_code, p.audience_market,
         p.base_rate_anchor as current_anchor, p.rate_source,
         p.peak_tournament_tier,
         coalesce(p.prize_money_24mo_usd, 0)::numeric as prize_money_24mo_usd,
         coalesce(p.achievement_decay_factor, 1.0)::numeric as decay_factor,
         p.data_completeness,
         coalesce(p.followers_ig, 0)     as followers_ig,
         coalesce(p.followers_tiktok, 0) as followers_tiktok,
         coalesce(p.followers_yt, 0)     as followers_yt,
         coalesce(p.followers_twitch, 0) as followers_twitch,
         coalesce(p.followers_x, 0)      as followers_x,
         coalesce(gbm.multiplier, 1.0)   as game_mult
    from public.players p
    left join public.game_base_multipliers gbm on gbm.game = p.game
   where p.is_active is not false
     and lower(coalesce(p.role, '')) not in ('brand','brand account')
),
methods as (
  select s.*,
    round(public.tier_anchor_ig_reel(s.tier_code) * s.game_mult)::numeric as method_a_tier_game,
    coalesce((select median_sar from public.market_band_lookup(s.tier_code, s.audience_market, 'rate_ig_reel')), 0)::numeric as method_g_market_med,
    case s.peak_tournament_tier
      when 'S' then round(18000 * s.game_mult * s.decay_factor)
      when 'A' then round(11000 * s.game_mult * s.decay_factor)
      when 'B' then round( 6500 * s.game_mult * s.decay_factor)
      when 'C' then round( 3500 * s.game_mult * s.decay_factor)
      else 0
    end::numeric as method_h_raw
  from src s
),
capped as (
  select m.*,
    least(m.method_h_raw, m.method_a_tier_game * 1.20) as method_h_capped
  from methods m
)
select c.id, c.nickname, c.role, c.game, c.tier_code, c.audience_market,
       c.data_completeness, c.peak_tournament_tier, c.prize_money_24mo_usd::int as prize_usd, c.decay_factor,
       c.followers_ig, c.followers_tiktok, c.followers_yt, c.followers_twitch, c.followers_x,
       c.method_a_tier_game::int   as m_a_tier_game,
       c.method_g_market_med::int  as m_g_market_med,
       c.method_h_raw::int         as m_h_raw,
       c.method_h_capped::int      as m_h_capped,
       greatest(c.method_a_tier_game, c.method_g_market_med, c.method_h_capped)::int as floor_sar,
       case greatest(c.method_a_tier_game, c.method_g_market_med, c.method_h_capped)
         when c.method_g_market_med then 'market_band'
         when c.method_h_capped     then 'authority_capped'
         else                            'tier_x_game'
       end as winning_method,
       c.current_anchor::int as current_base,
       (greatest(c.method_a_tier_game, c.method_g_market_med, c.method_h_capped) - c.current_anchor)::int as delta_sar,
       case
         when c.current_anchor > 0 then
           round((((greatest(c.method_a_tier_game, c.method_g_market_med, c.method_h_capped) - c.current_anchor) / c.current_anchor)::numeric) * 100, 1)
         else null
       end as delta_pct,
       case
         when c.rate_source in ('negotiated_card','manual_override') then 'locked'
         when abs(greatest(c.method_a_tier_game, c.method_g_market_med, c.method_h_capped) - c.current_anchor) < 100 then 'verified_keep'
         when greatest(c.method_a_tier_game, c.method_g_market_med, c.method_h_capped) > c.current_anchor then 'apply_lift'
         else 'apply_trim'
       end as action,
       case
         when greatest(c.method_a_tier_game, c.method_g_market_med, c.method_h_capped) = c.method_h_capped
              and c.peak_tournament_tier in ('S','A')
           then 'Authority (capped 1.20×): peak ' || c.peak_tournament_tier || ' × decay ' || round(c.decay_factor, 2)::text || ' × game ' || c.game_mult::text || ', cap = ' || c.method_h_capped::int
         when greatest(c.method_a_tier_game, c.method_g_market_med, c.method_h_capped) = c.method_g_market_med
              and c.method_g_market_med > c.method_a_tier_game
           then 'Market band: ' || c.tier_code || ' ' || coalesce(c.audience_market, 'GLOBAL') || ' median = ' || c.method_g_market_med::int
         else 'tier × game baseline (' || c.method_a_tier_game::int || ')'
       end as reasoning
  from capped c;
