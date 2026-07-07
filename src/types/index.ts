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
  anio_siembra: number;
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
}

export interface RegistroPlanificacionForm {
  fecha: string;
  sector: string;
  fiscal_cosecha: string;
  fiscal_coyoleo: string;
  grupos: GrupoSiembraForm[];
  lotes_coyoleo: LoteCoyoleoForm[];
}

// Registro completo desde Supabase
export interface RegistroPlanificacion {
  id: string;
  fecha: string;
  sector: number;
  coordinador_id: string;
  estado: EstadoRegistro;
  fiscal_cosecha: string | null;
  fiscal_coyoleo: string | null;
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
  lotes_coyoleo?: LoteCoyoleo[];
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

export interface LoteCoyoleo {
  id: string;
  registro_id: string;
  orden: number;
  lote: string;
  ha: number;
  coy_emp: number;
  coy_cont: number;
}
