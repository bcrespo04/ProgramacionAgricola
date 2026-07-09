-- ═══════════════════════════════════════════════════════════════
-- PROGRAMACIÓN AGRÍCOLA — Schema Supabase
-- Pegar en: app.supabase.com > SQL Editor > New query
-- ═══════════════════════════════════════════════════════════════

-- Extensión para UUIDs
create extension if not exists "uuid-ossp";

-- ───────────────────────────────────────────────────────────────
-- 1. USUARIOS
-- ───────────────────────────────────────────────────────────────
create table public.usuarios (
  id          uuid primary key default uuid_generate_v4(),
  email       text unique not null,
  nombre      text not null,
  rol         text not null check (rol in ('coordinador','zona_sur','zona_norte','monitor','admin')),
  sector      int check (sector between 1 and 12), -- solo coordinadores
  activo      boolean not null default true,
  created_at  timestamptz not null default now()
);

-- ───────────────────────────────────────────────────────────────
-- 2. TABLA DENSIDAD (copia de la hoja TDC para consulta rápida)
-- ───────────────────────────────────────────────────────────────
create table public.tabla_densidad (
  id            serial primary key,
  anio_siembra  int not null,
  densidad_plan int not null,
  densidad_fs   numeric(8,2),
  ha_j          numeric(8,2) not null,
  tm_c          numeric(8,2) not null,
  sacos_ha      numeric(8,2),
  sacos_p       numeric(8,2),
  match_key     int generated always as (anio_siembra * 1000 + densidad_plan) stored
);

-- ───────────────────────────────────────────────────────────────
-- 3. REGISTROS DE PLANIFICACIÓN
-- ───────────────────────────────────────────────────────────────
create table public.registros_planificacion (
  id                  uuid primary key default uuid_generate_v4(),
  fecha               date not null,
  sector              int not null check (sector between 1 and 12),
  coordinador_id      uuid not null references public.usuarios(id),
  estado              text not null default 'borrador'
                        check (estado in ('borrador','pendiente','aprobado','rechazado')),
  fiscal_cosecha      text,
  fiscal_coyoleo      text,
  densidad_siembra    numeric(10,2),
  peso_fruta          numeric(10,2),
  densidad_calculada  numeric(10,2),
  -- Aprobación
  zona_id             uuid references public.usuarios(id),
  comentario_zona     text,
  fecha_revision      timestamptz,
  -- Sync a Sheets
  synced_to_sheets    boolean not null default false,
  created_at          timestamptz not null default now(),
  updated_at          timestamptz not null default now()
);

-- ───────────────────────────────────────────────────────────────
-- 4. GRUPOS DE SIEMBRA (un registro puede tener varios años)
-- ───────────────────────────────────────────────────────────────
create table public.grupos_siembra (
  id            uuid primary key default uuid_generate_v4(),
  registro_id   uuid not null references public.registros_planificacion(id) on delete cascade,
  anio_siembra  int not null,
  orden         int not null default 0,
  created_at    timestamptz not null default now()
);

-- ───────────────────────────────────────────────────────────────
-- 5. LOTES DE COSECHA
-- ───────────────────────────────────────────────────────────────
create table public.lotes_cosecha (
  id            uuid primary key default uuid_generate_v4(),
  grupo_id      uuid not null references public.grupos_siembra(id) on delete cascade,
  orden         int not null default 0,
  lote          text not null,
  ha            numeric(10,2) not null default 0,
  rp            numeric(8,4) not null default 0,
  densidad_palma numeric(10,2) not null default 0,
  peso_fruta    numeric(8,2) not null default 0,
  tm            numeric(10,4) generated always as (ha * densidad_palma * peso_fruta / 1000.0 * rp) stored,
  cort_emp      int not null default 0,
  cort_cont     int not null default 0,
  evac_emp      int not null default 0,
  evac_cont     int not null default 0,
  created_at    timestamptz not null default now()
);

-- ───────────────────────────────────────────────────────────────
-- 6. GRUPOS DE COYOLEO (un registro puede tener varios años, igual que Cosecha)
-- ───────────────────────────────────────────────────────────────
create table public.grupos_coyoleo (
  id            uuid primary key default uuid_generate_v4(),
  registro_id   uuid not null references public.registros_planificacion(id) on delete cascade,
  anio_siembra  int not null,
  orden         int not null default 0,
  created_at    timestamptz not null default now()
);

-- ───────────────────────────────────────────────────────────────
-- 6b. LOTES DE COYOLEO
-- ───────────────────────────────────────────────────────────────
create table public.lotes_coyoleo (
  id          uuid primary key default uuid_generate_v4(),
  grupo_id    uuid not null references public.grupos_coyoleo(id) on delete cascade,
  orden       int not null default 0,
  lote        text not null,
  ha          numeric(10,2) not null default 0,
  coy_emp     int not null default 0,
  coy_cont    int not null default 0,
  tm_fs       numeric(10,2) not null default 0,
  created_at  timestamptz not null default now()
);

-- ───────────────────────────────────────────────────────────────
-- 7. TRIGGER updated_at
-- ───────────────────────────────────────────────────────────────
create or replace function public.set_updated_at()
returns trigger language plpgsql as $$
begin new.updated_at = now(); return new; end; $$;

create trigger trg_registros_updated_at
  before update on public.registros_planificacion
  for each row execute function public.set_updated_at();

-- ───────────────────────────────────────────────────────────────
-- 8. RLS — Row Level Security
-- ───────────────────────────────────────────────────────────────
alter table public.usuarios               enable row level security;
alter table public.tabla_densidad         enable row level security;
alter table public.registros_planificacion enable row level security;
alter table public.grupos_siembra         enable row level security;
alter table public.lotes_cosecha          enable row level security;
alter table public.grupos_coyoleo         enable row level security;
alter table public.lotes_coyoleo          enable row level security;

-- Helper: obtener el usuario actual desde la tabla usuarios
create or replace function public.get_current_user()
returns public.usuarios language sql security definer stable as $$
  select * from public.usuarios where email = auth.jwt()->>'email' limit 1;
$$;

-- Tabla densidad: todos pueden leer
create policy "todos_leen_densidad" on public.tabla_densidad
  for select using (true);

-- Usuarios: cada quien lee su propio perfil; admin lee todos
create policy "usuario_lee_su_perfil" on public.usuarios
  for select using (
    email = auth.jwt()->>'email'
    or (get_current_user()).rol = 'admin'
  );

-- Registros planificacion
create policy "coordinador_ve_sus_registros" on public.registros_planificacion
  for select using (
    -- Coordinador: solo sus registros
    (get_current_user()).rol = 'coordinador'
      and coordinador_id = (get_current_user()).id
    -- Zona Sur: sectores 1-6
    or (get_current_user()).rol = 'zona_sur'
      and sector between 1 and 6
    -- Zona Norte: sectores 7-12
    or (get_current_user()).rol = 'zona_norte'
      and sector between 7 and 12
    -- Monitor: solo aprobados, todos los sectores
    or (get_current_user()).rol = 'monitor'
      and estado = 'aprobado'
    -- Admin: todos
    or (get_current_user()).rol = 'admin'
  );

create policy "coordinador_crea_registros" on public.registros_planificacion
  for insert with check (
    (get_current_user()).rol in ('coordinador','admin')
    and (
      (get_current_user()).rol = 'admin'
      or sector = (get_current_user()).sector
    )
  );

create policy "coordinador_edita_borradores" on public.registros_planificacion
  for update using (
    -- Coordinador edita sus borradores/rechazados
    ((get_current_user()).rol = 'coordinador'
      and coordinador_id = (get_current_user()).id
      and estado in ('borrador','rechazado'))
    -- Zona aprueba/rechaza pendientes de sus sectores
    or ((get_current_user()).rol = 'zona_sur'
      and sector between 1 and 6
      and estado = 'pendiente')
    or ((get_current_user()).rol = 'zona_norte'
      and sector between 7 and 12
      and estado = 'pendiente')
    -- Admin edita todo
    or (get_current_user()).rol = 'admin'
  )
  with check (
    -- No se vuelve a exigir estado='pendiente' sobre la fila NUEVA: solo se valida
    -- que quien edita tenga permiso sobre el sector/registro (rol + propiedad).
    ((get_current_user()).rol = 'coordinador'
      and coordinador_id = (get_current_user()).id)
    or ((get_current_user()).rol = 'zona_sur'
      and sector between 1 and 6)
    or ((get_current_user()).rol = 'zona_norte'
      and sector between 7 and 12)
    or (get_current_user()).rol = 'admin'
  );

-- Grupos siembra: hereda acceso del registro padre
create policy "acceso_grupos" on public.grupos_siembra
  for all using (
    exists (
      select 1 from public.registros_planificacion r
      where r.id = registro_id
    )
  );

-- Lotes cosecha: hereda acceso del grupo padre
create policy "acceso_lotes_cosecha" on public.lotes_cosecha
  for all using (
    exists (
      select 1 from public.grupos_siembra g
      join public.registros_planificacion r on r.id = g.registro_id
      where g.id = grupo_id
    )
  );

-- Grupos coyoleo: hereda acceso del registro padre
create policy "acceso_grupos_coyoleo" on public.grupos_coyoleo
  for all using (
    exists (
      select 1 from public.registros_planificacion r
      where r.id = registro_id
    )
  );

-- Lotes coyoleo: hereda acceso del grupo padre
create policy "acceso_lotes_coyoleo" on public.lotes_coyoleo
  for all using (
    exists (
      select 1 from public.grupos_coyoleo g
      join public.registros_planificacion r on r.id = g.registro_id
      where g.id = grupo_id
    )
  );

-- ───────────────────────────────────────────────────────────────
-- 9. DATOS INICIALES — Tabla densidad (muestra, completar el resto)
-- ───────────────────────────────────────────────────────────────
insert into public.tabla_densidad (anio_siembra, densidad_plan, densidad_fs, ha_j, tm_c, sacos_ha, sacos_p) values
(2016,100,8.50,10.0,0.9,0.3,2.6),(2016,200,17.00,9.0,1.7,0.5,4.6),
(2016,300,25.50,8.0,2.2,0.8,6.2),(2016,400,34.00,7.0,2.6,1.0,7.2),
(2016,500,42.50,6.2,2.8,1.3,8.0),(2016,600,51.00,5.6,3.1,1.6,8.7),
(2016,700,59.50,5.3,3.4,1.8,9.5),(2016,800,68.00,5.0,3.6,2.1,10.2),
(2016,900,76.50,4.5,3.7,2.3,10.4),(2016,1000,85.00,4.3,3.9,2.6,11.1),
(2021,100,8.50,10.0,0.9,0.3,2.6),(2021,200,17.00,9.0,1.7,0.5,4.6),
(2021,300,25.50,8.0,2.2,0.8,6.2),(2021,400,34.00,7.0,2.6,1.0,7.2),
(2022,100,8.50,6.0,0.6,0.3,1.6),(2022,200,17.00,5.4,1.0,0.5,2.8),
(2022,300,25.50,4.8,1.3,0.8,3.7),(2022,400,34.00,4.2,1.5,1.0,4.3),
(2023,100,8.50,6.0,0.6,0.3,1.6),(2023,200,17.00,5.4,1.0,0.5,2.8),
(2023,300,25.50,4.8,1.3,0.8,3.7),(2023,400,34.00,4.2,1.5,1.0,4.3);
