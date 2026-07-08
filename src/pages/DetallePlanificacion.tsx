import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import {
  ChevronLeft, CheckCircle2, XCircle, Edit3, Send,
  Clock, AlertCircle
} from "lucide-react";
import { useAuth } from "../lib/auth";
import { getRegistroCompleto, aprobarRegistro, rechazarRegistro } from "../lib/api";
import { useTablaDensidad } from "../lib/useTablaDensidad";
import { EstadoBadge, Spinner } from "../components/ui";
import { ComparativoTDC } from "../components/ComparativoTDC";
import { interpolarTDC, fmt } from "../lib/calculations";
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
          <div className="grid grid-cols-3 gap-3 pb-3 border-b border-stone-100">
            <div>
              <span className="text-[9px] font-bold uppercase tracking-widest text-stone-400 block">Densidad</span>
              <span className="text-[20px] font-black text-[#1A4D2E] tabular-nums">
                {registro.densidad_calculada?.toFixed(0) ?? "—"}
              </span>
            </div>
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

        {/* Comparativo TDC global del registro */}
        <div className="space-y-3">
          <span className="text-[11px] font-black uppercase tracking-wide text-stone-500 block">
            Comparativo TDC · todo el registro
          </span>
          <ComparativoTDC titulo="Cosecha" filas={[
            { label: "Total corteros", real: totCorteroGlobal, plan: corterosPlanGlobal, decimales: 0 },
            { label: "TM/C",           real: totCorteroGlobal > 0 ? totTMGlobal / totCorteroGlobal : 0, plan: tmCPlanGlobal },
            { label: "HA/C",           real: totCorteroGlobal > 0 ? totHAGlobal / totCorteroGlobal : 0, plan: haCPlanGlobal },
          ]} />
          <ComparativoTDC titulo="Coyoleo" filas={[
            { label: "HA/Coyolero",   real: totCoyolerosGlobal > 0 ? totHACoyGlobal / totCoyolerosGlobal : 0, plan: haCyPlanGlobal },
            { label: "Sacos/Cy plan", real: null, plan: sacosCyPlanGlobal },
          ]} />
        </div>

        {/* Grupos de siembra */}
        {registro.grupos_siembra?.map(grupo => {
          const lotes = grupo.lotes_cosecha ?? [];
          const totHA   = lotes.reduce((a, l) => a + l.ha, 0);
          const totTM   = lotes.reduce((a, l) => a + l.tm, 0);
          const totRP   = lotes.reduce((a, l) => a + l.rp, 0);
          const totCort = lotes.reduce((a, l) => a + l.cort_emp + l.cort_cont, 0);
          const totEvac = lotes.reduce((a, l) => a + l.evac_emp + l.evac_cont, 0);
          const densProm = lotes.reduce((a, l) => a + l.densidad_palma, 0) / (lotes.length || 1);
          const pesoProm = lotes.reduce((a, l) => a + l.peso_fruta, 0) / (lotes.length || 1);
          const tdc = interpolarTDC(tabla, grupo.anio_siembra, densidadGlobal);
          const tmC = totCort > 0 ? totTM / totCort : 0;
          const haC = totCort > 0 ? totHA / totCort : 0;
          const cortPlan = tdc && totHA > 0 ? totHA / tdc.ha_j : 0;

          return (
            <div key={grupo.id} className="rounded-2xl border border-orange-200 bg-white overflow-hidden">
              <div className="px-4 py-2.5 bg-orange-50 flex items-center gap-2">
                <div className="h-2 w-2 rounded-full bg-[#E07B39]" />
                <span className="text-[12px] font-black text-[#E07B39] uppercase tracking-wide">
                  Siembra {grupo.anio_siembra}
                </span>
                <span className="text-[10px] text-stone-400">{lotes.length} lotes</span>
              </div>
              <div className="px-4 py-3 space-y-3">
                <div className="rounded-xl border border-stone-100 overflow-x-auto text-[11px]">
                  <div className="grid grid-cols-8 min-w-[560px] bg-stone-50 px-3 py-1.5 font-bold uppercase tracking-wider text-[9px] text-stone-400">
                    <span>Lote</span><span className="text-right">HA</span><span className="text-right">Dens</span>
                    <span className="text-right">Peso</span><span className="text-right">RP</span>
                    <span className="text-right">TM</span><span className="text-right">Cort</span><span className="text-right">Evac</span>
                  </div>
                  {lotes.map((l, i) => (
                    <div key={l.id} className={`grid grid-cols-8 min-w-[560px] px-3 py-2 font-medium text-stone-800 tabular-nums ${i % 2 ? "bg-stone-50/50" : ""}`}>
                      <span className="font-bold">{l.lote}</span>
                      <span className="text-right">{fmt(l.ha)}</span>
                      <span className="text-right">{fmt(l.densidad_palma, 0)}</span>
                      <span className="text-right">{fmt(l.peso_fruta)}</span>
                      <span className="text-right">{fmt(l.rp, 2)}</span>
                      <span className="text-right">{fmt(l.tm)}</span>
                      <span className="text-right">{l.cort_emp + l.cort_cont}</span>
                      <span className="text-right">{l.evac_emp + l.evac_cont}</span>
                    </div>
                  ))}
                  <div className="grid grid-cols-8 min-w-[560px] px-3 py-2 bg-orange-50 font-black text-[#E07B39] tabular-nums border-t border-orange-100 text-[11px]">
                    <span>SUB</span>
                    <span className="text-right">{fmt(totHA)}</span>
                    <span className="text-right">{fmt(densProm, 0)}</span>
                    <span className="text-right">{fmt(pesoProm)}</span>
                    <span className="text-right">{fmt(totRP, 2)}</span>
                    <span className="text-right">{fmt(totTM)}</span>
                    <span className="text-right">{totCort}</span>
                    <span className="text-right">{totEvac}</span>
                  </div>
                </div>

                {tdc ? (
                  <ComparativoTDC titulo={`vs Plan TDC · Dens ${fmt(densidadGlobal, 0)}`} filas={[
                    { label: "Total corteros", real: totCort, plan: cortPlan, decimales: 0 },
                    { label: "TM/C",           real: tmC,     plan: tdc.tm_c },
                    { label: "HA/C",           real: haC,     plan: tdc.ha_j },
                  ]} />
                ) : (
                  <p className="text-[11px] text-stone-400 text-center py-1">
                    Ingresa la Densidad Siembra en Datos generales para ver el plan TDC
                  </p>
                )}
              </div>
            </div>
          );
        })}

        {/* Grupos de coyoleo */}
        {registro.grupos_coyoleo?.map(grupoCoy => {
          const lotesCoy = grupoCoy.lotes_coyoleo ?? [];
          const totHACoy = lotesCoy.reduce((a, l) => a + l.ha, 0);
          const totCoyoleros = lotesCoy.reduce((a, l) => a + l.coy_emp + l.coy_cont, 0);
          const haCoyReal = totCoyoleros > 0 ? totHACoy / totCoyoleros : 0;

          const tdcCoy = interpolarTDC(tabla, grupoCoy.anio_siembra, densidadGlobal);

          return (
            <div key={grupoCoy.id} className="rounded-2xl border border-blue-100 bg-white overflow-hidden">
              <div className="px-4 py-2.5 bg-blue-50 flex items-center gap-2">
                <div className="h-2 w-2 rounded-full bg-[#2563A8]" />
                <span className="text-[12px] font-black text-[#2563A8] uppercase tracking-wide">
                  Coyoleo · Siembra {grupoCoy.anio_siembra}
                </span>
                <span className="text-[10px] text-stone-400">{lotesCoy.length} lotes</span>
              </div>
              <div className="px-4 py-3 space-y-3">
                <div className="rounded-xl border border-stone-100 overflow-hidden text-[11px]">
                  <div className="grid grid-cols-3 bg-stone-50 px-3 py-1.5 font-bold uppercase tracking-wider text-[9px] text-stone-400">
                    <span>Lote</span><span className="text-right">HA</span><span className="text-right">Coyoleros</span>
                  </div>
                  {lotesCoy.map((l, i) => (
                    <div key={l.id} className={`grid grid-cols-3 px-3 py-2 font-medium text-stone-800 tabular-nums ${i % 2 ? "bg-stone-50/50" : ""}`}>
                      <span className="font-bold">{l.lote}</span>
                      <span className="text-right">{fmt(l.ha)}</span>
                      <span className="text-right">{l.coy_emp + l.coy_cont}</span>
                    </div>
                  ))}
                  <div className="grid grid-cols-3 px-3 py-2 bg-blue-50 font-black text-[#2563A8] tabular-nums border-t border-blue-100 text-[11px]">
                    <span>SUB</span>
                    <span className="text-right">{fmt(totHACoy)}</span>
                    <span className="text-right">{totCoyoleros}</span>
                  </div>
                </div>
                {tdcCoy ? (
                  <ComparativoTDC titulo={`vs Plan TDC · Dens ${fmt(densidadGlobal, 0)}`} filas={[
                    { label: "HA/Coyolero",   real: haCoyReal, plan: tdcCoy.ha_j },
                    { label: "Sacos/Cy plan", real: null,      plan: tdcCoy.sacos_p },
                  ]} />
                ) : (
                  <p className="text-[11px] text-stone-400 text-center py-1">
                    Ingresa la Densidad Siembra en Datos generales para ver el plan TDC
                  </p>
                )}
              </div>
            </div>
          );
        })}
      </div>

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
