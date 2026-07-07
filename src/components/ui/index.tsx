import { ChevronDown } from "lucide-react";
import type { EstadoRegistro, Semaforo } from "../../types";
import { Clock, CheckCircle2, XCircle, Edit3 } from "lucide-react";

// ── Inputs ────────────────────────────────────────────────────
export function NumInput({ label, value, onChange, placeholder = "0" }: {
  label?: string; value: string; onChange: (v: string) => void; placeholder?: string;
}) {
  return (
    <label className="flex flex-col gap-1">
      {label && <span className="text-[10px] font-bold uppercase tracking-wider text-stone-500">{label}</span>}
      <input type="number" inputMode="decimal" value={value} onChange={e => onChange(e.target.value)}
        placeholder={placeholder}
        className="w-full rounded-xl border border-stone-300 bg-white px-3 py-2.5 text-[15px] font-bold text-stone-900 outline-none focus:border-[#1A4D2E] focus:ring-2 focus:ring-[#1A4D2E]/10" />
    </label>
  );
}

export function TextInput({ label, value, onChange, placeholder = "" }: {
  label?: string; value: string; onChange: (v: string) => void; placeholder?: string;
}) {
  return (
    <label className="flex flex-col gap-1">
      {label && <span className="text-[10px] font-bold uppercase tracking-wider text-stone-500">{label}</span>}
      <input type="text" value={value} onChange={e => onChange(e.target.value)} placeholder={placeholder}
        className="w-full rounded-xl border border-stone-300 bg-white px-3 py-2.5 text-[15px] font-bold text-stone-900 outline-none focus:border-[#1A4D2E] focus:ring-2 focus:ring-[#1A4D2E]/10" />
    </label>
  );
}

export function SelectInput({ label, value, onChange, options, placeholder }: {
  label?: string; value: string; onChange: (v: string) => void;
  options: string[]; placeholder: string;
}) {
  return (
    <label className="flex flex-col gap-1">
      {label && <span className="text-[10px] font-bold uppercase tracking-wider text-stone-500">{label}</span>}
      <div className="relative">
        <select value={value} onChange={e => onChange(e.target.value)}
          className="w-full appearance-none rounded-xl border border-stone-300 bg-white px-3 py-2.5 text-[15px] font-bold text-stone-900 outline-none focus:border-[#1A4D2E]">
          <option value="">{placeholder}</option>
          {options.map(o => <option key={o} value={o}>{o}</option>)}
        </select>
        <ChevronDown className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-stone-400" />
      </div>
    </label>
  );
}

export function ReadBox({ label, value, muted = false }: {
  label: string; value: string; muted?: boolean;
}) {
  return (
    <div className="flex flex-col gap-1">
      <span className="text-[10px] font-bold uppercase tracking-wider text-stone-400">{label}</span>
      <div className={`rounded-xl px-3 py-2.5 text-[14px] font-bold tabular-nums ${muted
        ? "bg-stone-50 border border-dashed border-stone-300 text-stone-500"
        : "bg-stone-100 text-stone-800"}`}>
        {value}
      </div>
    </div>
  );
}

// ── Estado badge ──────────────────────────────────────────────
const ESTADO_CFG: Record<EstadoRegistro, { icon: typeof Clock; label: string; cls: string }> = {
  pendiente: { icon: Clock,        label: "Pendiente", cls: "bg-amber-50 text-amber-700 border-amber-200" },
  aprobado:  { icon: CheckCircle2, label: "Aprobado",  cls: "bg-emerald-50 text-emerald-700 border-emerald-200" },
  rechazado: { icon: XCircle,      label: "Rechazado", cls: "bg-red-50 text-red-700 border-red-200" },
  borrador:  { icon: Edit3,        label: "Borrador",  cls: "bg-stone-50 text-stone-500 border-stone-200" },
};

export function EstadoBadge({ estado }: { estado: EstadoRegistro }) {
  const { icon: Icon, label, cls } = ESTADO_CFG[estado];
  return (
    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full border text-[10px] font-bold ${cls}`}>
      <Icon className="h-3 w-3" />{label}
    </span>
  );
}

// ── Indicador Real vs Plan ────────────────────────────────────
const SEM_CLR: Record<Semaforo, { text: string; bg: string; border: string }> = {
  verde:   { text: "text-emerald-700", bg: "bg-emerald-50", border: "border-emerald-200" },
  amarillo:{ text: "text-amber-700",   bg: "bg-amber-50",   border: "border-amber-200"   },
  rojo:    { text: "text-red-700",     bg: "bg-red-50",     border: "border-red-200"     },
  neutral: { text: "text-stone-500",   bg: "bg-stone-50",   border: "border-stone-200"   },
};

export function IndicPair({ label, real, plan, sem }: {
  label: string; real: number; plan: number; sem: Semaforo;
}) {
  const { text, bg, border } = SEM_CLR[sem];
  const pct = plan > 0 ? (real / plan) * 100 : null;
  return (
    <div className={`rounded-xl border px-3 py-2 ${bg} ${border}`}>
      <span className="text-[9px] font-bold uppercase tracking-widest text-stone-400 block mb-1">{label}</span>
      <div className="flex items-end justify-between">
        <span className={`text-[16px] font-black tabular-nums ${text}`}>{real.toFixed(2)}</span>
        <div className="text-right">
          <div className="text-[9px] text-stone-400">plan</div>
          <div className="text-[12px] font-bold text-stone-500 tabular-nums">{plan.toFixed(2)}</div>
        </div>
      </div>
      {pct !== null && (
        <div className={`text-[9px] font-black mt-0.5 ${text}`}>
          {pct >= 100 ? "+" : ""}{pct.toFixed(0)}%
        </div>
      )}
    </div>
  );
}

// ── Spinner ───────────────────────────────────────────────────
export function Spinner() {
  return (
    <div className="flex items-center justify-center py-12">
      <div className="h-8 w-8 rounded-full border-2 border-[#1A4D2E] border-t-transparent animate-spin" />
    </div>
  );
}
