-- ═══════════════════════════════════════════════════════════════
-- MIGRACIÓN: Coyoleo pasa a tener grupos de siembra (igual que Cosecha)
--
-- Antes: lotes_coyoleo era una lista plana por registro_id.
-- Ahora: grupos_coyoleo (uno por año de siembra) -> lotes_coyoleo (grupo_id).
--
-- Correr directo en: app.supabase.com > SQL Editor > New query
-- ═══════════════════════════════════════════════════════════════

create table if not exists public.grupos_coyoleo (
  id           uuid primary key default gen_random_uuid(),
  registro_id  uuid not null references public.registros_planificacion(id) on delete cascade,
  anio_siembra int  not null,
  orden        int  not null default 0,
  created_at   timestamptz not null default now()
);

alter table public.lotes_coyoleo
  add column if not exists grupo_id uuid references public.grupos_coyoleo(id) on delete cascade;

-- Nota: deja registro_id en lotes_coyoleo por compatibilidad transitoria;
-- el código nuevo debe insertar/leer usando grupo_id.

alter table public.grupos_coyoleo enable row level security;

create policy "acceso_grupos_coyoleo" on public.grupos_coyoleo
  for all using (
    exists (select 1 from public.registros_planificacion r where r.id = registro_id)
  );

-- Reemplaza la política de lotes_coyoleo para que funcione vía grupo_id,
-- igual que acceso_lotes_cosecha.
drop policy if exists "acceso_lotes_coyoleo" on public.lotes_coyoleo;

create policy "acceso_lotes_coyoleo" on public.lotes_coyoleo
  for all using (
    exists (
      select 1 from public.grupos_coyoleo g
      join public.registros_planificacion r on r.id = g.registro_id
      where g.id = grupo_id
    )
  );
