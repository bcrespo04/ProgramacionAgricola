import { useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { ChevronLeft, Plus, Trash2, Send, Edit3 } from "lucide-react";
import { useAuth } from "../lib/auth";
import { crearRegistro } from "../lib/api";
import { useTablaDensidad } from "../lib/useTablaDensidad";
import {
  NumInput, TextInput, SelectInput, ReadBox
} from "../components/ui";
import { ComparativoTDC } from "../components/ComparativoTDC";
import {
  n, fmt, calcTM, calcDensidadIndependiente, totalesGrupo,
  totalesGlobales, interpolarTDC
} from "../lib/calculations";
import {
  EDADES_SIEMBRA,
  type GrupoSiembraForm, type LoteCosechaForm,
  type GrupoCoyoleoForm, type LoteCoyoleoForm, type RegistroPlanificacionForm
} from "../types";

// ── ID helpers ────────────────────────────────────────────────
const uid = () => Math.random().toString(36).slice(2);
const loteInit     = (): LoteCosechaForm  => ({ id: uid(), lote: "", ha: "", rp: "", densidad_palma: "", peso_fruta: "", cort_emp: "", cort_cont: "", evac_emp: "", evac_cont: "" });
const grupoInit    = (): GrupoSiembraForm => ({ id: uid(), anio_siembra: "", lotes: [loteInit()] });
const coyInit      = (): LoteCoyoleoForm  => ({ id: uid(), lote: "", ha: "", coy_emp: "", coy_cont: "" });
const grupoCoyInit = (): GrupoCoyoleoForm => ({ id: uid(), anio_siembra: "", lotes: [coyInit()] });

const SECTORES = Array.from({ length: 12 }, (_, i) => String(i + 1));

// ── Fila de lote cosecha ──────────────────────────────────────
function FilaLote({ lote, onChange, onDelete, canDelete }: {
  lote: LoteCosechaForm;
  onChange: (l: LoteCosechaForm) => void;
  onDelete: () => void;
  canDelete: boolean;
}) {
  const set = (k: keyof LoteCosechaForm) => (v: string) => onChange({ ...lote, [k]: v });
  const tm = calcTM(lote.ha, lote.densidad_palma, lote.peso_fruta, lote.rp);

  return (
    <div className="rounded-xl border border-orange-100 bg-white p-3 space-y-2.5">
      <div className="flex items-center justify-between">
        <span className="text-[9px] font-bold uppercase tracking-widest text-stone-400">Lote</span>
        {canDelete && (
          <button onClick={onDelete} className="text-stone-200 hover:text-red-400 transition">
            <Trash2 className="h-3.5 w-3.5" />
          </button>
        )}
      </div>
      <div className="grid grid-cols-2 gap-2">
        <TextInput label="No. Lote" value={lote.lote} onChange={set("lote")} placeholder="20--14" />
        <NumInput  label="HA"       value={lote.ha}   onChange={set("ha")} />
      </div>
      <div className="grid grid-cols-3 gap-2">
        <NumInput label="Dens. palma" value={lote.densidad_palma} onChange={set("densidad_palma")} />
        <NumInput label="Peso fruta"  value={lote.peso_fruta}     onChange={set("peso_fruta")} />
        <NumInput label="RP"          value={lote.rp}             onChange={set("rp")} placeholder="0.40" />
      </div>
      <ReadBox label="TM calculado" value={fmt(tm)} />
      <div className="grid grid-cols-2 gap-2">
        <NumInput label="Cort. emp"  value={lote.cort_emp}  onChange={set("cort_emp")} />
        <NumInput label="Cort. cont" value={lote.cort_cont} onChange={set("cort_cont")} />
      </div>
      <div className="grid grid-cols-2 gap-2">
        <NumInput label="Evac. emp"  value={lote.evac_emp}  onChange={set("evac_emp")} />
        <NumInput label="Evac. cont" value={lote.evac_cont} onChange={set("evac_cont")} />
      </div>
    </div>
  );
}

// ── Grupo de siembra ──────────────────────────────────────────
function GrupoSiembra({ grupo, onChange, onDelete, canDelete }: {
  grupo: GrupoSiembraForm;
  onChange: (g: GrupoSiembraForm) => void;
  onDelete: () => void;
  canDelete: boolean;
}) {
  const updLote  = (id: string, l: LoteCosechaForm) =>
    onChange({ ...grupo, lotes: grupo.lotes.map(x => x.id === id ? l : x) });
  const addLote  = () => onChange({ ...grupo, lotes: [...grupo.lotes, loteInit()] });
  const delLote  = (id: string) => onChange({ ...grupo, lotes: grupo.lotes.filter(x => x.id !== id) });

  return (
    <div className="rounded-2xl border-2 border-orange-200 bg-orange-50/30 p-4 space-y-3">
      <div className="flex items-center justify-between">
        <span className="text-[11px] font-black uppercase tracking-widest text-[#E07B39]">
          Siembra {grupo.anio_siembra || "—"}
        </span>
        {canDelete && (
          <button onClick={onDelete} className="text-stone-300 hover:text-red-400 transition">
            <Trash2 className="h-4 w-4" />
          </button>
        )}
      </div>

      <SelectInput label="Año de siembra" value={grupo.anio_siembra}
        onChange={v => onChange({ ...grupo, anio_siembra: v })}
        options={[...EDADES_SIEMBRA]} placeholder="Seleccionar año" />

      {grupo.lotes.map(l => (
        <FilaLote key={l.id} lote={l}
          onChange={updated => updLote(l.id, updated)}
          onDelete={() => delLote(l.id)}
          canDelete={grupo.lotes.length > 1} />
      ))}

      <button onClick={addLote}
        className="w-full rounded-xl border border-dashed border-orange-300 py-2 text-[12px] font-bold text-[#E07B39] flex items-center justify-center gap-1.5">
        <Plus className="h-3.5 w-3.5" /> Agregar lote a esta siembra
      </button>
    </div>
  );
}

// ── Fila de lote coyoleo ───────────────────────────────────────
function FilaCoyoleo({ lote, onChange, onDelete, canDelete }: {
  lote: LoteCoyoleoForm;
  onChange: (l: LoteCoyoleoForm) => void;
  onDelete: () => void;
  canDelete: boolean;
}) {
  const set = (k: keyof LoteCoyoleoForm) => (v: string) => onChange({ ...lote, [k]: v });
  return (
    <div className="rounded-xl border border-blue-100 bg-white p-3 space-y-2.5">
      <div className="flex items-center justify-between">
        <span className="text-[9px] font-bold uppercase tracking-widest text-stone-400">Lote</span>
        {canDelete && (
          <button onClick={onDelete} className="text-stone-200 hover:text-red-400 transition">
            <Trash2 className="h-3.5 w-3.5" />
          </button>
        )}
      </div>
      <div className="grid grid-cols-2 gap-2">
        <TextInput label="No. Lote" value={lote.lote} onChange={set("lote")} placeholder="20--4" />
        <NumInput  label="HA"       value={lote.ha}   onChange={set("ha")} />
      </div>
      <div className="grid grid-cols-2 gap-2">
        <NumInput label="Coy. emp"  value={lote.coy_emp}  onChange={set("coy_emp")} />
        <NumInput label="Coy. cont" value={lote.coy_cont} onChange={set("coy_cont")} />
      </div>
    </div>
  );
}

// ── Grupo de coyoleo ────────────────────────────────────────────
function GrupoCoyoleo({ grupo, onChange, onDelete, canDelete }: {
  grupo: GrupoCoyoleoForm;
  onChange: (g: GrupoCoyoleoForm) => void;
  onDelete: () => void;
  canDelete: boolean;
}) {
  const updLote = (id: string, l: LoteCoyoleoForm) =>
    onChange({ ...grupo, lotes: grupo.lotes.map(x => x.id === id ? l : x) });
  const addLote = () => onChange({ ...grupo, lotes: [...grupo.lotes, coyInit()] });
  const delLote = (id: string) => onChange({ ...grupo, lotes: grupo.lotes.filter(x => x.id !== id) });

  return (
    <div className="rounded-2xl border-2 border-blue-200 bg-blue-50/30 p-4 space-y-3">
      <div className="flex items-center justify-between">
        <span className="text-[11px] font-black uppercase tracking-widest text-[#2563A8]">
          Siembra {grupo.anio_siembra || "—"}
        </span>
        {canDelete && (
          <button onClick={onDelete} className="text-stone-300 hover:text-red-400 transition">
            <Trash2 className="h-4 w-4" />
          </button>
        )}
      </div>

      <SelectInput label="Año de siembra" value={grupo.anio_siembra}
        onChange={v => onChange({ ...grupo, anio_siembra: v })}
        options={[...EDADES_SIEMBRA]} placeholder="Seleccionar año" />

      {grupo.lotes.map(l => (
        <FilaCoyoleo key={l.id} lote={l}
          onChange={updated => updLote(l.id, updated)}
          onDelete={() => delLote(l.id)}
          canDelete={grupo.lotes.length > 1} />
      ))}

      <button onClick={addLote}
        className="w-full rounded-xl border border-dashed border-blue-300 py-2 text-[12px] font-bold text-[#2563A8] flex items-center justify-center gap-1.5">
        <Plus className="h-3.5 w-3.5" /> Agregar lote a esta siembra
      </button>
    </div>
  );
}

// ── Resumen por siembra con TDC ───────────────────────────────
function ResumenSiembra({ grupo, tabla, densidadGlobal }: {
  grupo: GrupoSiembraForm;
  tabla: ReturnType<typeof useTablaDensidad>["tabla"];
  densidadGlobal: number;
}) {
  const tot = totalesGrupo(grupo.lotes);
  const densProm = grupo.lotes.reduce((a, l) => a + n(l.densidad_palma), 0) / (grupo.lotes.length || 1);
  const pesoProm = grupo.lotes.reduce((a, l) => a + n(l.peso_fruta), 0) / (grupo.lotes.length || 1);
  const tdc = interpolarTDC(tabla, grupo.anio_siembra, densidadGlobal);

  const tmC     = tot.corteros > 0 ? tot.tm / tot.corteros : 0;
  const haC     = tot.corteros > 0 ? tot.ha / tot.corteros : 0;
  const cortPlan = tdc && tot.ha > 0 ? tot.ha / tdc.ha_j : 0;

  return (
    <div className="rounded-2xl border border-orange-200 bg-white overflow-hidden">
      <div className="px-4 py-2.5 bg-orange-50 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="h-2 w-2 rounded-full bg-[#E07B39]" />
          <span className="text-[12px] font-black text-[#E07B39] uppercase tracking-wide">
            Siembra {grupo.anio_siembra || "—"}
          </span>
          <span className="text-[10px] text-stone-400">{grupo.lotes.length} lotes</span>
        </div>
      </div>

      <div className="px-4 py-3 space-y-3">
        {/* Tabla lotes */}
        <div className="rounded-xl border border-stone-100 overflow-x-auto text-[11px]">
          <div className="grid grid-cols-7 min-w-[440px] bg-stone-50 px-3 py-1.5 font-bold uppercase tracking-wider text-[9px] text-stone-400">
            <span>Lote</span><span className="text-right">HA</span><span className="text-right">Dens</span>
            <span className="text-right">Peso</span><span className="text-right">RP</span>
            <span className="text-right">TM</span><span className="text-right">Cort</span>
          </div>
          {grupo.lotes.map((l, i) => (
            <div key={l.id} className={`grid grid-cols-7 min-w-[440px] px-3 py-2 font-medium text-stone-800 tabular-nums ${i % 2 ? "bg-stone-50/50" : ""}`}>
              <span className="font-bold">{l.lote || "—"}</span>
              <span className="text-right">{fmt(n(l.ha))}</span>
              <span className="text-right">{fmt(n(l.densidad_palma), 0)}</span>
              <span className="text-right">{fmt(n(l.peso_fruta))}</span>
              <span className="text-right">{fmt(n(l.rp), 2)}</span>
              <span className="text-right">{fmt(calcTM(l.ha, l.densidad_palma, l.peso_fruta, l.rp))}</span>
              <span className="text-right">{n(l.cort_emp) + n(l.cort_cont)}</span>
            </div>
          ))}
          <div className="grid grid-cols-7 min-w-[440px] px-3 py-2 bg-orange-50 font-black text-[#E07B39] tabular-nums border-t border-orange-100 text-[11px]">
            <span>SUB</span>
            <span className="text-right">{fmt(tot.ha)}</span>
            <span className="text-right">{fmt(densProm, 0)}</span>
            <span className="text-right">{fmt(pesoProm)}</span>
            <span className="text-right">{fmt(tot.rp, 2)}</span>
            <span className="text-right">{fmt(tot.tm)}</span>
            <span className="text-right">{tot.corteros}</span>
          </div>
        </div>

        {/* Comparativo TDC */}
        {tdc ? (
          <ComparativoTDC titulo={`vs Plan TDC · Dens ${fmt(densidadGlobal, 0)}`} filas={[
            { label: "Total corteros", real: tot.corteros, plan: cortPlan, decimales: 0 },
            { label: "TM/C",           real: tmC,          plan: tdc.tm_c },
            { label: "HA/C",           real: haC,          plan: tdc.ha_j },
          ]} />
        ) : (
          <p className="text-[11px] text-stone-400 text-center py-1">
            Ingresa la Densidad Siembra en Datos generales para ver el plan TDC
          </p>
        )}
      </div>
    </div>
  );
}

// ── Resumen por siembra de coyoleo con TDC ─────────────────────
// La densidad usada para el plan TDC es la Densidad Siembra global del registro.
function ResumenCoyoleo({ grupo, tabla, densidadGlobal }: {
  grupo: GrupoCoyoleoForm;
  tabla: ReturnType<typeof useTablaDensidad>["tabla"];
  densidadGlobal: number;
}) {
  const totHA = grupo.lotes.reduce((a, l) => a + n(l.ha), 0);
  const totCoyoleros = grupo.lotes.reduce((a, l) => a + n(l.coy_emp) + n(l.coy_cont), 0);
  const haCoyReal = totCoyoleros > 0 ? totHA / totCoyoleros : 0;

  const tdc = interpolarTDC(tabla, grupo.anio_siembra, densidadGlobal);

  return (
    <div className="rounded-2xl border border-blue-100 bg-white overflow-hidden">
      <div className="px-4 py-2.5 bg-blue-50 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="h-2 w-2 rounded-full bg-[#2563A8]" />
          <span className="text-[12px] font-black text-[#2563A8] uppercase tracking-wide">
            Siembra {grupo.anio_siembra || "—"}
          </span>
          <span className="text-[10px] text-stone-400">{grupo.lotes.length} lotes</span>
        </div>
      </div>

      <div className="px-4 py-3 space-y-3">
        <div className="rounded-xl border border-stone-100 overflow-hidden text-[11px]">
          <div className="grid grid-cols-3 bg-stone-50 px-3 py-1.5 font-bold uppercase tracking-wider text-[9px] text-stone-400">
            <span>Lote</span><span className="text-right">HA</span><span className="text-right">Coyoleros</span>
          </div>
          {grupo.lotes.map((l, i) => (
            <div key={l.id} className={`grid grid-cols-3 px-3 py-2 font-medium text-stone-800 tabular-nums ${i % 2 ? "bg-stone-50/50" : ""}`}>
              <span className="font-bold">{l.lote || "—"}</span>
              <span className="text-right">{fmt(n(l.ha))}</span>
              <span className="text-right">{n(l.coy_emp) + n(l.coy_cont)}</span>
            </div>
          ))}
          <div className="grid grid-cols-3 px-3 py-2 bg-blue-50 font-black text-[#2563A8] tabular-nums border-t border-blue-100 text-[11px]">
            <span>SUB</span>
            <span className="text-right">{fmt(totHA)}</span>
            <span className="text-right">{totCoyoleros}</span>
          </div>
        </div>

        {tdc ? (
          <ComparativoTDC titulo={`vs Plan TDC · Dens ${fmt(densidadGlobal, 0)}`} filas={[
            { label: "HA/Coyolero", real: haCoyReal, plan: tdc.ha_j },
            { label: "Sacos/Cy plan", real: null, plan: tdc.sacos_p },
          ]} />
        ) : (
          <p className="text-[11px] text-stone-400 text-center py-1">
            Ingresa la Densidad Siembra en Datos generales para ver el plan TDC
          </p>
        )}
      </div>
    </div>
  );
}

// ── Página principal ──────────────────────────────────────────
type Paso = "form" | "resumen";

export default function NuevaPlanificacion() {
  const { usuario } = useAuth();
  const navigate = useNavigate();
  const { tabla } = useTablaDensidad();
  const [paso, setPaso] = useState<Paso>("form");
  const [guardando, setGuardando] = useState(false);
  const [errorGuardar, setErrorGuardar] = useState<string | null>(null);

  const [form, setForm] = useState<RegistroPlanificacionForm>({
    fecha:            new Date().toISOString().slice(0, 10),
    sector:           String(usuario?.sector ?? ""),
    fiscal_cosecha:   "",
    fiscal_coyoleo:   "",
    densidad_siembra: "",
    peso_fruta:       "",
    grupos:           [grupoInit()],
    grupos_coyoleo:   [grupoCoyInit()],
  });

  const updGrupo = (id: string, g: GrupoSiembraForm) =>
    setForm(f => ({ ...f, grupos: f.grupos.map(x => x.id === id ? g : x) }));
  const delGrupo = (id: string) =>
    setForm(f => ({ ...f, grupos: f.grupos.filter(x => x.id !== id) }));
  const addGrupo = () =>
    setForm(f => ({ ...f, grupos: [...f.grupos, grupoInit()] }));

  const updGrupoCoy = (id: string, g: GrupoCoyoleoForm) =>
    setForm(f => ({ ...f, grupos_coyoleo: f.grupos_coyoleo.map(x => x.id === id ? g : x) }));
  const delGrupoCoy = (id: string) =>
    setForm(f => ({ ...f, grupos_coyoleo: f.grupos_coyoleo.filter(x => x.id !== id) }));
  const addGrupoCoy = () =>
    setForm(f => ({ ...f, grupos_coyoleo: [...f.grupos_coyoleo, grupoCoyInit()] }));

  const totGlobal  = useMemo(() => totalesGlobales(form.grupos), [form.grupos]);
  const densCalc   = useMemo(
    () => calcDensidadIndependiente(form.densidad_siembra, form.peso_fruta, form.grupos.flatMap(g => g.lotes)),
    [form.densidad_siembra, form.peso_fruta, form.grupos]
  );
  const totCoyoleo = useMemo(() => form.grupos_coyoleo.flatMap(g => g.lotes).reduce((acc, l) => ({
    ha: acc.ha + n(l.ha), coyoleros: acc.coyoleros + n(l.coy_emp) + n(l.coy_cont),
  }), { ha: 0, coyoleros: 0 }), [form.grupos_coyoleo]);

  // Plan TDC global de cosecha: suma del plan de cada grupo, todos con la misma Densidad Siembra global
  const cosechaPlanGlobal = useMemo(() => {
    let corterosPlan = 0, tmPlanPonderado = 0;
    form.grupos.forEach(g => {
      const tot = totalesGrupo(g.lotes);
      const tdc = interpolarTDC(tabla, g.anio_siembra, n(form.densidad_siembra));
      if (tdc && tot.ha > 0) {
        const cp = tot.ha / tdc.ha_j;
        corterosPlan += cp;
        tmPlanPonderado += tdc.tm_c * cp;
      }
    });
    return {
      corterosPlan,
      haCPlan: corterosPlan > 0 ? totGlobal.ha / corterosPlan : 0,
      tmCPlan: corterosPlan > 0 ? tmPlanPonderado / corterosPlan : 0,
    };
  }, [form.grupos, form.densidad_siembra, tabla, totGlobal.ha]);

  // Plan TDC global de coyoleo: misma Densidad Siembra global del registro
  const coyoleoPlanGlobal = useMemo(() => {
    let coyolerosPlan = 0, sacosPlanPonderado = 0;
    form.grupos_coyoleo.forEach(g => {
      const totHA = g.lotes.reduce((a, l) => a + n(l.ha), 0);
      if (totHA <= 0) return;
      const tdc = interpolarTDC(tabla, g.anio_siembra, n(form.densidad_siembra));
      if (tdc) {
        const cp = totHA / tdc.ha_j;
        coyolerosPlan += cp;
        sacosPlanPonderado += tdc.sacos_p * cp;
      }
    });
    return {
      haCyPlan:    coyolerosPlan > 0 ? totCoyoleo.ha / coyolerosPlan : 0,
      sacosCyPlan: coyolerosPlan > 0 ? sacosPlanPonderado / coyolerosPlan : 0,
    };
  }, [form.grupos_coyoleo, form.densidad_siembra, tabla, totCoyoleo.ha]);

  async function handleGuardar() {
    if (!usuario) return;
    setGuardando(true);
    setErrorGuardar(null);
    try {
      await crearRegistro(form, usuario.id);
      navigate("/");
    } catch (e: any) {
      console.error(e);
      const msg = e?.message || e?.error_description || e?.hint || JSON.stringify(e);
      setErrorGuardar(msg || "No se pudo guardar el registro. Intenta de nuevo.");
    } finally {
      setGuardando(false);
    }
  }

  // ── Pantalla de resumen ──
  if (paso === "resumen") {
    return (
      <div className="min-h-screen bg-[#F7F5F0]">
        <div className="bg-[#1A4D2E] px-5 pt-10 pb-5">
          <button onClick={() => setPaso("form")} className="flex items-center gap-1.5 text-emerald-300 mb-3 -ml-1">
            <ChevronLeft className="h-5 w-5" />
            <span className="text-[12px] font-bold">Editar</span>
          </button>
          <h1 className="text-white text-xl font-black">Resumen planificación</h1>
          <p className="text-emerald-400 text-[12px]">
            Sector {form.sector} · {new Date(form.fecha + "T12:00:00").toLocaleDateString("es-NI", { day: "2-digit", month: "short", year: "numeric" })}
          </p>
        </div>

        <div className="px-4 py-4 space-y-4 pb-32">
          {/* Global */}
          <div className="rounded-2xl bg-white border border-stone-200 px-4 py-3.5">
            <span className="text-[9px] font-bold uppercase tracking-widest text-stone-400 block mb-3">Global</span>
            <div className="grid grid-cols-4 gap-2 pb-3 border-b border-stone-100">
              <div>
                <span className="text-[9px] font-bold uppercase tracking-widest text-stone-400 block">Densidad</span>
                <span className="text-[20px] font-black text-[#1A4D2E] tabular-nums">{densCalc.toFixed(0)}</span>
              </div>
              <div>
                <span className="text-[9px] font-bold uppercase tracking-widest text-stone-400 block">HA</span>
                <span className="text-[20px] font-black text-stone-800 tabular-nums">{fmt(totGlobal.ha)}</span>
              </div>
              <div>
                <span className="text-[9px] font-bold uppercase tracking-widest text-stone-400 block">TM</span>
                <span className="text-[20px] font-black text-stone-800 tabular-nums">{fmt(totGlobal.tm)}</span>
              </div>
              <div>
                <span className="text-[9px] font-bold uppercase tracking-widest text-[#E07B39] block">Cort/HA</span>
                <span className="text-[20px] font-black text-[#E07B39] tabular-nums">
                  {totGlobal.ha > 0 ? fmt(totGlobal.corteros / totGlobal.ha) : "—"}
                </span>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3 pt-3">
              <div>
                <span className="text-[9px] text-stone-400 font-bold uppercase tracking-widest">Fiscal cosecha</span>
                <p className="text-[13px] font-black text-stone-800">{form.fiscal_cosecha || "—"}</p>
              </div>
              <div>
                <span className="text-[9px] text-stone-400 font-bold uppercase tracking-widest">Fiscal coyoleo</span>
                <p className="text-[13px] font-black text-stone-800">{form.fiscal_coyoleo || "—"}</p>
              </div>
            </div>
          </div>

          {/* Comparativo TDC global del registro */}
          <div className="space-y-3">
            <span className="text-[11px] font-black uppercase tracking-wide text-stone-500 block">
              Comparativo TDC · todo el registro
            </span>
            <ComparativoTDC titulo="Cosecha" filas={[
              { label: "Total corteros", real: totGlobal.corteros, plan: cosechaPlanGlobal.corterosPlan, decimales: 0 },
              { label: "TM/C",           real: totGlobal.corteros > 0 ? totGlobal.tm / totGlobal.corteros : 0, plan: cosechaPlanGlobal.tmCPlan },
              { label: "HA/C",           real: totGlobal.corteros > 0 ? totGlobal.ha / totGlobal.corteros : 0, plan: cosechaPlanGlobal.haCPlan },
            ]} />
            <ComparativoTDC titulo="Coyoleo" filas={[
              { label: "HA/Coyolero",    real: totCoyoleo.coyoleros > 0 ? totCoyoleo.ha / totCoyoleo.coyoleros : 0, plan: coyoleoPlanGlobal.haCyPlan },
              { label: "Sacos/Cy plan",  real: null, plan: coyoleoPlanGlobal.sacosCyPlan },
            ]} />
          </div>

          {/* Por siembra */}
          <div>
            <span className="text-[11px] font-black uppercase tracking-wide text-stone-500 block mb-3">
              Detalle por siembra · comparativo TDC
            </span>
            <div className="space-y-3">
              {form.grupos.map(g => (
                <ResumenSiembra key={g.id} grupo={g} tabla={tabla} densidadGlobal={n(form.densidad_siembra)} />
              ))}
            </div>
          </div>

          {/* Coyoleo resumen */}
          <div>
            <span className="text-[11px] font-black uppercase tracking-wide text-[#2563A8] block mb-3">
              Detalle por siembra · Coyoleo
            </span>
            <div className="space-y-3">
              {form.grupos_coyoleo.map(g => (
                <ResumenCoyoleo key={g.id} grupo={g} tabla={tabla} densidadGlobal={n(form.densidad_siembra)} />
              ))}
            </div>
          </div>

          {errorGuardar && (
            <p className="text-[13px] text-red-600 bg-red-50 border border-red-100 rounded-xl px-4 py-3">
              {errorGuardar}
            </p>
          )}
        </div>

        {/* Footer */}
        <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-stone-200 px-4 py-4 flex gap-3">
          <button onClick={() => setPaso("form")} disabled={guardando}
            className="flex-1 rounded-2xl border-2 border-stone-300 py-3.5 text-stone-700 font-bold text-[14px] flex items-center justify-center gap-1.5">
            <Edit3 className="h-4 w-4" /> Editar
          </button>
          <button onClick={handleGuardar} disabled={guardando}
            className="flex-1 rounded-2xl bg-[#1A4D2E] py-3.5 text-white font-bold text-[14px] flex items-center justify-center gap-1.5 shadow-lg disabled:opacity-60">
            <Send className="h-4 w-4" /> {guardando ? "Enviando..." : "Enviar para aprobación"}
          </button>
        </div>
      </div>
    );
  }

  // ── Formulario de captura ──
  return (
    <div className="min-h-screen bg-[#F7F5F0]">
      <div className="bg-[#1A4D2E] px-5 pt-10 pb-5">
        <button onClick={() => navigate("/")} className="flex items-center gap-1.5 text-emerald-300 mb-3 -ml-1">
          <ChevronLeft className="h-5 w-5" />
          <span className="text-[12px] font-bold">Inicio</span>
        </button>
        <h1 className="text-white text-2xl font-black">Nueva planificación</h1>
        <p className="text-emerald-400 text-[12px]">Sector {form.sector}</p>
      </div>

      {/* Banner densidad */}
      <div className="mx-4 -mt-3 rounded-2xl bg-white border border-stone-200 shadow-sm px-4 py-3 space-y-2">
        <div className="flex items-center justify-between">
          <div>
            <span className="text-[9px] font-bold uppercase tracking-widest text-stone-400">Densidad calculada</span>
            <div className="text-[22px] font-black text-[#1A4D2E] tabular-nums leading-tight">
              {densCalc > 0 ? densCalc.toFixed(0) : "—"}
            </div>
          </div>
          <div className="text-right">
            <span className="text-[9px] font-bold uppercase tracking-widest text-[#E07B39]">Cort/HA</span>
            <div className="text-[22px] font-black text-[#E07B39] tabular-nums">
              {totGlobal.ha > 0 ? fmt(totGlobal.corteros / totGlobal.ha) : "—"}
            </div>
          </div>
          <div className="text-right">
            <span className="text-[9px] font-bold uppercase tracking-widest text-[#2563A8]">Coy/HA</span>
            <div className="text-[22px] font-black text-[#2563A8] tabular-nums">
              {totCoyoleo.ha > 0 ? fmt(totCoyoleo.coyoleros / totCoyoleo.ha) : "—"}
            </div>
          </div>
        </div>
      </div>

      <div className="px-4 pt-4 pb-6 space-y-5">
        {/* Datos generales */}
        <div className="grid grid-cols-2 gap-3">
          <SelectInput label="Sector" value={form.sector}
            onChange={v => setForm(f => ({ ...f, sector: v }))}
            options={SECTORES} placeholder="Sector" />
          <label className="flex flex-col gap-1">
            <span className="text-[10px] font-bold uppercase tracking-wider text-stone-500">Fecha</span>
            <input type="date" value={form.fecha}
              onChange={e => setForm(f => ({ ...f, fecha: e.target.value }))}
              className="w-full rounded-xl border border-stone-300 bg-white px-3 py-2.5 text-[14px] font-bold text-stone-900 outline-none focus:border-[#1A4D2E]" />
          </label>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <TextInput label="Fiscal cosecha" value={form.fiscal_cosecha}
            onChange={v => setForm(f => ({ ...f, fiscal_cosecha: v }))} placeholder="Nombre" />
          <TextInput label="Fiscal coyoleo" value={form.fiscal_coyoleo}
            onChange={v => setForm(f => ({ ...f, fiscal_coyoleo: v }))} placeholder="Nombre" />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <NumInput label="Densidad Siembra" value={form.densidad_siembra}
            onChange={v => setForm(f => ({ ...f, densidad_siembra: v }))} />
          <NumInput label="Peso fruta" value={form.peso_fruta}
            onChange={v => setForm(f => ({ ...f, peso_fruta: v }))} />
        </div>

        {/* Grupos cosecha */}
        <div>
          <div className="flex items-center gap-2 mb-3">
            <div className="h-4 w-1 rounded-full bg-[#E07B39]" />
            <h2 className="text-[15px] font-black uppercase tracking-wide text-[#E07B39]">Cosecha</h2>
          </div>
          <div className="space-y-4">
            {form.grupos.map(g => (
              <GrupoSiembra key={g.id} grupo={g}
                onChange={updated => updGrupo(g.id, updated)}
                onDelete={() => delGrupo(g.id)}
                canDelete={form.grupos.length > 1} />
            ))}
          </div>
          <button onClick={addGrupo}
            className="mt-4 w-full rounded-2xl border-2 border-dashed border-orange-200 py-3 flex items-center justify-center gap-2 text-[#E07B39] text-[13px] font-bold">
            <Plus className="h-4 w-4" /> Agregar grupo de siembra
          </button>
        </div>

        {/* Coyoleo */}
        <div>
          <div className="flex items-center gap-2 mb-3">
            <div className="h-4 w-1 rounded-full bg-[#2563A8]" />
            <h2 className="text-[15px] font-black uppercase tracking-wide text-[#2563A8]">Coyoleo</h2>
          </div>
          <div className="space-y-4">
            {form.grupos_coyoleo.map(g => (
              <GrupoCoyoleo key={g.id} grupo={g}
                onChange={updated => updGrupoCoy(g.id, updated)}
                onDelete={() => delGrupoCoy(g.id)}
                canDelete={form.grupos_coyoleo.length > 1} />
            ))}
          </div>
          <button onClick={addGrupoCoy}
            className="mt-4 w-full rounded-2xl border-2 border-dashed border-blue-200 py-3 flex items-center justify-center gap-2 text-[#2563A8] text-[13px] font-bold">
            <Plus className="h-4 w-4" /> Agregar grupo de siembra
          </button>
        </div>

        <button onClick={() => setPaso("resumen")}
          className="w-full rounded-2xl bg-[#1A4D2E] py-4 text-white font-black text-[15px] shadow-lg shadow-[#1A4D2E]/20 active:scale-[0.98] transition">
          Revisar y enviar
        </button>
      </div>
    </div>
  );
}
