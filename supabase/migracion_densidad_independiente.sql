-- ═══════════════════════════════════════════════════════════════
-- MIGRACIÓN: Densidad Siembra y Peso fruta pasan a ser campos
-- manuales a nivel de todo el registro (ya no se promedian de los
-- lotes). densidad_calculada = densidad_siembra × RP total × peso_fruta.
--
-- Correr directo en: app.supabase.com > SQL Editor > New query
-- ═══════════════════════════════════════════════════════════════

alter table public.registros_planificacion
  add column if not exists densidad_siembra numeric(10,2),
  add column if not exists peso_fruta        numeric(10,2);
