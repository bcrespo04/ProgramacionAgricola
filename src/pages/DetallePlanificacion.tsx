import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import {
  ChevronLeft, CheckCircle2, XCircle, Edit3, Send,
  Clock, AlertCircle, Trash2
} from "lucide-react";
import { useAuth } from "../lib/auth";
import { getRegistroCompleto, aprobarRegistro, rechazarRegistro, eliminarRegistro } from "../lib/api";
import { useTablaDensidad } from "../lib/useTablaDensidad";
import { EstadoBadge, Spinner } from "../components/ui";
import { ComparativoTDC } from "../components/ComparativoTDC";
import {
  TablaCosechaConsolidada, TablaCoyoleoConsolidada,
  type FilaLoteCosechaConsolidada, type FilaLoteCoyoleoConsolidada
} from "../components/TablasConsolidadas";
import { interpolarTDC, calcDensidadFs, calcSacosCyReal } from "../lib/calculations";
import type { RegistroPlanificacion } from "../types";

export default function DetallePlanificacion() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { usuario } = useAuth();
  const { tabla } = useTablaDensidad();

  const [registro, setRegistro] = useState<RegistroPlanificacion | null>(null);
  const [cargando, setCargando] = useState(true);
  const [comentario, setComentario] = useState("");
  const [modoRechazo, setModoRechazo] = useState(false);
  const [procesando, setProcesando] = useState(false);
  const [errorAccion, setErrorAccion] = useState<string | null>(null);
  const [modalEliminar, setModalEliminar] = useState(false);
  const [eliminando, setEliminando] = useState(false);
  const [errorEliminar, setErrorEliminar] = useState<string | null>(null);

  useEffect(() => {
    if (!id) return;
    getRegistroCompleto(id)
      .then(setRegistro)
      .finally(() => setCargando(false));
  }, [id]);

  if (cargando) return <div className="min-h-screen flex items-center justify-center bg-[#F7F5F0]"><Spinner /></div>;
  if (!registro) return <div className="min-h-screen flex items-center justify-center"><p className="text-stone-400">Registro no encontrado</p></div>;

  const esZona  = usuario?.rol === "zona_sur" || usuario?.rol === "zona_norte";
  const esCoord = usuario?.rol === "coordinador";
  const esAdmin = usuario?.rol === "admin";
  const puedeAprobar = esZona && registro.estado === "pendiente";
  const puedeEditar  = esCoord && registro.coordinador_id === usuario?.id && (registro.estado === "rechazado" || registro.estado === "borrador");

  // Comparativo TDC global del registro: suma real de todos los grupos vs plan
  // de cada grupo (todos con la misma Densidad Siembra del registro).
  const densidadGlobal = registro.densidad_siembra ?? 0;
  const gruposSiembra = registro.grupos_siembra ?? [];
  const totCorteroGlobal = gruposSiembra.reduce((a, g) => a + (g.lotes_cosecha ?? []).reduce((x, l) => x + l.cort_emp + l.cort_cont, 0), 0);
  const totHAGlobal      = gruposSiembra.reduce((a, g) => a + (g.lotes_cosecha ?? []).reduce((x, l) => x + l.ha, 0), 0);
  const totTMGlobal      = gruposSiembra.reduce((a, g) => a + (g.lotes_cosecha ?? []).reduce((x, l) => x + l.tm, 0), 0);

  let corterosPlanGlobal = 0, tmPlanPonderadoGlobal = 0;
  gruposSiembra.forEach(g => {
    const lotes = g.lotes_cosecha ?? [];
    const ha = lotes.reduce((a, l) => a + l.ha, 0);
    const tdcG = interpolarTDC(tabla, g.anio_siembra, densidadGlobal);
    if (tdcG && ha > 0) {
      const cp = ha / tdcG.ha_j;
      corterosPlanGlobal += cp;
      tmPlanPonderadoGlobal += tdcG.tm_c * cp;
    }
  });
  const haCPlanGlobal = corterosPlanGlobal > 0 ? totHAGlobal / corterosPlanGlobal : 0;
  const tmCPlanGlobal = corterosPlanGlobal > 0 ? tmPlanPonderadoGlobal / corterosPlanGlobal : 0;

  const gruposCoyoleo = registro.grupos_coyoleo ?? [];
  const totHACoyGlobal = gruposCoyoleo.reduce((a, g) => a + (g.lotes_coyoleo ?? []).reduce((x, l) => x + l.ha, 0), 0);
  const totCoyolerosGlobal = gruposCoyoleo.reduce((a, g) => a + (g.lotes_coyoleo ?? []).reduce((x, l) => x + l.coy_emp + l.coy_cont, 0), 0);

  let coyolerosPlanGlobal = 0, sacosPlanPonderadoGlobal = 0;
  gruposCoyoleo.forEach(g => {
    const ha = (g.lotes_coyoleo ?? []).reduce((a, l) => a + l.ha, 0);
    if (ha <= 0) return;
    const tdcG = interpolarTDC(tabla, g.anio_siembra, densidadGlobal);
    if (tdcG) {
      const cp = ha / tdcG.ha_j;
      coyolerosPlanGlobal += cp;
      sacosPlanPonderadoGlobal += tdcG.sacos_p * cp;
    }
  });
  const haCyPlanGlobal    = coyolerosPlanGlobal > 0 ? totHACoyGlobal / coyolerosPlanGlobal : 0;
  const sacosCyPlanGlobal = coyolerosPlanGlobal > 0 ? sacosPlanPonderadoGlobal / coyolerosPlanGlobal : 0;

  const densidadFs = calcDensidadFs(gruposCoyoleo.flatMap(g => g.lotes_coyoleo ?? []));
  const sacosCyReal = calcSacosCyReal(gruposCoyoleo.flatMap(g => g.lotes_coyoleo ?? []));

  // Tabla consolidada de Cosecha: todos los lotes de todos los grupos, ordenados de mayor a menor año
  const gruposSiembraOrdenados = [...gruposSiembra].sort((a, b) => b.anio_siembra - a.anio_siembra);
  const filasCosecha: FilaLoteCosechaConsolidada[] = gruposSiembraOrdenados.flatMap(g => (g.lotes_cosecha ?? []).map(l => ({
    grupoId: g.id,
    anioSiembra: g.anio_siembra,
    loteId: l.id,
    lote: l.lote,
    ha: l.ha,
    dens: l.densidad_palma,
    peso: l.peso_fruta,
    rp: l.rp,
    tm: l.tm,
    cort: l.cort_emp + l.cort_cont,
  })));

  // Tabla consolidada de Coyoleo: todos los lotes de todos los grupos, ordenados de mayor a menor año
  const gruposCoyoleoOrdenados = [...gruposCoyoleo].sort((a, b) => b.anio_siembra - a.anio_siembra);
  const filasCoyoleo: FilaLoteCoyoleoConsolidada[] = gruposCoyoleoOrdenados.flatMap(g => (g.lotes_coyoleo ?? []).map(l => ({
    grupoId: g.id,
    anioSiembra: g.anio_siembra,
    loteId: l.id,
    lote: l.lote,
    ha: l.ha,
    coyEmp: l.coy_emp,
    coyCont: l.coy_cont,
    tmFs: l.tm_fs,
  })));

  async function handleAprobar() {
    if (!usuario || !registro) return;
    setProcesando(true);
    setErrorAccion(null);
    try {
      await aprobarRegistro(registro.id, usuario.id);
      navigate("/");
    } catch (e: any) {
      console.error(e);
      const msg = e?.message || e?.error_description || e?.hint || JSON.stringify(e);
      setErrorAccion(msg || "No se pudo aprobar el registro. Intenta de nuevo.");
    } finally {
      setProcesando(false);
    }
  }

  async function handleRechazar() {
    if (!usuario || !registro || !comentario.trim()) return;
    setProcesando(true);
    setErrorAccion(null);
    try {
      await rechazarRegistro(registro.id, usuario.id, comentario);
      navigate("/");
    } catch (e: any) {
      console.error(e);
      const msg = e?.message || e?.error_description || e?.hint || JSON.stringify(e);
      setErrorAccion(msg || "No se pudo rechazar el registro. Intenta de nuevo.");
    } finally {
      setProcesando(false);
    }
  }

  async function handleEliminar() {
    if (!registro) return;
    setEliminando(true);
    setErrorEliminar(null);
    try {
      await eliminarRegistro(registro.id);
      navigate("/");
    } catch (e: any) {
      console.error(e);
      const msg = e?.message || e?.error_description || e?.hint || JSON.stringify(e);
      setErrorEliminar(msg || "No se pudo eliminar el registro. Intenta de nuevo.");
    } finally {
      setEliminando(false);
    }
  }

  const fechaFmt = new Date(registro.fecha + "T12:00:00").toLocaleDateString("es-NI", {
    weekday: "long", day: "2-digit", month: "long", year: "numeric"
  });

  return (
    <div className="min-h-screen bg-[#F7F5F0]">
      {/* Header */}
      <div className="bg-[#1A4D2E] px-5 pt-10 pb-5">
        <button onClick={() => navigate("/")} className="flex items-center gap-1.5 text-emerald-300 mb-3 -ml-1">
          <ChevronLeft className="h-5 w-5" />
          <span className="text-[12px] font-bold">Inicio</span>
        </button>
        <div className="flex items-start justify-between">
          <div>
            <h1 className="text-white text-xl font-black">Sector {registro.sector}</h1>
            <p className="text-emerald-400 text-[12px]">{fechaFmt}</p>
            {registro.coordinador && (
              <p className="text-emerald-300 text-[11px] mt-0.5">
                Coordinador: {registro.coordinador.nombre}
              </p>
            )}
          </div>
          <EstadoBadge estado={registro.estado} />
        </div>
      </div>

      <div className="px-4 py-4 space-y-4 pb-36">
        {/* Banners de estado */}
        {registro.estado === "rechazado" && (
          <div className="rounded-2xl bg-red-50 border border-red-200 px-4 py-3.5">
            <div className="flex items-center gap-2 mb-2">
              <XCircle className="h-4 w-4 text-red-500" />
              <span className="text-[12px] font-black text-red-700">Rechazado por zona</span>
            </div>
            <p className="text-[13px] text-red-600 leading-relaxed italic">"{registro.comentario_zona}"</p>
            {puedeEditar && (
              <button onClick={() => navigate(`/planificacion/${registro.id}/editar`)}
                className="mt-3 w-full rounded-xl bg-red-600 py-2.5 text-white font-bold text-[13px] flex items-center justify-center gap-1.5">
                <Edit3 className="h-3.5 w-3.5" /> Editar y reenviar
              </button>
            )}
          </div>
        )}

        {registro.estado === "aprobado" && (
          <div className="rounded-2xl bg-emerald-50 border border-emerald-200 px-4 py-3 flex items-center gap-3">
            <CheckCircle2 className="h-5 w-5 text-emerald-600 shrink-0" />
            <p className="text-[12px] font-black text-emerald-700">Planificación aprobada y registrada</p>
          </div>
        )}

        {registro.estado === "pendiente" && !esZona && (
          <div className="rounded-2xl bg-amber-50 border border-amber-200 px-4 py-3 flex items-center gap-3">
            <Clock className="h-5 w-5 text-amber-600 shrink-0" />
            <p className="text-[12px] font-black text-amber-700">Esperando revisión de la zona</p>
          </div>
        )}

        {/* Resumen global */}
        <div className="rounded-2xl bg-white border border-stone-200 px-4 py-3.5">
          <span className="text-[9px] font-bold uppercase tracking-widest text-stone-400 block mb-3">Resumen</span>
          <div className="grid grid-cols-2 divide-x divide-stone-100">
            <div className="space-y-3 pr-3">
              <div>
                <span className="text-[9px] font-bold uppercase tracking-widest text-stone-400 block">Densidad Rac</span>
                <span className="text-[20px] font-black text-[#1A4D2E] tabular-nums">
                  {registro.densidad_calculada?.toFixed(0) ?? "—"}
                </span>
              </div>
              <div>
                <span className="text-[9px] font-bold uppercase tracking-widest text-stone-400 block">Densidad Fs</span>
                <span className="text-[20px] font-black text-[#1A4D2E] tabular-nums">
                  {densidadFs > 0 ? densidadFs.toFixed(0) : "—"}
                </span>
              </div>
            </div>
            <div className="space-y-3 pl-3">
              <div>
                <span className="text-[9px] font-bold uppercase tracking-widest text-stone-400 block">Fiscal C.</span>
                <span className="text-[14px] font-black text-stone-800">{registro.fiscal_cosecha ?? "—"}</span>
              </div>
              <div>
                <span className="text-[9px] font-bold uppercase tracking-widest text-stone-400 block">Fiscal Coy.</span>
                <span className="text-[14px] font-black text-stone-800">{registro.fiscal_coyoleo ?? "—"}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Tabla consolidada de Cosecha */}
        <div>
          <span className="text-[11px] font-black uppercase tracking-wide text-[#E07B39] block mb-3">Cosecha</span>
          <TablaCosechaConsolidada filas={filasCosecha} />
        </div>

        {/* Tabla consolidada de Coyoleo */}
        <div>
          <span className="text-[11px] font-black uppercase tracking-wide text-[#2563A8] block mb-3">Coyoleo</span>
          <TablaCoyoleoConsolidada filas={filasCoyoleo} />
        </div>

        {/* Comparativo TDC global del registro */}
        <div className="space-y-3">
          <span className="text-[11px] font-black uppercase tracking-wide text-stone-500 block">
            Comparativo TDC · todo el registro
          </span>
          <ComparativoTDC titulo="Cosecha" filas={[
            { label: "Corteros", real: totCorteroGlobal, plan: corterosPlanGlobal, decimales: 0 },
            { label: "TM/C",     real: totCorteroGlobal > 0 ? totTMGlobal / totCorteroGlobal : 0, plan: tmCPlanGlobal },
            { label: "HA/C",     real: totCorteroGlobal > 0 ? totHAGlobal / totCorteroGlobal : 0, plan: haCPlanGlobal },
          ]} />
          <div className="border-t-4 border-double border-t-stone-400" />
          <ComparativoTDC titulo="Coyoleo" filas={[
            { label: "HA/CY",    real: totCoyolerosGlobal > 0 ? totHACoyGlobal / totCoyolerosGlobal : 0, plan: haCyPlanGlobal },
            { label: "Sacos/Cy", real: sacosCyReal, plan: sacosCyPlanGlobal },
          ]} />
        </div>

        {/* Zona de administración — separada de las acciones normales del flujo */}
        {esAdmin && (
          <div className="pt-4 mt-2 border-t border-stone-200 flex justify-center">
            <button onClick={() => setModalEliminar(true)}
              className="text-[12px] font-bold text-red-500 flex items-center gap-1.5 px-3 py-2">
              <Trash2 className="h-3.5 w-3.5" /> Eliminar registro
            </button>
          </div>
        )}
      </div>

      {/* Modal confirmación eliminar (solo admin) */}
      {modalEliminar && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center px-4">
          <div className="w-full max-w-sm rounded-2xl bg-white p-5 space-y-4">
            <div>
              <h2 className="text-[15px] font-black text-stone-900">Eliminar registro</h2>
              <p className="text-[12px] text-stone-500 mt-1">
                Sector {registro.sector} · {fechaFmt}
                {registro.coordinador && <> · Coordinador: {registro.coordinador.nombre}</>}
              </p>
            </div>
            <p className="text-[13px] text-red-600 bg-red-50 border border-red-100 rounded-xl px-3.5 py-3 leading-relaxed">
              Esta acción no se puede deshacer. Se eliminará el registro completo y todos sus lotes de cosecha y coyoleo.
            </p>
            {errorEliminar && (
              <p className="text-[12px] text-red-600 bg-red-50 border border-red-100 rounded-xl px-3.5 py-2.5">
                {errorEliminar}
              </p>
            )}
            <div className="flex gap-2">
              <button onClick={() => { setModalEliminar(false); setErrorEliminar(null); }} disabled={eliminando}
                className="flex-1 rounded-2xl border-2 border-stone-300 py-3 text-stone-600 font-bold text-[13px]">
                Cancelar
              </button>
              <button onClick={handleEliminar} disabled={eliminando}
                className="flex-1 rounded-2xl bg-red-600 py-3 text-white font-bold text-[13px] flex items-center justify-center gap-1.5 disabled:opacity-60">
                <Trash2 className="h-3.5 w-3.5" /> {eliminando ? "Eliminando..." : "Sí, eliminar"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Footer acciones zona */}
      {puedeAprobar && (
        <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-stone-200 px-4 py-4 space-y-3">
          {errorAccion && (
            <p className="text-[12px] text-red-600 bg-red-50 border border-red-100 rounded-xl px-3.5 py-2.5">
              {errorAccion}
            </p>
          )}
          {modoRechazo ? (
            <>
              <textarea value={comentario} onChange={e => setComentario(e.target.value)}
                placeholder="Escribe el motivo del rechazo..."
                rows={3}
                className="w-full rounded-xl border border-red-300 bg-red-50 px-3.5 py-2.5 text-[13px] text-stone-900 outline-none focus:border-red-500 resize-none" />
              <div className="flex gap-2">
                <button onClick={() => setModoRechazo(false)} disabled={procesando}
                  className="flex-1 rounded-2xl border-2 border-stone-300 py-3 text-stone-600 font-bold text-[13px]">
                  Cancelar
                </button>
                <button onClick={handleRechazar} disabled={!comentario.trim() || procesando}
                  className="flex-1 rounded-2xl bg-red-600 py-3 text-white font-bold text-[13px] flex items-center justify-center gap-1.5 disabled:opacity-40">
                  <Send className="h-3.5 w-3.5" /> {procesando ? "Enviando..." : "Enviar rechazo"}
                </button>
              </div>
            </>
          ) : (
            <div className="flex gap-3">
              <button onClick={() => setModoRechazo(true)} disabled={procesando}
                className="flex-1 rounded-2xl border-2 border-red-300 py-3.5 text-red-600 font-bold text-[14px] flex items-center justify-center gap-1.5">
                <XCircle className="h-4 w-4" /> Rechazar
              </button>
              <button onClick={handleAprobar} disabled={procesando}
                className="flex-1 rounded-2xl bg-emerald-700 py-3.5 text-white font-bold text-[14px] flex items-center justify-center gap-1.5 shadow-lg disabled:opacity-60">
                <CheckCircle2 className="h-4 w-4" /> {procesando ? "Procesando..." : "Aprobar"}
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
