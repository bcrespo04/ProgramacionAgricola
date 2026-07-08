-- ═══════════════════════════════════════════════════════════════
-- FIX: botón Aprobar/Rechazar se queda cargando indefinidamente
--
-- Causa: la política "coordinador_edita_borradores" en
-- registros_planificacion no tenía WITH CHECK explícito, así que
-- Postgres reutilizaba el mismo USING (que exige estado='pendiente')
-- para validar la FILA NUEVA del UPDATE. Como aprobar/rechazar
-- cambia el estado a 'aprobado'/'rechazado', la propia política
-- bloqueaba su propio cambio y Supabase devolvía un error (RLS)
-- que el frontend no mostraba.
--
-- Correr directo en: app.supabase.com > SQL Editor > New query
-- ═══════════════════════════════════════════════════════════════

drop policy if exists "coordinador_edita_borradores" on public.registros_planificacion;

create policy "coordinador_edita_borradores" on public.registros_planificacion
  for update using (
    ((get_current_user()).rol = 'coordinador'
      and coordinador_id = (get_current_user()).id
      and estado in ('borrador','rechazado'))
    or ((get_current_user()).rol = 'zona_sur'
      and sector between 1 and 6
      and estado = 'pendiente')
    or ((get_current_user()).rol = 'zona_norte'
      and sector between 7 and 12
      and estado = 'pendiente')
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
