import type { Semaforo } from "../types";
import { fmt, semaforo } from "../lib/calculations";

export interface FilaComparativa {
  label: string;
  /** null = sin dato real disponible (fila informativa, solo plan) */
  real: number | null;
  plan: number | null;
  decimales?: number;
}

const SEM_CLR: Record<Semaforo, { text: string; border: string }> = {
  verde:    { text: "text-emerald-700", border: "border-emerald-200" },
  amarillo: { text: "text-amber-700",   border: "border-amber-200"   },
  rojo:     { text: "text-red-700",     border: "border-red-200"     },
  neutral:  { text: "text-stone-500",   border: "border-stone-200"   },
};

/** Comparativo Real (coordinador) vs Plan (TDC): recuadros separados por métrica. */
export function ComparativoTDC({ titulo, filas }: { titulo?: string; filas: FilaComparativa[] }) {
  return (
    <div className="space-y-3">
      {titulo && (
        <span className="font-bold text-[14px] block" style={{ fontFamily: "Arial" }}>{titulo}</span>
      )}
      <div className="space-y-2.5">
        {filas.map((f, i) => {
          const sem = f.real != null && f.plan ? semaforo(f.real, f.plan) : "neutral";
          const clr = SEM_CLR[sem];
          const pct = f.real != null && f.plan ? (f.real / f.plan) * 100 : null;
          const nombre = f.label.toUpperCase();
          return (
            <div key={i} className="space-y-1.5">
              <span className="text-[9px] font-bold uppercase tracking-widest text-stone-400 block">{f.label}</span>
              <div className="grid grid-cols-2 gap-2">
                {/* Real */}
                <div className={`rounded-xl border bg-white px-3 py-2.5 ${f.real != null ? clr.border : "border-stone-200"}`}>
                  <span className="text-[8px] font-bold uppercase tracking-widest text-stone-400 block mb-0.5">{nombre}</span>
                  <span className={`text-[15px] font-black tabular-nums ${f.real != null ? clr.text : "text-stone-300"}`}>
                    {f.real != null ? fmt(f.real, f.decimales) : "—"}
                  </span>
                  {pct !== null && (
                    <span className={`ml-1.5 text-[10px] font-black ${clr.text}`}>
                      {pct >= 100 ? "+" : ""}{pct.toFixed(0)}%
                    </span>
                  )}
                </div>
                {/* Plan */}
                <div className="rounded-xl border border-stone-200 bg-white px-3 py-2.5">
                  <span className="text-[8px] font-bold uppercase tracking-widest text-stone-400 block mb-0.5">
                    {nombre} PLAN
                  </span>
                  <span className="text-[15px] font-bold tabular-nums text-stone-700">
                    {f.plan != null ? fmt(f.plan, f.decimales) : "—"}
                  </span>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
