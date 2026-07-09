import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { ChevronLeft, Tractor, Send } from "lucide-react";
import { useAuth } from "../lib/auth";
import { buscarPlanParaFecha, getEjecucionPorFecha, guardarEjecucion } from "../lib/api";
import { NumInput, TextInput, Spinner } from "../components/ui";
import { fmt } from "../lib/calculations";
import type { EjecucionDiaria, EjecucionDiariaForm, PlanAprobado } from "../types";

const hoyISO = () => new Date().toISOString().slice(0, 10);

type CampoNumKey = Exclude<keyof EjecucionDiariaForm, "fecha" | "lotes_extra" | "lotes_seleccionados">;

const CAMPOS_NUM: { key: CampoNumKey; label: string }[] = [
  { key: "corteros",           label: "Corteros" },
  { key: "evacuadores",        label: "Evacuadores" },
  { key: "coyoleros",          label: "Coyoleros" },
  { key: "cargadores",         label: "Cargadores" },
  { key: "fruta_dia_anterior", label: "Fruta día anterior" },
  { key: "tm_enviadas",        label: "TM enviadas" },
  { key: "bacadillas",         label: "Bacadillas" },
  { key: "sacos_dia",          label: "Sacos del día" },
  { key: "sacos_enviados",     label: "Sacos enviados" },
  { key: "ha_coyol",           label: "Ha coyol" },
  { key: "ha_cosechadas",      label: "Ha cosechadas" },
];

function formVacio(fecha: string): EjecucionDiariaForm {
  return {
    fecha,
    corteros: "", evacuadores: "", coyoleros: "", cargadores: "",
    fruta_dia_anterior: "", tm_enviadas: "", bacadillas: "",
    sacos_dia: "", sacos_enviados: "", ha_coyol: "", ha_cosechadas: "",
    lotes_extra: "", lotes_seleccionados: [],
  };
}

function ejecucionAForm(e: EjecucionDiaria, fecha: string): EjecucionDiariaForm {
  const s = (v: number | null) => v != null ? String(v) : "";
  return {
    fecha,
    corteros: s(e.corteros),
    evacuadores: s(e.evacuadores),
    coyoleros: s(e.coyoleros),
    cargadores: s(e.cargadores),
    fruta_dia_anterior: s(e.fruta_dia_anterior),
    tm_enviadas: s(e.tm_enviadas),
    bacadillas: s(e.bacadillas),
    sacos_dia: s(e.sacos_dia),
    sacos_enviados: s(e.sacos_enviados),
    ha_coyol: s(e.ha_coyol),
    ha_cosechadas: s(e.ha_cosechadas),
    lotes_extra: e.lotes_extra ?? "",
    lotes_seleccionados: (e.ejecucion_lotes ?? []).map(l => l.lote_cosecha_id),
  };
}

// ── Borrador local (evita perder datos si se cambia de ventana antes de guardar) ──
const draftKey = (coordinadorId: string, fecha: string) => `prog-agricola:ejecucion-borrador:${coordinadorId}:${fecha}`;

function leerBorrador(coordinadorId: string, fecha: string): EjecucionDiariaForm | null {
  try {
    const raw = localStorage.getItem(draftKey(coordinadorId, fecha));
    return raw ? JSON.parse(raw) as EjecucionDiariaForm : null;
  } catch { return null; }
}

function guardarBorrador(coordinadorId: string, fecha: string, form: EjecucionDiariaForm) {
  try { localStorage.setItem(draftKey(coordinadorId, fecha), JSON.stringify(form)); } catch { /* localStorage no disponible */ }
}

function borrarBorrador(coordinadorId: string, fecha: string) {
  try { localStorage.removeItem(draftKey(coordinadorId, fecha)); } catch { /* localStorage no disponible */ }
}

// ── Selector de lotes del plan aprobado ─────────────────────────
function SelectorLotes({ plan, seleccionados, onToggle }: {
  plan: PlanAprobado | null;
  seleccionados: string[];
  onToggle: (id: string) => void;
}) {
  if (!plan) {
    return (
      <p className="text-[12px] text-amber-700 bg-amber-50 border border-amber-200 rounded-xl px-3.5 py-3">
        No hay un plan aprobado para esta fecha en tu sector.
      </p>
    );
  }
  const grupos = plan.grupos_siembra ?? [];
  if (!grupos.some(g => (g.lotes_cosecha ?? []).length > 0)) {
    return (
      <p className="text-[12px] text-stone-400 text-center py-3">
        El plan aprobado de esta fecha no tiene lotes de cosecha.
      </p>
    );
  }
  return (
    <div className="space-y-3">
      {grupos.map(g => (
        <div key={g.id}>
          <span className="text-[10px] font-bold uppercase tracking-wider text-stone-400 block mb-1.5">
            Siembra {g.anio_siembra}
          </span>
          <div className="space-y-1.5">
            {(g.lotes_cosecha ?? []).map(l => (
              <label key={l.id}
                className="flex items-center gap-2.5 rounded-xl border border-stone-200 bg-white px-3 py-2.5">
                <input type="checkbox" checked={seleccionados.includes(l.id)}
                  onChange={() => onToggle(l.id)}
                  className="h-4 w-4 rounded border-stone-300 text-[#1A4D2E] focus:ring-[#1A4D2E]" />
                <span className="flex-1 text-[13px] font-bold text-stone-800">{l.lote || "—"}</span>
                <span className="text-[11px] text-stone-400 tabular-nums">{fmt(l.ha)} ha</span>
              </label>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

// ── Página de captura ─────────────────────────────────────────────
export default function EjecucionForm() {
  const { usuario } = useAuth();
  const navigate = useNavigate();

  const [fecha, setFecha] = useState(hoyISO());
  const [plan, setPlan] = useState<PlanAprobado | null>(null);
  const [cargandoPlan, setCargandoPlan] = useState(false);
  const [ejecucionExistente, setEjecucionExistente] = useState<EjecucionDiaria | null>(null);
  const [form, setForm] = useState<EjecucionDiariaForm>(() => formVacio(hoyISO()));

  const [guardando, setGuardando] = useState(false);
  const [errorGuardar, setErrorGuardar] = useState<string | null>(null);
  const [guardadoOk, setGuardadoOk] = useState(false);

  // Carga el plan aprobado y la ejecución ya existente para la fecha elegida.
  // Si no hay ejecución guardada en el servidor, restaura el borrador local si existe.
  useEffect(() => {
    if (!usuario || !usuario.sector) return;
    let cancelado = false;
    setCargandoPlan(true);
    Promise.all([
      buscarPlanParaFecha(usuario.sector, fecha),
      getEjecucionPorFecha(usuario.id, fecha),
    ]).then(([planData, ejecData]) => {
      if (cancelado) return;
      setPlan(planData);
      setEjecucionExistente(ejecData);
      if (ejecData) {
        borrarBorrador(usuario.id, fecha);
        setForm(ejecucionAForm(ejecData, fecha));
      } else {
        setForm(leerBorrador(usuario.id, fecha) ?? formVacio(fecha));
      }
    }).catch(e => {
      if (!cancelado) console.error(e);
    }).finally(() => {
      if (!cancelado) setCargandoPlan(false);
    });
    return () => { cancelado = true; };
  }, [usuario, fecha]);

  // Borrador automático (debounce ~500ms), mientras no esté en medio de una carga por cambio de fecha.
  useEffect(() => {
    if (!usuario || cargandoPlan) return;
    const t = setTimeout(() => guardarBorrador(usuario.id, form.fecha, form), 500);
    return () => clearTimeout(t);
  }, [usuario, cargandoPlan, form]);

  function toggleLote(id: string) {
    setForm(f => ({
      ...f,
      lotes_seleccionados: f.lotes_seleccionados.includes(id)
        ? f.lotes_seleccionados.filter(x => x !== id)
        : [...f.lotes_seleccionados, id],
    }));
  }

  async function handleGuardar() {
    if (!usuario || !usuario.sector) return;
    setGuardando(true);
    setErrorGuardar(null);
    setGuardadoOk(false);
    try {
      await guardarEjecucion(usuario.id, usuario.sector, form, ejecucionExistente?.id);
      borrarBorrador(usuario.id, form.fecha);
      const ejecData = await getEjecucionPorFecha(usuario.id, form.fecha);
      setEjecucionExistente(ejecData);
      setGuardadoOk(true);
    } catch (e: any) {
      console.error(e);
      const msg = e?.message || e?.error_description || e?.hint || JSON.stringify(e);
      setErrorGuardar(msg || "No se pudo guardar la ejecución. Intenta de nuevo.");
    } finally {
      setGuardando(false);
    }
  }

  return (
    <div className="min-h-screen bg-[#F7F5F0] pb-10">
      <div className="bg-[#1A4D2E] px-5 pt-10 pb-6">
        <button onClick={() => navigate("/ejecucion")} className="flex items-center gap-1.5 text-emerald-300 mb-3 -ml-1">
          <ChevronLeft className="h-5 w-5" />
          <span className="text-[12px] font-bold">Volver</span>
        </button>
        <div className="flex items-center gap-2 mb-1">
          <Tractor className="h-4 w-4 text-emerald-400" />
          <span className="text-[10px] font-bold uppercase tracking-[0.2em] text-emerald-300">
            Programación Agrícola
          </span>
        </div>
        <h1 className="text-white text-2xl font-black">Reporte diario</h1>
      </div>

      <div className="px-4 py-4">
        <div className="rounded-2xl bg-white border border-stone-200 px-4 py-4 space-y-4">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-black uppercase tracking-wide text-stone-600">Datos del día</span>
            {ejecucionExistente && (
              <span className="text-[9px] font-bold uppercase tracking-wider text-emerald-600 bg-emerald-50 border border-emerald-200 rounded-full px-2 py-0.5">
                Editando
              </span>
            )}
          </div>

          <label className="flex flex-col gap-1">
            <span className="text-[10px] font-bold uppercase tracking-wider text-stone-500">Fecha</span>
            <input type="date" value={fecha}
              onChange={e => setFecha(e.target.value)}
              className="w-full rounded-xl border border-stone-300 bg-white px-3 py-2.5 text-[14px] font-bold text-stone-900 outline-none focus:border-[#1A4D2E]" />
          </label>

          <div>
            <span className="text-[10px] font-bold uppercase tracking-wider text-stone-500 block mb-2">
              Lotes cosechados
            </span>
            {cargandoPlan ? <Spinner /> : (
              <SelectorLotes plan={plan} seleccionados={form.lotes_seleccionados} onToggle={toggleLote} />
            )}
          </div>

          <div className="grid grid-cols-2 gap-3">
            {CAMPOS_NUM.map(c => (
              <NumInput key={c.key} label={c.label} value={form[c.key]}
                onChange={v => setForm(f => ({ ...f, [c.key]: v }))} />
            ))}
          </div>

          <TextInput label="Lote adicional (no estaba en el plan)" value={form.lotes_extra}
            onChange={v => setForm(f => ({ ...f, lotes_extra: v }))}
            placeholder="Ej. Lote 20-15 cosechado sin plan" />

          {errorGuardar && (
            <p className="text-[12px] text-red-600 bg-red-50 border border-red-100 rounded-xl px-3.5 py-2.5">
              {errorGuardar}
            </p>
          )}
          {guardadoOk && (
            <p className="text-[12px] text-emerald-700 bg-emerald-50 border border-emerald-200 rounded-xl px-3.5 py-2.5">
              Ejecución guardada.
            </p>
          )}

          <button onClick={handleGuardar} disabled={guardando}
            className="w-full rounded-2xl bg-[#1A4D2E] py-3.5 text-white font-black text-[14px] flex items-center justify-center gap-1.5 shadow-lg shadow-[#1A4D2E]/20 disabled:opacity-60">
            <Send className="h-4 w-4" /> {guardando ? "Guardando..." : ejecucionExistente ? "Actualizar" : "Guardar"}
          </button>
        </div>
      </div>
    </div>
  );
}
