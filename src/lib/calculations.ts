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

/** Busca, dentro de un sector, la fila de tabla_densidad con densidad_plan
 * más cercana a la densidad real (no asume que existan todos los múltiplos
 * de 100 — hay huecos conocidos). Sin interpolación, una sola fila. */
export function buscarFilaCercana(tabla: TablaDensidad[], sector: number, densidad: number): TablaDensidad | null {
  const filas = tabla.filter(f => f.sector === sector);
  if (!filas.length || !densidad) return null;
  return filas.reduce((mejor, f) =>
    Math.abs(f.densidad_plan - densidad) < Math.abs(mejor.densidad_plan - densidad) ? f : mejor
  );
}

/** Interpola entre las dos filas de un sector que acotan la densidad
 * equivalente (promedia ha_j, tm_c, sacos_ha, sacos_p si cae entre dos). */
export function interpolarPorSector(tabla: TablaDensidad[], sector: number, densidad: number): TablaDensidad | null {
  const filas = tabla.filter(f => f.sector === sector).sort((a, b) => a.densidad_plan - b.densidad_plan);
  if (!filas.length || !densidad) return null;

  let piso: TablaDensidad | undefined;
  let techo: TablaDensidad | undefined;
  for (const f of filas) {
    if (f.densidad_plan <= densidad) piso = f;
    if (f.densidad_plan >= densidad && !techo) techo = f;
  }
  if (!piso) return techo!;
  if (!techo || piso.densidad_plan === techo.densidad_plan) return piso;

  const prom = (a: number, b: number) => (a + b) / 2;
  return {
    ...piso,
    densidad_plan: densidad,
    ha_j: prom(piso.ha_j, techo.ha_j),
    tm_c: prom(piso.tm_c, techo.tm_c),
    sacos_ha: prom(piso.sacos_ha, techo.sacos_ha),
    sacos_p: prom(piso.sacos_p, techo.sacos_p),
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
