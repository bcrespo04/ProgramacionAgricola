import type { Semaforo } from "../types";
import { fmt, semaforo } from "../lib/calculations";

export interface FilaComparativa {
  label: string;
  /** null = sin dato real disponible (fila informativa, solo plan) */
  real: number | null;
  plan: number | null;
  decimales?: number;
}

const SEM_CLR: Record<Semaforo, { text: string; bg: string }> = {
  verde:    { text: "text-emerald-700", bg: "bg-emerald-50" },
  amarillo: { text: "text-amber-700",   bg: "bg-amber-50"   },
  rojo:     { text: "text-red-700",     bg: "bg-red-50"     },
  neutral:  { text: "text-stone-500",   bg: "bg-stone-50"   },
};

/** Comparativo Real (coordinador) vs Plan (TDC), dos columnas, una fila por métrica. */
export function ComparativoTDC({ titulo, filas }: { titulo?: string; filas: FilaComparativa[] }) {
  return (
    <div className="space-y-2">
      {titulo && (
        <span className="text-[9px] font-bold uppercase tracking-widest text-stone-400 block">{titulo}</span>
      )}
      <div className="rounded-xl border border-stone-200 overflow-hidden divide-y divide-stone-100">
        <div className="grid grid-cols-2 bg-stone-50 px-3 py-1.5 text-[9px] font-bold uppercase tracking-wider text-stone-400">
          <span>Real (coordinador)</span><span className="text-right">Plan (TDC)</span>
        </div>
        {filas.map((f, i) => {
          const sem = f.real != null && f.plan ? semaforo(f.real, f.plan) : "neutral";
          const clr = SEM_CLR[sem];
          const pct = f.real != null && f.plan ? (f.real / f.plan) * 100 : null;
          return (
            <div key={i} className={`grid grid-cols-2 px-3 py-2.5 ${clr.bg}`}>
              <div>
                <span className="text-[9px] font-bold uppercase tracking-widest text-stone-400 block mb-0.5">{f.label}</span>
                <span className={`text-[15px] font-black tabular-nums ${f.real != null ? clr.text : "text-stone-300"}`}>
                  {f.real != null ? fmt(f.real, f.decimales) : "—"}
                </span>
                {pct !== null && (
                  <span className={`ml-1.5 text-[10px] font-black ${clr.text}`}>
                    {pct >= 100 ? "+" : ""}{pct.toFixed(0)}%
                  </span>
                )}
              </div>
              <div className="text-right">
                <span className="text-[9px] font-bold uppercase tracking-widest text-stone-300 block mb-0.5">
                  {f.real == null ? "informativo" : " "}
                </span>
                <span className="text-[15px] font-bold tabular-nums text-stone-600">
                  {f.plan != null ? fmt(f.plan, f.decimales) : "—"}
                </span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
