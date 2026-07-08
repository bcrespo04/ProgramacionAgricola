import { supabase } from "./supabase";
import type {
  TablaDensidad, RegistroPlanificacion,
  RegistroPlanificacionForm, EstadoRegistro
} from "../types";
import { calcTM, calcDensidadGlobal, n } from "./calculations";

// ── Tabla densidad ─────────────────────────────────────────────
export async function getTablaDensidad(): Promise<TablaDensidad[]> {
  const { data, error } = await supabase
    .from("tabla_densidad")
    .select("*")
    .order("anio_siembra")
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
    .order("fecha", { ascending: false });

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

export async function crearRegistro(
  form: RegistroPlanificacionForm,
  coordinadorId: string
): Promise<string> {
  const densidadCalc = calcDensidadGlobal(form.grupos);

  // 1. Registro principal
  const { data: reg, error: regErr } = await supabase
    .from("registros_planificacion")
    .insert({
      fecha:              form.fecha,
      sector:             parseInt(form.sector),
      coordinador_id:     coordinadorId,
      estado:             "pendiente",
      fiscal_cosecha:     form.fiscal_cosecha,
      fiscal_coyoleo:     form.fiscal_coyoleo,
      densidad_calculada: densidadCalc,
    })
    .select("id")
    .single();
  if (regErr) throw regErr;
  const registroId = reg.id as string;

  // 2. Grupos de siembra + lotes cosecha
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

  // 3. Grupos de siembra + lotes coyoleo
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
    }));
    const { error: cErr } = await supabase.from("lotes_coyoleo").insert(coyInsert);
    if (cErr) throw cErr;
  }

  return registroId;
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
