import { supabase } from "./supabase";
import type {
  TablaDensidad, RegistroPlanificacion,
  RegistroPlanificacionForm, EstadoRegistro,
  Usuario, EjecucionDiaria, EjecucionDiariaForm, PlanAprobado
} from "../types";
import { calcDensidadIndependiente, n } from "./calculations";

// ── Tabla densidad ─────────────────────────────────────────────
export async function getTablaDensidad(): Promise<TablaDensidad[]> {
  const { data, error } = await supabase
    .from("tabla_densidad")
    .select("*")
    .order("sector")
    .order("densidad_plan");
  if (error) throw error;
  return data as TablaDensidad[];
}

// ── Registros planificacion ────────────────────────────────────
export async function getRegistros(filtros?: {
  estado?: EstadoRegistro;
  sector?: number;
}): Promise<RegistroPlanificacion[]> {
  let q = supabase
    .from("registros_planificacion")
    .select(`
      *,
      coordinador:usuarios!coordinador_id(nombre,email,rol,sector),
      grupos_siembra(anio_siembra, lotes_cosecha(id)),
      grupos_coyoleo(anio_siembra, lotes_coyoleo(id))
    `)
    .order("fecha_ejecucion", { ascending: false, nullsFirst: false });

  if (filtros?.estado) q = q.eq("estado", filtros.estado);
  if (filtros?.sector) q = q.eq("sector", filtros.sector);

  const { data, error } = await q;
  if (error) throw error;
  return data as RegistroPlanificacion[];
}

export async function getRegistroCompleto(id: string): Promise<RegistroPlanificacion | null> {
  const { data, error } = await supabase
    .from("registros_planificacion")
    .select(`
      *,
      coordinador:usuarios!coordinador_id(nombre,email,rol,sector),
      grupos_siembra(*, lotes_cosecha(*)),
      grupos_coyoleo(*, lotes_coyoleo(*))
    `)
    .eq("id", id)
    .single();
  if (error) return null;
  return data as RegistroPlanificacion;
}

// Inserta los grupos de siembra/coyoleo y sus lotes a partir del form.
// Compartido entre crearRegistro y actualizarRegistro.
async function insertarGruposYLotes(registroId: string, form: RegistroPlanificacionForm): Promise<void> {
  // Grupos de siembra + lotes cosecha
  for (let gi = 0; gi < form.grupos.length; gi++) {
    const g = form.grupos[gi];
    const { data: grupo, error: gErr } = await supabase
      .from("grupos_siembra")
      .insert({ registro_id: registroId, anio_siembra: parseInt(g.anio_siembra), orden: gi })
      .select("id")
      .single();
    if (gErr) throw gErr;

    const lotesInsert = g.lotes.map((l, li) => ({
      grupo_id:       grupo.id,
      orden:          li,
      lote:           l.lote,
      ha:             n(l.ha),
      rp:             n(l.rp),
      densidad_palma: n(l.densidad_palma),
      peso_fruta:     n(l.peso_fruta),
      cort_emp:       n(l.cort_emp),
      cort_cont:      n(l.cort_cont),
      evac_emp:       n(l.evac_emp),
      evac_cont:      n(l.evac_cont),
    }));
    const { error: lErr } = await supabase.from("lotes_cosecha").insert(lotesInsert);
    if (lErr) throw lErr;
  }

  // Grupos de siembra + lotes coyoleo
  for (let gi = 0; gi < form.grupos_coyoleo.length; gi++) {
    const g = form.grupos_coyoleo[gi];
    const { data: grupo, error: gErr } = await supabase
      .from("grupos_coyoleo")
      .insert({ registro_id: registroId, anio_siembra: parseInt(g.anio_siembra), orden: gi })
      .select("id")
      .single();
    if (gErr) throw gErr;

    const coyInsert = g.lotes.map((l, li) => ({
      grupo_id:  grupo.id,
      orden:     li,
      lote:      l.lote,
      ha:        n(l.ha),
      coy_emp:   n(l.coy_emp),
      coy_cont:  n(l.coy_cont),
      tm_fs:     n(l.tm_fs),
    }));
    const { error: cErr } = await supabase.from("lotes_coyoleo").insert(coyInsert);
    if (cErr) throw cErr;
  }
}

export async function crearRegistro(
  form: RegistroPlanificacionForm,
  coordinadorId: string
): Promise<string> {
  const densidadCalc = calcDensidadIndependiente(form.densidad_siembra, form.peso_fruta, form.grupos.flatMap(g => g.lotes));

  // 1. Registro principal
  const { data: reg, error: regErr } = await supabase
    .from("registros_planificacion")
    .insert({
      fecha:              new Date().toISOString().slice(0, 10),
      fecha_ejecucion:    form.fecha_ejecucion,
      sector:             parseInt(form.sector),
      coordinador_id:     coordinadorId,
      estado:             "pendiente",
      fiscal_cosecha:     form.fiscal_cosecha,
      fiscal_coyoleo:     form.fiscal_coyoleo,
      densidad_siembra:   n(form.densidad_siembra),
      peso_fruta:         n(form.peso_fruta),
      densidad_calculada: densidadCalc,
    })
    .select("id")
    .single();
  if (regErr) throw regErr;
  const registroId = reg.id as string;

  // 2. Grupos de siembra/coyoleo + lotes
  await insertarGruposYLotes(registroId, form);

  return registroId;
}

// Reenvío de un registro rechazado/borrador: reemplaza sus grupos y lotes,
// actualiza los datos generales y lo vuelve a poner en 'pendiente' para revisión.
// Deja comentario_zona intacto (historial del rechazo anterior).
export async function actualizarRegistro(id: string, form: RegistroPlanificacionForm): Promise<void> {
  const densidadCalc = calcDensidadIndependiente(form.densidad_siembra, form.peso_fruta, form.grupos.flatMap(g => g.lotes));

  // 1. Borra los grupos existentes (cascada borra sus lotes vía FK "on delete cascade")
  const { error: delGruposErr } = await supabase.from("grupos_siembra").delete().eq("registro_id", id);
  if (delGruposErr) throw delGruposErr;
  const { error: delCoyoleoErr } = await supabase.from("grupos_coyoleo").delete().eq("registro_id", id);
  if (delCoyoleoErr) throw delCoyoleoErr;

  // 2. Re-inserta grupos y lotes
  await insertarGruposYLotes(id, form);

  // 3. Actualiza la fila principal y la regresa a la cola de revisión
  const { error: updErr } = await supabase
    .from("registros_planificacion")
    .update({
      fecha_ejecucion:    form.fecha_ejecucion,
      sector:             parseInt(form.sector),
      fiscal_cosecha:     form.fiscal_cosecha,
      fiscal_coyoleo:     form.fiscal_coyoleo,
      densidad_siembra:   n(form.densidad_siembra),
      peso_fruta:         n(form.peso_fruta),
      densidad_calculada: densidadCalc,
      estado:             "pendiente",
      zona_id:            null,
      fecha_revision:     null,
    })
    .eq("id", id);
  if (updErr) throw updErr;
}

export async function aprobarRegistro(id: string, zonaId: string): Promise<void> {
  const { error } = await supabase
    .from("registros_planificacion")
    .update({ estado: "aprobado", zona_id: zonaId, comentario_zona: null, fecha_revision: new Date().toISOString() })
    .eq("id", id);
  if (error) throw error;
}

export async function rechazarRegistro(id: string, zonaId: string, comentario: string): Promise<void> {
  const { error } = await supabase
    .from("registros_planificacion")
    .update({ estado: "rechazado", zona_id: zonaId, comentario_zona: comentario, fecha_revision: new Date().toISOString() })
    .eq("id", id);
  if (error) throw error;
}

// Revierte un registro aprobado de vuelta a la bandeja de revisión.
export async function revertirRegistro(id: string, comentario?: string): Promise<void> {
  const { error } = await supabase
    .from("registros_planificacion")
    .update({
      estado: "pendiente",
      zona_id: null,
      fecha_revision: null,
      comentario_zona: comentario?.trim() || null,
    })
    .eq("id", id);
  if (error) throw error;
}

// Borra el registro completo (solo admin, según RLS). Las tablas hijas
// (grupos_siembra, grupos_coyoleo y sus lotes) se limpian por cascada.
export async function eliminarRegistro(id: string): Promise<void> {
  const { error } = await supabase.from("registros_planificacion").delete().eq("id", id);
  if (error) throw error;
}

// ── Ejecución diaria ────────────────────────────────────────────

/** Busca el plan APROBADO de un sector para una fecha_ejecucion específica, con sus lotes de cosecha */
export async function buscarPlanParaFecha(sector: number, fechaEjecucion: string): Promise<PlanAprobado | null> {
  const { data, error } = await supabase
    .from("registros_planificacion")
    .select(`id, grupos_siembra(id, anio_siembra, lotes_cosecha(id, lote, ha))`)
    .eq("sector", sector)
    .eq("fecha_ejecucion", fechaEjecucion)
    .eq("estado", "aprobado")
    .maybeSingle();
  if (error) throw error;
  return data as PlanAprobado | null;
}

/** Indica si ya existe una ejecución de un coordinador para una fecha (para bloquear duplicados al crear) */
export async function getEjecucionPorFecha(coordinadorId: string, fecha: string): Promise<EjecucionDiaria | null> {
  const { data, error } = await supabase
    .from("ejecucion_diaria")
    .select(`*, ejecucion_lotes(id, lote_cosecha_id)`)
    .eq("coordinador_id", coordinadorId)
    .eq("fecha", fecha)
    .maybeSingle();
  if (error) throw error;
  return data as EjecucionDiaria | null;
}

/** Trae una ejecución específica por su id, con sus lotes (para modo edición explícito por ruta) */
export async function getEjecucionPorId(id: string): Promise<EjecucionDiaria | null> {
  const { data, error } = await supabase
    .from("ejecucion_diaria")
    .select(`*, ejecucion_lotes(id, lote_cosecha_id)`)
    .eq("id", id)
    .maybeSingle();
  if (error) throw error;
  return data as EjecucionDiaria | null;
}

/** Crea o actualiza (upsert manual) la ejecución de un día */
export async function guardarEjecucion(
  coordinadorId: string,
  sector: number,
  form: EjecucionDiariaForm,
  ejecucionExistenteId?: string
): Promise<string> {
  const payload = {
    coordinador_id: coordinadorId,
    sector,
    fecha: form.fecha,
    corteros: n(form.corteros) || null,
    evacuadores: n(form.evacuadores) || null,
    coyoleros: n(form.coyoleros) || null,
    cargadores: n(form.cargadores) || null,
    fruta_dia_anterior: n(form.fruta_dia_anterior) || null,
    tm_enviadas: n(form.tm_enviadas) || null,
    bacadillas: n(form.bacadillas) || null,
    sacos_dia: n(form.sacos_dia) || null,
    sacos_enviados: n(form.sacos_enviados) || null,
    ha_coyol: n(form.ha_coyol) || null,
    ha_cosechadas: n(form.ha_cosechadas) || null,
    lotes_extra: form.lotes_extra.trim() || null,
  };

  let ejecucionId = ejecucionExistenteId;
  if (ejecucionId) {
    const { error } = await supabase.from("ejecucion_diaria").update(payload).eq("id", ejecucionId);
    if (error) throw error;
    const { error: delErr } = await supabase.from("ejecucion_lotes").delete().eq("ejecucion_id", ejecucionId);
    if (delErr) throw delErr;
  } else {
    const { data, error } = await supabase.from("ejecucion_diaria").insert(payload).select("id").single();
    if (error) throw error;
    ejecucionId = data.id as string;
  }

  if (form.lotes_seleccionados.length) {
    const rows = form.lotes_seleccionados.map(lote_cosecha_id => ({ ejecucion_id: ejecucionId, lote_cosecha_id }));
    const { error } = await supabase.from("ejecucion_lotes").insert(rows);
    if (error) throw error;
  }
  return ejecucionId!;
}

/** Lista de ejecuciones según el rol: propia (coordinador), consolidada por rango de sectores (zona), o todo (admin). monitor no tiene acceso a Ejecución. */
export async function getEjecuciones(usuario: Usuario, limite?: number): Promise<EjecucionDiaria[]> {
  if (usuario.rol === "monitor") return [];

  let q = supabase
    .from("ejecucion_diaria")
    .select(`*, coordinador:usuarios!coordinador_id(nombre), ejecucion_lotes(lotes_cosecha(lote))`);

  if (usuario.rol === "coordinador") {
    q = q.eq("coordinador_id", usuario.id).order("fecha", { ascending: false });
  } else {
    if (usuario.rol === "zona_sur") q = q.gte("sector", 1).lte("sector", 6);
    else if (usuario.rol === "zona_norte") q = q.gte("sector", 7).lte("sector", 12);
    // admin: sin filtro, ve todo
    q = q.order("sector", { ascending: true }).order("fecha", { ascending: false });
  }

  if (limite) q = q.limit(limite);

  const { data, error } = await q;
  if (error) throw error;
  return data as EjecucionDiaria[];
}
