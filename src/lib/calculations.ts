import type { TablaDensidad, LoteCosechaForm, GrupoSiembraForm } from "../types";

export const n = (v: string | number | null | undefined): number =>
  parseFloat(String(v ?? "")) || 0;

export const fmt = (v: number | string, d = 2): string => {
  const num = parseFloat(String(v));
  return isNaN(num) ? "—" : num.toFixed(d);
};

/** TM por lote = ha × densidad_palma × peso_fruta / 1000 × rp */
export function calcTM(ha: string, densidad: string, peso: string, rp: string): number {
  return n(ha) * n(densidad) * n(peso) / 1000 * n(rp);
}

/** Busca la fila TDC para un año y densidad dados (redondeo al múltiplo de 100 más cercano) */
export function buscarTDC(tabla: TablaDensidad[], anio: string | number, densidad: number): TablaDensidad | null {
  const centena = Math.round(densidad / 100) * 100;
  const matchKey = n(anio) * 1000 + centena;
  return tabla.find(f => f.match_key === matchKey) ?? null;
}

/**
 * Interpola entre las dos filas de tabla_densidad que acotan la densidad real
 * (tabla_densidad va de 100 en 100). Si la densidad cae exacto en un múltiplo
 * de 100, usa esa fila directamente sin promediar.
 */
export function interpolarTDC(
  tabla: TablaDensidad[],
  anio: string | number,
  densidad: number
): TablaDensidad | null {
  if (!densidad) return null;
  const piso  = Math.floor(densidad / 100) * 100;
  const techo = Math.ceil(densidad / 100) * 100;
  const anioNum = n(anio);

  const filaPiso  = tabla.find(f => f.anio_siembra === anioNum && f.densidad_plan === piso);
  const filaTecho = tabla.find(f => f.anio_siembra === anioNum && f.densidad_plan === techo);

  if (!filaPiso && !filaTecho) return null;
  if (!filaPiso) return filaTecho!;
  if (!filaTecho || piso === techo) return filaPiso;

  const prom = (a: number, b: number) => (a + b) / 2;
  return {
    ...filaPiso,
    densidad_plan: densidad,
    ha_j:     prom(filaPiso.ha_j, filaTecho.ha_j),
    tm_c:     prom(filaPiso.tm_c, filaTecho.tm_c),
    sacos_ha: prom(filaPiso.sacos_ha, filaTecho.sacos_ha),
    sacos_p:  prom(filaPiso.sacos_p, filaTecho.sacos_p),
  };
}

/** Totales de un grupo de siembra */
export function totalesGrupo(lotes: LoteCosechaForm[]) {
  return lotes.reduce((acc, l) => ({
    ha:          acc.ha + n(l.ha),
    rp:          acc.rp + n(l.rp),
    tm:          acc.tm + calcTM(l.ha, l.densidad_palma, l.peso_fruta, l.rp),
    corteros:    acc.corteros + n(l.cort_emp) + n(l.cort_cont),
    evacuadores: acc.evacuadores + n(l.evac_emp) + n(l.evac_cont),
  }), { ha: 0, rp: 0, tm: 0, corteros: 0, evacuadores: 0 });
}

/** Totales globales de todos los grupos */
export function totalesGlobales(grupos: GrupoSiembraForm[]) {
  return grupos.reduce((acc, g) => {
    const t = totalesGrupo(g.lotes);
    return {
      ha:          acc.ha + t.ha,
      rp:          acc.rp + t.rp,
      tm:          acc.tm + t.tm,
      corteros:    acc.corteros + t.corteros,
      evacuadores: acc.evacuadores + t.evacuadores,
    };
  }, { ha: 0, rp: 0, tm: 0, corteros: 0, evacuadores: 0 });
}

/**
 * Densidad calculada del registro completo = Densidad Siembra (manual) ×
 * RP promedio (de todos los lotes de cosecha del registro) × Peso fruta (manual)
 */
export function calcDensidadIndependiente(
  densidadSiembra: string | number,
  pesoFruta: string | number,
  lotesTodasLasSiembras: { rp: string | number }[]
): number {
  const rps = lotesTodasLasSiembras.map(l => n(l.rp));
  const rpProm = rps.length ? rps.reduce((a, b) => a + b, 0) / rps.length : 0;
  return n(densidadSiembra) * rpProm * n(pesoFruta);
}

/** Densidad Fs = Σ TM/Fs (todos los lotes de coyoleo) × 1000 / Σ HA (todos los lotes de coyoleo) */
export function calcDensidadFs(lotes: { ha: string | number; tm_fs: string | number }[]): number {
  const totHA = lotes.reduce((a, l) => a + n(l.ha), 0);
  const totTmFs = lotes.reduce((a, l) => a + n(l.tm_fs), 0);
  return totHA > 0 ? (totTmFs * 1000) / totHA : 0;
}

/** Sacos/Cy real = (Σ TM/Fs de todos los lotes de coyoleo × 1000 / 33) / Σ Coyoleros (emp+cont) */
export function calcSacosCyReal(lotes: { tm_fs: string | number; coy_emp: string | number; coy_cont: string | number }[]): number {
  const totTmFs = lotes.reduce((a, l) => a + n(l.tm_fs), 0);
  const totCoyoleros = lotes.reduce((a, l) => a + n(l.coy_emp) + n(l.coy_cont), 0);
  return totCoyoleros > 0 ? (totTmFs * 1000) / 33 / totCoyoleros : 0;
}

/** Color del semáforo según % cumplimiento */
export type Semaforo = "verde" | "amarillo" | "rojo" | "neutral";
export function semaforo(real: number, plan: number): Semaforo {
  if (!plan) return "neutral";
  const pct = (real / plan) * 100;
  if (pct >= 95) return "verde";
  if (pct >= 85) return "amarillo";
  return "rojo";
}
