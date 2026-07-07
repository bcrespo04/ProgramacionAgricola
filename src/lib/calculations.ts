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

/** Busca la fila TDC para un año y densidad dados */
export function buscarTDC(tabla: TablaDensidad[], anio: string | number, densidad: number): TablaDensidad | null {
  const centena = Math.round(densidad / 100) * 100;
  const matchKey = n(anio) * 1000 + centena;
  return tabla.find(f => f.match_key === matchKey) ?? null;
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

/** Densidad calculada = densidad_promedio × Σ RP × peso_promedio */
export function calcDensidadGlobal(grupos: GrupoSiembraForm[]): number {
  const lotes = grupos.flatMap(g => g.lotes);
  if (!lotes.length) return 0;
  const densProm = lotes.reduce((a, l) => a + n(l.densidad_palma), 0) / lotes.length;
  const sumRP    = lotes.reduce((a, l) => a + n(l.rp), 0);
  const pesoProm = lotes.reduce((a, l) => a + n(l.peso_fruta), 0) / lotes.length;
  return densProm * sumRP * pesoProm;
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
