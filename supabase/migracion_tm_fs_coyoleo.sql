-- ═══════════════════════════════════════════════════════════════
-- MIGRACIÓN: campo TM/Fs por lote de Coyoleo (digitación manual,
-- igual que HA). Se usa para calcular "Densidad Fs" en el Resumen:
--   Densidad Fs = Σ TM/Fs (todos los lotes de coyoleo del registro) × 1000
--                 / Σ HA (todos los lotes de coyoleo del registro)
--
-- Correr directo en: app.supabase.com > SQL Editor > New query
-- ═══════════════════════════════════════════════════════════════

alter table public.lotes_coyoleo
  add column if not exists tm_fs numeric(10,2) not null default 0;
