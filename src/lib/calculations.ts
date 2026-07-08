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
 * RP total (suma de todos los grupos) × Peso fruta (manual)
 */
export function calcDensidadIndependiente(
  densidadSiembra: string | number,
  pesoFruta: string | number,
  rpTotal: number
): number {
  return n(densidadSiembra) * rpTotal * n(pesoFruta);
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
