export type Rol = "coordinador" | "zona_sur" | "zona_norte" | "monitor" | "admin";
export type EstadoRegistro = "borrador" | "pendiente" | "aprobado" | "rechazado";
export type Semaforo = "verde" | "amarillo" | "rojo" | "neutral";

export const SECTORES_ZONA_SUR   = [1,2,3,4,5,6] as const;
export const SECTORES_ZONA_NORTE = [7,8,9,10,11,12] as const;
export const EDADES_SIEMBRA = ["2016","2017","2018","2019","2021","2022","2023"] as const;

export interface Usuario {
  id: string;
  email: string;
  nombre: string;
  rol: Rol;
  sector: number | null;
  activo: boolean;
}

export interface TablaDensidad {
  id: number;
  sector: number;
  densidad_plan: number;
  densidad_fs: number;
  ha_j: number;
  tm_c: number;
  sacos_ha: number;
  sacos_p: number;
  match_key: number;
}

export interface LoteCosechaForm {
  id: string;
  lote: string;
  ha: string;
  rp: string;
  densidad_palma: string;
  peso_fruta: string;
  cort_emp: string;
  cort_cont: string;
  evac_emp: string;
  evac_cont: string;
}

export interface GrupoSiembraForm {
  id: string;
  anio_siembra: string;
  lotes: LoteCosechaForm[];
}

export interface LoteCoyoleoForm {
  id: string;
  lote: string;
  ha: string;
  coy_emp: string;
  coy_cont: string;
  tm_fs: string;
}

export interface GrupoCoyoleoForm {
  id: string;
  anio_siembra: string;
  lotes: LoteCoyoleoForm[];
}

export interface RegistroPlanificacionForm {
  fecha_ejecucion: string;
  sector: string;
  fiscal_cosecha: string;
  fiscal_coyoleo: string;
  densidad_siembra: string;
  peso_fruta: string;
  grupos: GrupoSiembraForm[];
  grupos_coyoleo: GrupoCoyoleoForm[];
}

// Registro completo desde Supabase
export interface RegistroPlanificacion {
  id: string;
  fecha: string;
  fecha_ejecucion: string | null;
  sector: number;
  coordinador_id: string;
  estado: EstadoRegistro;
  fiscal_cosecha: string | null;
  fiscal_coyoleo: string | null;
  densidad_siembra: number | null;
  peso_fruta: number | null;
  densidad_calculada: number | null;
  zona_id: string | null;
  comentario_zona: string | null;
  fecha_revision: string | null;
  synced_to_sheets: boolean;
  created_at: string;
  updated_at: string;
  // joins opcionales
  coordinador?: Usuario;
  grupos_siembra?: GrupoSiembra[];
  grupos_coyoleo?: GrupoCoyoleo[];
}

export interface GrupoSiembra {
  id: string;
  registro_id: string;
  anio_siembra: number;
  orden: number;
  lotes_cosecha?: LoteCosecha[];
}

export interface LoteCosecha {
  id: string;
  grupo_id: string;
  orden: number;
  lote: string;
  ha: number;
  rp: number;
  densidad_palma: number;
  peso_fruta: number;
  tm: number;
  cort_emp: number;
  cort_cont: number;
  evac_emp: number;
  evac_cont: number;
}

export interface GrupoCoyoleo {
  id: string;
  registro_id: string;
  anio_siembra: number;
  orden: number;
  lotes_coyoleo?: LoteCoyoleo[];
}

export interface LoteCoyoleo {
  id: string;
  grupo_id: string;
  orden: number;
  lote: string;
  ha: number;
  coy_emp: number;
  coy_cont: number;
  tm_fs: number;
}

// ── Ejecución diaria ────────────────────────────────────────────
export interface EjecucionLote {
  id: string;
  lote_cosecha_id: string;
  lotes_cosecha?: { lote: string };
}

export interface EjecucionDiaria {
  id: string;
  coordinador_id: string;
  sector: number;
  fecha: string;
  corteros: number | null;
  evacuadores: number | null;
  coyoleros: number | null;
  cargadores: number | null;
  fruta_dia_anterior: number | null;
  tm_enviadas: number | null;
  bacadillas: number | null;
  sacos_dia: number | null;
  sacos_enviados: number | null;
  ha_coyol: number | null;
  ha_cosechadas: number | null;
  lotes_extra: string | null;
  created_at: string;
  coordinador?: { nombre: string };
  ejecucion_lotes?: EjecucionLote[];
}

export interface EjecucionDiariaForm {
  fecha: string;
  corteros: string;
  evacuadores: string;
  coyoleros: string;
  cargadores: string;
  fruta_dia_anterior: string;
  tm_enviadas: string;
  bacadillas: string;
  sacos_dia: string;
  sacos_enviados: string;
  ha_coyol: string;
  ha_cosechadas: string;
  lotes_extra: string;
  lotes_seleccionados: string[];
}

// ── Plan aprobado para una fecha de ejecución (buscarPlanParaFecha) ────
export interface PlanLoteCosecha {
  id: string;
  lote: string;
  ha: number;
}

export interface PlanGrupoSiembra {
  id: string;
  anio_siembra: number;
  lotes_cosecha: PlanLoteCosecha[];
}

export interface PlanAprobado {
  id: string;
  grupos_siembra: PlanGrupoSiembra[];
}
