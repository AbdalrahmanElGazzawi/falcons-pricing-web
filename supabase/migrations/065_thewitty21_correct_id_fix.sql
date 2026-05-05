-- ═══════════════════════════════════════════════════════════════════════════
-- Migration 065 — TheWitty21 rate_source fix (corrects wrong-id in Mig 064)
-- ───────────────────────────────────────────────────────────────────────────
-- Mig 064 incorrectly targeted creator id=16 (Hamad) for the TheWitty21
-- rate_source set. Hamad already had methodology_v2_with_data so no harm;
-- but TheWitty21 (id=18) was still on_hold.
--
-- Effect: TheWitty21 moves from on_hold → bookable. 100% of active
-- roster (199/199) is now bookable.
-- ═══════════════════════════════════════════════════════════════════════════

update public.creators set
  rate_source = 'methodology_v2_with_data'
  where id = 18 and nickname = 'TheWitty21';

insert into public.audit_log (actor_email, actor_kind, action, entity_type, entity_id, diff, created_at)
values
  ('abdghazzawi1@gmail.com','human','set_rate_source','creator',18,
   jsonb_build_object('migration','065','action','rate_source NULL -> methodology_v2_with_data; corrects wrong-id in Mig 064'),
   now());
